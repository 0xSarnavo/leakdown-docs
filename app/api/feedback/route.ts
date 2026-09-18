/* POST /api/feedback — was that the paragraph you wanted?

   This does not train anything. Jev has no training endpoint and nothing here
   learns from a vote. What the votes are for is the gold set: every question in
   scripts/ask-gold.json was written by us, in our phrasing, guessing at what
   someone would ask. A real question that got the wrong paragraph is worth more
   than ten we invented, and a "not in the docs" vote usually means exactly that
   — a page that needs writing, not a threshold that needs moving.

   Storage is one function, on purpose. Right now a vote is a structured log
   line, which survives only as long as the platform keeps logs — fine for
   watching a day's traffic, not for collecting a month of it. Point `record`
   at a real store (Vercel KV, Upstash, a webhook) when it needs to last. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUERY = 400;
const REASONS = new Set(["wrong-paragraph", "not-in-docs", "too-thin", ""]);

/* Same shape of guard as /api/ask: a spend and noise limit, not a security
   boundary, and per instance on serverless. See the comment there. */
const WINDOW_MS = 60_000;
const PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > PER_WINDOW;
}

export type Vote = {
  query: string;
  helpful: boolean;
  reason: string;
  block_id: string | null;
  verdict: string;
  exists: number | null;
  fully: number | null;
};

/* The seam. One line per vote, greppable and pasteable straight into a gold
   entry. No address, no identifier, no session: the question and what it got
   back are the whole of what is useful, and the whole of what is kept. */
function record(v: Vote) {
  console.log(`ask-feedback ${JSON.stringify({ ...v, at: new Date().toISOString() })}`);
}

export async function POST(req: Request) {
  const fwd = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (rateLimited(fwd || "local")) return Response.json({ error: "too many" }, { status: 429 });

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "expected JSON" }, { status: 400 });
  }

  const query = typeof b.query === "string" ? b.query.slice(0, MAX_QUERY) : "";
  const reason = typeof b.reason === "string" ? b.reason : "";
  if (!query || typeof b.helpful !== "boolean" || !REASONS.has(reason)) {
    return Response.json({ error: "expected {query, helpful, reason?}" }, { status: 422 });
  }

  record({
    query,
    helpful: b.helpful,
    reason,
    block_id: typeof b.block_id === "string" ? b.block_id : null,
    verdict: typeof b.verdict === "string" ? b.verdict : "",
    exists: typeof b.exists === "number" ? b.exists : null,
    fully: typeof b.fully === "number" ? b.fully : null,
  });
  return Response.json({ ok: true });
}
