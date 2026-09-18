import { createHash } from "node:crypto";
import { makeAsk } from "../../../lib/ask";
import { BLOCKS, BUILT_AT } from "../../../lib/corpus";
import { bump, get as kvGet, kvOn, set as kvSet, today } from "../../../lib/kv";

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

/* What the day may cost, whatever the caller does.

   Each ask sends the shortlisted docs to a paid model, so an unattended loop is
   a bill, not just traffic. The per-address count above cannot see across
   instances; this one can, and it is the ceiling that actually holds: once the
   day's asks are used up the route answers 503 until UTC midnight. Raise it
   with ASK_DAILY_MAX. Without a shared store there is nothing to count in, and
   the in-memory guard is all there is — which is the state to fix before this
   is pointed at the open internet. */
const DAILY_MAX = Number(process.env.ASK_DAILY_MAX ?? 2_000);
/** One address's share of that day. Generous for a reader, useless for a loop. */
const PER_IP_DAILY = Number(process.env.ASK_PER_IP_DAILY ?? 100);
const DAY_SECONDS = 86_400;

/* Identical questions cost nothing twice.

   Docs change on deploy, not per request, so the same question has the same
   answer until the corpus is rebuilt — BUILT_AT is in the key, so a rebuild
   invalidates every entry by itself. This is also what makes a loop cheap: the
   second identical ask never reaches the model. */
const cacheKey = (q: string) =>
  `ask:a:${createHash("sha256").update(`${BUILT_AT}\n${q.trim().toLowerCase().replace(/\s+/g, " ")}`).digest("hex").slice(0, 32)}`;

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

  // a repeat of a question already answered against this corpus never reaches the model
  const key = cacheKey(query);
  if (kvOn() && !exempt) {
    const hit = await kvGet(key);
    if (hit) {
      try {
        return Response.json({ ...(JSON.parse(hit) as object), alpha: true, cached: true });
      } catch {
        /* a corrupt entry is just a miss */
      }
    }
    /* One caller must not be able to eat the day on their own.
       The global ceiling bounds the bill; this bounds who spends it, so a
       single looping address cannot deny the budget to everyone else. */
    const mine = await bump(`ask:ip:${today()}:${createHash("sha256").update(fwd || "local").digest("hex").slice(0, 16)}`, DAY_SECONDS);
    if (mine !== null && mine > PER_IP_DAILY) {
      return Response.json(
        { error: "that is a lot of questions from one place today — try again tomorrow" },
        { status: 429, headers: { "retry-after": "3600" } },
      );
    }
    const used = await bump(`ask:day:${today()}`, DAY_SECONDS);
    if (used !== null && used > DAILY_MAX) {
      return Response.json(
        { error: "the docs have answered all they can today — try again tomorrow, or read the page directly" },
        { status: 503, headers: { "retry-after": "3600" } },
      );
    }
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30_000);
  try {
    const out = await ask(query, ctl.signal);
    if (kvOn() && !exempt) await kvSet(key, JSON.stringify(out), DAY_SECONDS);
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
  return Response.json({
    ok: true,
    configured: !!process.env.TYPESAFE_API_KEY,
    // says whether the day's ceiling is real here, or only the per-instance guard
    metered: kvOn(),
  });
}
