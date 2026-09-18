import { makeAsk } from "../../../lib/ask";
import { BLOCKS } from "../../../lib/corpus";

/* POST /api/ask — ask the docs a question, get back the paragraph that answers
   it, verbatim, or an honest "not in these docs".

   The TypeSafe key lives here and only here: the browser talks to this route
   same-origin, which is also why `connect-src 'self'` in proxy.ts still holds. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// bound to the corpus once per instance, not per request
const ask = makeAsk(BLOCKS);

const MIN = 3;
const MAX = 400;

/* 40 asks a minute per address, counted in this process's memory.

   Be clear about what that is worth. On a single long-lived server it is a real
   per-address limit. On serverless — where this now deploys — each instance
   keeps its own counter and instances recycle, so a determined caller spread
   across instances gets 40 per instance, not 40 in total. It blunts an
   accidental loop, which is what it is here for; it is not a spend cap and not
   a security boundary. Move the counter to a shared store (Vercel KV, Upstash,
   Redis) if this ever needs to hold a real budget. */
const WINDOW_MS = 60_000;
const PER_WINDOW = 40;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > PER_WINDOW;
}

export async function POST(req: Request) {
  // first entry of x-forwarded-for, matching the website's proxy handling
  const fwd = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  /* Local requests are exempt, so `npm run eval:ask -- --live` (107 questions
     back to back) is not throttled by a guard meant for the public internet.
     Local means no forwarded-for at all, or a loopback one — the dev server
     sets `::1` itself, which is why the header alone is not enough to tell.
     The NODE_ENV guard is the belt: in production every request is counted,
     whatever the headers claim. */
  const loopback = fwd === "::1" || fwd === "127.0.0.1" || fwd === "::ffff:127.0.0.1";
  const exempt = (!fwd || loopback) && process.env.NODE_ENV !== "production";
  if (!exempt && rateLimited(fwd || "local")) {
    return Response.json({ error: "too many questions, give it a minute" }, { status: 429 });
  }

  let query: unknown;
  try {
    query = (await req.json())?.query;
  } catch {
    return Response.json({ error: "expected JSON {query}" }, { status: 400 });
  }
  if (typeof query !== "string" || query.trim().length < MIN) {
    return Response.json({ error: `ask something longer than ${MIN} characters` }, { status: 422 });
  }
  if (query.length > MAX) return Response.json({ error: `keep it under ${MAX} characters` }, { status: 422 });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30_000);
  try {
    const out = await ask(query, ctl.signal);
    return Response.json({ ...out, alpha: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    if (msg === "TYPESAFE_API_KEY is not set") {
      console.error("/api/ask: TYPESAFE_API_KEY is not set");
      return Response.json({ error: "ask is not configured on this deploy" }, { status: 503 });
    }
    console.error(`/api/ask: ${msg}`);
    // msg is ours (never the upstream body), so it cannot carry request echo
    return Response.json({ error: "could not reach the model, try again" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  return Response.json({ ok: true, configured: !!process.env.TYPESAFE_API_KEY });
}
