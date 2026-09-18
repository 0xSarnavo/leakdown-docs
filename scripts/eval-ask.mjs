/* Does /api/ask actually answer, and does it shut up when it should?

   --local-only   BM25 recall + the no-LLM audit. Zero API calls, zero cost.
   --live         the whole gold set through the real model. One call per query.
   --show         print every query's outcome, not just the failures.

   Exits nonzero when a goal is missed, so it can gate a release. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOLD = JSON.parse(readFileSync(path.join(ROOT, "scripts", "ask-gold.json"), "utf8")).queries;
const argv = process.argv.slice(2);
const LIVE = argv.includes("--live");
const SHOW = argv.includes("--show");
const BASE = (process.env.ASK_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");

// Goals. A miss here fails the run.
const RECALL_MIN = 1.0; // every gold block must survive the BM25 shortlist
/* Gates, set just under what the tuned build measures (exact 97.2%, top-1 97.6%,
   abstention 95.7%) so ordinary model variance does not fail a good build, but a
   real regression does. Abstention is not 100%: one gold question ("how much
   does leakdown cost per run?") is a documentation gap, not a code fault — the
   docs never state a cost, so the model answers from adjacent pages. */
const EXACT_MIN = 0.94;
const TOP1_MIN = 0.94;
const ABSTAIN_MIN = 0.9;

const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + "%" : "n/a");
const fails = [];

/* ---------- audit: the "no LLM" claim ---------- */
/* The whole promise is that answers are copied, not written. That holds only
   while nothing here can generate text, so the eval refuses to pass if a
   generative client ever gets imported. */
const BANNED = /\b(openai|anthropic|@google\/generative-ai|langchain|llamaindex|cohere|mistralai|ollama|replicate|huggingface|transformers|sentence-transformers|pinecone|weaviate|chromadb|qdrant)\b/i;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public"]);

function audit() {
  const hitsFound = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(ts|tsx|mjs|js|json)$/.test(name)) continue;
      if (p.endsWith(path.join("scripts", "eval-ask.mjs"))) continue; // this list is not an import
      if (p.endsWith("package-lock.json")) continue;
      const text = readFileSync(p, "utf8");
      for (const line of text.split("\n")) {
        if (!/^\s*(import|export .* from|const .*=\s*require\()/.test(line)) continue;
        if (BANNED.test(line)) hitsFound.push(`${path.relative(ROOT, p)}: ${line.trim()}`);
      }
    }
  };
  walk(ROOT);
  const deps = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  for (const d of Object.keys({ ...deps.dependencies, ...deps.devDependencies })) {
    if (BANNED.test(d)) hitsFound.push(`package.json: dependency "${d}"`);
  }
  if (hitsFound.length) {
    console.log("\nno-LLM audit: FAIL");
    for (const h of hitsFound) console.log(`  ${h}`);
    fails.push("no-LLM audit found a generative dependency");
  } else {
    console.log("\nno-LLM audit: OK (no generative or embedding library imported or declared)");
  }
}

/* ---------- local: does BM25 even keep the right block? ---------- */
async function local() {
  // lib/bm25.ts is deliberately free of the corpus import, so node can strip
  // its types and run it straight: the recall number here is the same code the
  // route runs, not a reimplementation of it.
  const { shortlist, buildIndex, SHORTLIST } = await import(pathToFileURL(path.join(ROOT, "lib", "bm25.ts")).href);
  const blocks = JSON.parse(readFileSync(path.join(ROOT, "lib", "corpus.json"), "utf8")).blocks;
  const index = buildIndex(blocks);

  const answerable = GOLD.filter((g) => g.expect === "answered");
  let kept = 0;
  const t0 = performance.now();
  for (const g of answerable) {
    const ids = new Set(shortlist(index, g.q).map((b) => b.block_id));
    const ok = g.blocks.some((b) => ids.has(b));
    if (ok) kept++;
    else console.log(`  MISS  ${g.q}\n        wanted one of ${g.blocks.join(", ")}`);
    if (SHOW && ok) console.log(`  ok    ${g.q}`);
  }
  const ms = (performance.now() - t0) / answerable.length;
  console.log(`\nBM25 recall@${SHORTLIST}: ${kept}/${answerable.length} (${pct(kept, answerable.length)}), ${ms.toFixed(1)}ms/query`);
  if (kept / answerable.length < RECALL_MIN) fails.push(`recall ${pct(kept, answerable.length)} < ${pct(RECALL_MIN, 1)}`);
}

