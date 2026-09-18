/**
 * The smallest shared counter that survives serverless.
 *
 * Per-instance memory is not a limit when the platform runs many instances and
 * recycles them: a caller in a loop gets the per-instance allowance from each
 * one it lands on. Anything that has to bound real money — asks against a paid
 * model — needs a count every instance can see. This is that, over the Upstash
 * REST API: no SDK, one fetch.
 *
 * Every call fails open and returns null. A counter that is down must not take
 * the docs down with it; the caller keeps its in-memory guard for that case.
 */
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvOn = (): boolean => Boolean(URL_ && TOKEN);

async function pipeline(commands: (string | number)[][]): Promise<unknown[] | null> {
  if (!kvOn()) return null;
  try {
    const r = await fetch(`${URL_}/pipeline`, {
      method: "POST",
      cache: "no-store",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(2_000), // a slow counter must not slow the answer
    });
    if (!r.ok) return null;
    const out = (await r.json()) as { result?: unknown }[];
    return out.map((e) => e.result);
  } catch {
    return null;
  }
}

/**
 * Add one to `key` and return the new total, setting the window on first use.
 * Null when the store is unreachable — the caller decides what that means.
 */
export async function bump(key: string, ttlSeconds: number): Promise<number | null> {
  const res = await pipeline([
    ["INCR", key],
    ["EXPIRE", key, ttlSeconds, "NX"],
  ]);
  const n = res?.[0];
  return typeof n === "number" ? n : null;
}

export async function get(key: string): Promise<string | null> {
  const res = await pipeline([["GET", key]]);
  const v = res?.[0];
  return typeof v === "string" ? v : null;
}

export async function set(key: string, value: string, ttlSeconds: number): Promise<void> {
  await pipeline([["SET", key, value, "EX", ttlSeconds]]);
}

/** Today in UTC, the window every daily cap counts against. */
export const today = (): string => new Date().toISOString().slice(0, 10);
