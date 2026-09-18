/* The search behind /api/ask.

   BM25 over lib/corpus.json picks a shortlist; ONE call to TypeSafe's Jev
   (a System One model) ranks the shortlist and judges whether the docs answer
   the question at all. Jev never writes prose: it returns probabilities, and
   every word we show the reader is a byte-for-byte copy of a corpus block.

   No LLM, no embeddings, no vector store — scripts/eval-ask.mjs fails the
   build if that stops being true. */

import { type Block, type Index, buildIndex, shortlist } from "./bm25";

export type { Block };
export { SHORTLIST } from "./bm25";

/* ---------- verdicts ---------- */
/* Tuned by scripts/tune-ask.mjs against the 107-query gold set. The numbers are
   plateau centres, not the sweep's argmax: the argmax sat on the edge of its
   plateau, where a small shift in model behaviour would fall off it.

   What the gold set showed, over 84 answerable and 23 unanswerable questions:
   `exists` on a real question never fell below 0.89, and only ONE unanswerable
   question rose above it — "how much does leakdown cost per run?" at 0.96, where
   the model reads the docs' talk of cheap models and usage limits as pricing.
   The next unanswerable down sits at 0.67, so anything in (0.67, 0.89) abstains
   on 22 of 23. ABSENT is the middle of that window, which measured as a flat
   plateau from 0.70 to 0.85.

   Raising it from 0.55 to 0.78 took abstention from 87% to 96% and cost nothing
   on real questions. When this is wrong we would rather say nothing than answer
   from an adjacent page. */

export type Tuning = {
  FOUND: number; // `fully` at or above this: one block states the answer
  ABSENT: number; // `exists` below this: the docs do not cover it
  ROUTER_MIN_CONF: number;
  ROUTER_MARGIN: number;
  SUPPORT_MIN: number;
  SUPPORT_MAX: number;
};

export const DEFAULTS: Tuning = {
  FOUND: 0.7,
  ABSENT: 0.78,
  ROUTER_MIN_CONF: 0.75,
  ROUTER_MARGIN: 0.5,
  SUPPORT_MIN: 0.02,
  SUPPORT_MAX: 4,
};

export const VERDICT = {
  answered: "answered in the docs",
  partial: "partly covered",
  absent: "not in these docs",
} as const;
export type Verdict = keyof typeof VERDICT;

export function verdictFor(exists: number, fully: number, t: Tuning = DEFAULTS): Verdict {
  if (fully >= t.FOUND) return "answered";
  if (exists < t.ABSENT) return "absent";
  return "partial";
}

/* ---------- the one Jev call ---------- */

// One request's state, in characters. The API counts tokens, not characters, and
// code-dense text runs hotter per character, so this sits well under the ceiling.
const STATE_CHAR_BUDGET = 90_000;