/* ---------- live: the verdict the reader actually sees ---------- */
/* Scores the same `exact` as scripts/tune-ask.mjs, through the real route, so
   the gate and the tuner can never disagree about what "better" means. */
async function live() {
  let exact = 0, verdictOk = 0, top1 = 0, abstained = 0;
  const answerable = GOLD.filter((g) => g.expect === "answered");
  const absent = GOLD.filter((g) => g.expect === "absent");
  const perTag = {};
  const misses = [];
  const rows = [];

  for (const g of GOLD) {
    const res = await fetch(`${BASE}/api/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: g.q }),
    });
    const r = await res.json();
    if (r.error) {
      console.log(`  ERROR ${g.q} -> ${r.error}`);
      fails.push(`request failed: ${g.q}`);
      continue;
    }
    rows.push(r);
    const tag = (perTag[g.tag ?? "untagged"] ??= { ok: 0, n: 0 });
    tag.n++;
    let ok;
    if (g.expect === "absent") {
      ok = r.verdict === "absent";
      if (ok) abstained++;
      if (ok) verdictOk++;
    } else {
      const notAbsent = r.verdict !== "absent";
      if (notAbsent) verdictOk++;
      ok = notAbsent && !!r.answer && g.blocks.includes(r.answer.block_id);
      if (ok) top1++;
    }
    if (ok) { exact++; tag.ok++; } else {
      misses.push(`  [${g.tag ?? "-"}] ${g.q}\n      got ${r.verdict} ${r.answer?.block_id ?? "(abstained)"}` +
        (g.expect === "answered" ? `  want one of ${g.blocks.join(", ")}` : ""));
    }
    if (SHOW) console.log(`  ${ok ? "ok  " : "MISS"} ${r.verdict.padEnd(8)} ${g.q}`);
  }

  console.log(`\nexact            : ${exact}/${GOLD.length} (${pct(exact, GOLD.length)})   <- the number that matters`);
  console.log(`verdict accuracy : ${verdictOk}/${GOLD.length} (${pct(verdictOk, GOLD.length)})`);
  console.log(`top-1 block      : ${top1}/${answerable.length} (${pct(top1, answerable.length)})`);
  console.log(`abstention       : ${abstained}/${absent.length} (${pct(abstained, absent.length)})`);
  const ex = (kind) => rows.length ? GOLD.map((g, i) => [g, rows[i]]).filter(([g]) => g.expect === kind).map(([, r]) => r?.exists).filter((v) => v != null).sort((a, b) => a - b) : [];
  const a = ex("answered"), b = ex("absent");
  if (a.length && b.length) console.log(`exists spread    : real questions ${a[0]}..${a[a.length - 1]} | unanswerable ${b[0]}..${b[b.length - 1]}`);
  const tin = rows.reduce((s, r) => s + (r.usage?.input_tokens ?? 0), 0);
  console.log(`tokens           : ${tin.toLocaleString()} in over ${rows.length} calls`);

  console.log("\nby category:");
  for (const [t, v] of Object.entries(perTag).sort()) console.log(`  ${t.padEnd(16)} ${String(v.ok).padStart(3)}/${String(v.n).padEnd(3)} ${pct(v.ok, v.n)}`);
  if (misses.length) {
    console.log(`\nwrong (${misses.length}):`);
    for (const m of misses) console.log(m);
  }

  if (exact / GOLD.length < EXACT_MIN) fails.push(`exact ${pct(exact, GOLD.length)} < ${(EXACT_MIN * 100).toFixed(0)}%`);
  if (top1 / answerable.length < TOP1_MIN) fails.push(`top-1 ${pct(top1, answerable.length)} < ${(TOP1_MIN * 100).toFixed(0)}%`);
  if (abstained / absent.length < ABSTAIN_MIN) fails.push(`abstention ${pct(abstained, absent.length)} < ${(ABSTAIN_MIN * 100).toFixed(0)}%`);
}

console.log(`gold set: ${GOLD.length} queries (${GOLD.filter((g) => g.expect === "answered").length} answerable, ${GOLD.filter((g) => g.expect === "absent").length} unanswerable)`);
audit();
if (LIVE) {
  console.log(`\nlive against ${BASE} — ${GOLD.length} model calls`);
  await live();
} else {
  await local();
  console.log("\n(local only: no model calls. add --live for verdict accuracy)");
}

if (fails.length) {
  console.log("\nFAIL");
  for (const f of fails) console.log(`  ${f}`);
  process.exit(1);
}
console.log("\nPASS");
