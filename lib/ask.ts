/* The search behind /api/ask.

   BM25 over lib/corpus.json picks a shortlist; ONE call to TypeSafe's Jev
   (a System One model) ranks the shortlist and judges whether the docs answer
   the question at all. Jev never writes prose: it returns probabilities, and
   every word we show the reader is a byte-for-byte copy of a corpus block.

   No LLM, no embeddings, no vector store — scripts/eval-ask.mjs fails the
   build if that stops being true. */

import corpus from "./corpus.json";
import { type Block, buildIndex, shortlist } from "./bm25";

export type { Block };
export { SHORTLIST } from "./bm25";

const BLOCKS = corpus.blocks as Block[];
const INDEX = buildIndex(BLOCKS);

/* ---------- verdicts ---------- */
/* Tuned on the gold set by scripts/eval-ask.mjs --live; retune after a rebuild.
   The two populations separate hard: across 28 answerable questions `exists`
   never fell below 0.92, and across 8 unanswerable ones it never rose above
   0.32. ABSENT sits high in that gap rather than just above the unanswerable
   max, because one borderline question ("how do I invoice a client for a run?"
   — the docs cover requesting a run, not billing) scored 0.32 on one pass and
   0.43 on another. Placed at 0.55 it abstains on both passes and still leaves
   0.37 of headroom under the worst real question. When this is wrong we would
   rather say nothing than answer from an adjacent page. */
export const FOUND = 0.7; // `fully` at or above this: one block states the answer
export const ABSENT = 0.55; // `exists` below this: the docs do not cover it

export const VERDICT = {
  answered: "answered in the docs",
  partial: "partly covered",
  absent: "not in these docs",
} as const;
export type Verdict = keyof typeof VERDICT;

export function verdictFor(exists: number, fully: number): Verdict {
  if (fully >= FOUND) return "answered";
  if (exists < ABSENT) return "absent";
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

function questionsFor(query: string, candidates: Block[]) {
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

// A supporting block has to clear this to be worth the reader's scroll.
const SUPPORT_MIN = 0.02;
const SUPPORT_MAX = 4;

/* `router` is a second, independent judgment — which PAGE covers the question —
   and it disagrees with `where` in a telling way: a page's opening block scores
   well on every question about that page, so a broad preamble can outrank the
   section that actually answers. When the router is confident and names a
   different page, and that page holds a block scoring at least ROUTER_MARGIN of
   the leader, the block on the named page leads instead. The demoted block is
   not dropped — it becomes the first supporting block. */
const ROUTER_MIN_CONF = 0.5;
const ROUTER_MARGIN = 0.5;

function routed(ranked: Hit[], router: { choice: string; confidence: number } | null): Hit[] {
  const top = ranked[0];
  if (!router || !top || router.confidence < ROUTER_MIN_CONF || top.page_title === router.choice) return ranked;
  const onPage = ranked.find((h) => h.page_title === router.choice);
  if (!onPage || onPage.prob < top.prob * ROUTER_MARGIN) return ranked;
  return [onPage, ...ranked.filter((h) => h !== onPage)];
}

export async function ask(query: string, signal?: AbortSignal): Promise<Answer> {
  const q = query.trim();
  if (!q) throw new Error("query must be non-empty");
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error("TYPESAFE_API_KEY is not set");

  const candidates = shortlist(INDEX, q);
  const res = await fetch(`${API}/v1/systemone`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ model: MODEL, state: stateFor(q, candidates), questions: questionsFor(q, candidates) }),
    signal,
  });
  if (!res.ok) {
    // never echo the body: it can quote the request, and the request carried the key
    throw new Error(`typesafe ${res.status}`);
  }
  const data = (await res.json()) as SystemOne;

  const where = data.answers.where as ChoiceAnswer;
  const exists = (data.answers.exists as NoulAnswer).noul;
  const fully = (data.answers.fully as NoulAnswer).noul;
  const router = data.answers.router as ChoiceAnswer | undefined;

  const byId = new Map(candidates.map((b) => [b.block_id, b]));
  const ranked: Hit[] = Object.entries(where.probabilities ?? {})
    .sort((a, b) => b[1] - a[1])
    .flatMap(([id, prob]) => {
      const b = byId.get(id);
      return b
        ? [{ block_id: id, prob, text: b.text, heading_path: b.heading_path, page_url: b.page_url, page_title: b.page_title, source: b.source }]
        : [];
    });

  const routerOut = router ? { choice: router.choice, confidence: router.confidence } : null;
  const ordered = routed(ranked, routerOut);
  const verdict = verdictFor(exists, fully);
  // An abstention shows nothing: a "closest block" under a red badge still reads
  // as an answer, and that is the one thing this is built not to do.
  const answer = verdict === "absent" ? null : (ordered[0] ?? null);
  const supporting = verdict === "absent" ? [] : ordered.slice(1).filter((h) => h.prob >= SUPPORT_MIN).slice(0, SUPPORT_MAX);

  return {
    verdict,
    label: VERDICT[verdict],
    exists,
    fully,
    answer,
    supporting,
    router: routerOut,
    usage: { model: data.model, input_tokens: data.usage?.input_tokens, output_tokens: data.usage?.output_tokens },
  };
}
