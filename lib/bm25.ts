/* BM25 over doc blocks: tokenizer, index, shortlist. Pure — no corpus, no
   network, no config — so scripts/eval-ask.mjs can score it without a server
   and without spending a single model call. lib/ask.ts wires it to the corpus. */

export type Block = {
  block_id: string;
  source: "docs" | "cli";
  page_url: string;
  page_title: string;
  heading_path: string[];
  level: number;
  text: string;
};

/* ---------- tokenizer ---------- */
/* Query and corpus go through exactly the same pipeline, so every expansion
   below is symmetric — it can widen a match, never bias one toward the gold set. */

// Synonym gaps BM25 cannot bridge on its own. Hand-kept and deliberately short.
const ALIASES: Record<string, string> = {
  cost: "price",
  costs: "price",
  pricing: "price",
  billing: "price",
  auth: "authentication",
  installation: "install",
  installing: "install",
  setup: "install",
  configuration: "config",
  docs: "documentation",
  doc: "documentation",
  flag: "option",
  flags: "option",
  prospect: "persona",
  prospects: "persona",
  signup: "sign-up",
};

const TOKEN_RE = /[a-z0-9]+/g;
const HYPHEN_RUN_RE = /[a-z0-9]+(?:-[a-z0-9]+)+/g;
const RUN_RE = /[A-Za-z0-9]+/g;
const CAMEL_SPLIT_RE = /(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

/* Light suffix strip for plurals/gerunds/participles. Length-guarded so short
   words ("as", "does", "this") never collapse into each other. */
function stem(t: string): string {
  if (t.length > 5 && t.endsWith("ies")) return t.slice(0, -3) + "y"; // queries -> query
  if (t.length > 5 && t.endsWith("sses")) return t.slice(0, -2); // classes -> class
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3); // reporting -> report
  if (t.length > 5 && t.endsWith("ed")) return t.slice(0, -2); // recorded -> record
  if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1); // personas -> persona
  return t;
}

export function tokens(text: string): string[] {
  const low = text.toLowerCase();
  const out: string[] = low.match(TOKEN_RE) ?? [];
  const seen = new Set(out);
  // "re-run" also indexes as "rerun", so the unhyphenated query matches (and back)
  for (const m of low.match(HYPHEN_RUN_RE) ?? []) {
    const joined = m.replace(/-/g, "");
    if (joined && !seen.has(joined)) {
      seen.add(joined);
      out.push(joined);
    }
  }
  // "AGGREGATE.md"/"stopAfter" also index as their parts, so spaced queries hit identifiers
  for (const run of text.match(RUN_RE) ?? []) {
    if (!/[a-z]/.test(run) || !/[A-Z]/.test(run)) continue;
    for (const part of run.split(CAMEL_SPLIT_RE)) {
      const p = part.toLowerCase();
      if (p && !seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  }
  return out.map((t) => stem(ALIASES[t] ?? t));
}

/* ---------- BM25 ---------- */
/* BM25 knobs. `heading` weights heading_path tokens: a heading carries the
   page's intent ("Exit codes", "Reading the report"), so a definitional block
   outranks a long sibling that only mentions the words in passing. Exposed as
   parameters so scripts/tune-ask.mjs can sweep them against the gold set
   instead of them being three numbers someone once guessed. */
export type Bm25Params = { k1: number; b: number; heading: number };
export const BM25: Bm25Params = { k1: 1.5, b: 0.75, heading: 2 };
// Blocks sent to Jev. Choice caps at 255 labels; the state budget binds first.
export const SHORTLIST = 40;

type Doc = { block: Block; tf: Map<string, number>; len: number };

export type Index = { docs: Doc[]; df: Map<string, number>; avgdl: number; n: number; p: Bm25Params };

/* Tokenizing the whole corpus per query costs ~200ms and never changes between
   queries, so callers build the index once and keep it. */
export function buildIndex(BLOCKS: Block[], p: Bm25Params = BM25): Index {
  const docs: Doc[] = [];
  const df = new Map<string, number>();
  for (const block of BLOCKS) {
    const toks = tokens(block.text);
    const head = tokens(block.heading_path.join(" "));
    for (let i = 0; i < p.heading; i++) toks.push(...head);
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    docs.push({ block, tf, len: toks.length || 1 });
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avgdl = docs.length ? docs.reduce((a, d) => a + d.len, 0) / docs.length : 1;
  return { docs, df, avgdl: avgdl || 1, n: docs.length, p };
}

export function shortlist(index: Index, query: string, k = SHORTLIST): Block[] {
  const qterms = [...new Set(tokens(query))];
  if (!qterms.length) return index.docs.slice(0, k).map((d) => d.block);
  const { docs, df, avgdl, n, p } = index;
  const idf = new Map(qterms.map((t) => [t, Math.log(1 + (n - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))]));
  const scored = docs.map((d) => {
    let score = 0;
    const norm = p.k1 * (1 - p.b + (p.b * d.len) / avgdl);
    for (const t of qterms) {
      const freq = d.tf.get(t);
      if (freq) score += (idf.get(t) as number) * ((freq * (p.k1 + 1)) / (freq + norm));
    }
    return { block: d.block, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.block);
}