const API = (process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai").replace(/\/$/, "");
const MODEL = process.env.TYPESAFE_MODEL || "jev-latest";

type ChoiceAnswer = { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> };
type NoulAnswer = { type: "noul"; noul: number };
type SystemOne = {
  model: string;
  usage: { input_tokens?: number; output_tokens?: number };
  answers: Record<string, ChoiceAnswer | NoulAnswer>;
};

/* The blocks as the model sees them. Over budget, the longest tails are trimmed
   first: a block's head carries its point, its tail is usually a long example. */
function stateFor(query: string, candidates: Block[]) {
  const blocks = candidates.map((b) => ({ id: b.block_id, heading_path: b.heading_path, text: b.text }));
  let over = blocks.reduce((a, b) => a + b.text.length, 0) - STATE_CHAR_BUDGET;
  if (over > 0) {
    for (const i of blocks.map((_, i) => i).sort((a, b) => blocks[b].text.length - blocks[a].text.length)) {
      if (over <= 0) break;
      const cut = Math.min(blocks[i].text.length - 500, over);
      if (cut <= 0) continue;
      blocks[i] = { ...blocks[i], text: blocks[i].text.slice(0, blocks[i].text.length - cut) + "…[truncated]" };
      over -= cut;
    }
  }
  return { query, blocks };
}

export type QuestionsFor = (query: string, candidates: Block[]) => Record<string, unknown>;

export function questionsFor(query: string, candidates: Block[]) {
  const criteria: Record<string, null> = {};
  for (const b of candidates) criteria[b.block_id] = null;
  const pages: Record<string, null> = {};
  for (const b of candidates) pages[b.page_title] = null;
  return {
    where: { type: "choice", instructions: `Which block answers: "${query}"?`, criteria },
    exists: {
      type: "noul",
      instructions: `Does any supplied block address or answer: "${query}"?`,
      criteria: { true: "At least one block states or directly implies the answer", false: "No block addresses this" },
    },
    fully: {
      type: "noul",
      // The bar is "one block states it", not "nothing material is missing":
      // the stricter wording read plainly-answered questions as partial.
      instructions: `Does a single supplied block directly state the answer to: "${query}"?`,
      criteria: {
        true: "One block states the answer outright, even if background detail lives in other blocks",
        false: "No single block states the answer; blocks only touch the topic, or the answer is scattered across blocks",
      },
    },
    router: { type: "choice", instructions: `Which documentation page best covers: "${query}"?`, criteria: pages },
  };
}

export type Hit = {
  block_id: string;
  prob: number;
  text: string; // verbatim, always
  heading_path: string[];
  page_url: string;
  page_title: string;
  source: "docs" | "cli";
};

/* Exactly what the model said, before any of our judgement is applied. The
   tuner saves one of these per gold query so a parameter sweep costs nothing:
   changing a threshold changes `decide`, never the request. */
export type Raw = {
  exists: number;
  fully: number;
  where: Record<string, number>;
  router: { choice: string; confidence: number } | null;
  usage: { model: string; input_tokens?: number; output_tokens?: number };
};

export type Answer = {
  verdict: Verdict;
  label: string;
  exists: number;
  fully: number;
  answer: Hit | null;
  supporting: Hit[];
  router: { choice: string; confidence: number } | null;
  usage: { model: string; input_tokens?: number; output_tokens?: number };
};


/* `router` is a second, independent judgment — which PAGE covers the question —
   and it disagrees with `where` in a telling way: a page's opening block scores
   well on every question about that page, so a broad preamble can outrank the
   section that actually answers. When the router is confident and names a
   different page, and that page holds a block scoring at least ROUTER_MARGIN of
   the leader, the block on the named page leads instead. The demoted block is
   not dropped — it becomes the first supporting block. */
function routed(ranked: Hit[], router: { choice: string; confidence: number } | null, t: Tuning): Hit[] {
  const top = ranked[0];
  if (!router || !top || router.confidence < t.ROUTER_MIN_CONF || top.page_title === router.choice) return ranked;
  const onPage = ranked.find((h) => h.page_title === router.choice);
  if (!onPage || onPage.prob < top.prob * t.ROUTER_MARGIN) return ranked;
  return [onPage, ...ranked.filter((h) => h !== onPage)];
}

/* Everything we decide, given what the model said. Pure: same input, same
   answer, no clock and no network — which is what makes the sweep in
   scripts/tune-ask.mjs trustworthy. */
export function decide(raw: Raw, candidates: Block[], t: Tuning = DEFAULTS): Answer {
  const byId = new Map(candidates.map((b) => [b.block_id, b]));
  const ranked: Hit[] = Object.entries(raw.where ?? {})
    .sort((a, b) => b[1] - a[1])
    .flatMap(([id, prob]) => {
      const b = byId.get(id);
      return b
        ? [{ block_id: id, prob, text: b.text, heading_path: b.heading_path, page_url: b.page_url, page_title: b.page_title, source: b.source }]
        : [];
    });

  const ordered = routed(ranked, raw.router, t);
  const verdict = verdictFor(raw.exists, raw.fully, t);
  // An abstention shows nothing: a "closest block" under a red badge still reads
  // as an answer, and that is the one thing this is built not to do.
  const answer = verdict === "absent" ? null : (ordered[0] ?? null);
  const supporting = verdict === "absent" ? [] : ordered.slice(1).filter((h) => h.prob >= t.SUPPORT_MIN).slice(0, t.SUPPORT_MAX);

  return {
    verdict,
    label: VERDICT[verdict],
    exists: raw.exists,
    fully: raw.fully,
    answer,
    supporting,
    router: raw.router,
    usage: raw.usage,
  };
}

/* The one call. Returns the shortlist it sent alongside the raw answer, so a
   caller can re-`decide` later without asking the model again. */
export async function askRaw(
  query: string,
  index: Index,
  signal?: AbortSignal,
  /* swappable so scripts/ can A/B the wording of the questions themselves —
     the one part of this that a threshold sweep cannot reach */
  buildQuestions: QuestionsFor = questionsFor,
): Promise<{ raw: Raw; candidates: Block[] }> {
  const q = query.trim();
  if (!q) throw new Error("query must be non-empty");
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error("TYPESAFE_API_KEY is not set");

  const candidates = shortlist(index, q);
  const res = await fetch(`${API}/v1/systemone`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ model: MODEL, state: stateFor(q, candidates), questions: buildQuestions(q, candidates) }),
    signal,
  });
  // never echo the body: it can quote the request, and the request carried the key
  if (!res.ok) throw new Error(`typesafe ${res.status}`);
  const data = (await res.json()) as SystemOne;

  const where = data.answers.where as ChoiceAnswer;
  const router = data.answers.router as ChoiceAnswer | undefined;
  return {
    candidates,
    raw: {
      exists: (data.answers.exists as NoulAnswer).noul,
      fully: (data.answers.fully as NoulAnswer).noul,
      where: where.probabilities ?? {},
      router: router ? { choice: router.choice, confidence: router.confidence } : null,
      usage: { model: data.model, input_tokens: data.usage?.input_tokens, output_tokens: data.usage?.output_tokens },
    },
  };
}

/* Bind the corpus once. The index costs ~60ms to build and never changes, so the
   route builds it at module load and reuses it for every request. */
export function makeAsk(blocks: Block[], t: Tuning = DEFAULTS) {
  const index = buildIndex(blocks);
  return async function ask(query: string, signal?: AbortSignal): Promise<Answer> {
    const { raw, candidates } = await askRaw(query, index, signal);
    return decide(raw, candidates, t);
  };
}
