import { ask } from "../../../lib/ask";

/* POST /api/ask — ask the docs a question, get back the paragraph that answers
   it, verbatim, or an honest "not in these docs".

   The TypeSafe key lives here and only here: the browser talks to this route
   same-origin, which is also why `connect-src 'self'` in proxy.ts still holds. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN = 3;
const MAX = 400;

/* 40 asks a minute per address. The key is ours and every ask costs tokens;
   this is a spend guard, not a security boundary. */
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
  // No forwarded-for means the request never crossed the edge proxy, i.e. it is
  // local: dev and scripts/eval-ask.mjs --live would otherwise trip the limit.
  // Guarded by NODE_ENV as well, so production limits every request either way.
  const exempt = !fwd && process.env.NODE_ENV !== "production";
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
