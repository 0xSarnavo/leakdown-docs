/* Tune the numbers in lib/ask.ts against scripts/ask-gold.json.

     node --experimental-strip-types scripts/tune-ask.mjs --collect
         One model call per gold query, saved to scripts/ask-dump.json.
         This is the only step that costs anything.

     node --experimental-strip-types scripts/tune-ask.mjs --sweep
         Replays the saved answers through the REAL decide() from lib/ask.ts
         with thousands of parameter combinations. Free, and exact: decide()
         is pure, so a replay is what the route would have done.

   What it optimises: `exact` — an unanswerable query is right only if it
   abstained, an answerable one only if it did not abstain AND led with a block
   the gold set accepts. One number, no partial credit, nothing to game. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOLD = path.join(ROOT, "scripts", "ask-gold.json");
const DUMP = path.join(ROOT, "scripts", "ask-dump.json");
const argv = process.argv.slice(2);

const { askRaw, decide, DEFAULTS } = await import(pathToFileURL(path.join(ROOT, "lib", "ask.ts")).href);
const { buildIndex } = await import(pathToFileURL(path.join(ROOT, "lib", "bm25.ts")).href);
const BLOCKS = JSON.parse(readFileSync(path.join(ROOT, "lib", "corpus.json"), "utf8")).blocks;
const BY_ID = new Map(BLOCKS.map((b) => [b.block_id, b]));
const queries = JSON.parse(readFileSync(GOLD, "utf8")).queries;

if (argv.includes("--collect")) {
  const index = buildIndex(BLOCKS);
  const out = [];
  let tin = 0;
  for (const [i, g] of queries.entries()) {
    process.stdout.write(`\r  ${i + 1}/${queries.length}  ${g.q.slice(0, 46).padEnd(46)}`);
    try {
      const { raw, candidates } = await askRaw(g.q, index);
      tin += raw.usage.input_tokens ?? 0;
      out.push({ ...g, raw, candidateIds: candidates.map((b) => b.block_id) });
    } catch (e) {
      console.error(`\n  FAILED ${g.q}: ${e.message}`);
    }
  }
  writeFileSync(DUMP, JSON.stringify(out, null, 1) + "\n");
  console.log(`\n\ncollected ${out.length}/${queries.length} -> scripts/ask-dump.json (${tin.toLocaleString()} input tokens)`);
  process.exit(0);
}

if (!existsSync(DUMP)) {
  console.error("no scripts/ask-dump.json — run with --collect first (costs one model call per gold query)");
  process.exit(1);
}
/* The dump holds only what the MODEL said. Expectations are re-read from the
   gold file on every run and joined by query text, so correcting a gold entry
   never needs a re-collect — and a stale copy inside the dump can never quietly
   score the wrong thing. */
const raws = JSON.parse(readFileSync(DUMP, "utf8"));
const byQ = new Map(queries.map((g) => [g.q, g]));
const dump = raws.flatMap((r) => {
  const g = byQ.get(r.q);
  if (!g) return [];
  return [{ ...g, raw: r.raw, candidateIds: r.candidateIds }];
});
if (dump.length !== queries.length) {
  console.error(`dump covers ${dump.length}/${queries.length} gold queries — re-run --collect after adding queries`);
}

function score(t) {
  let exact = 0, abstained = 0, absentTotal = 0, top1 = 0, answerableTotal = 0, confident = 0;
  const perTag = {};
  const misses = [];
  for (const d of dump) {
    const candidates = d.candidateIds.map((id) => BY_ID.get(id)).filter(Boolean);
    const a = decide(d.raw, candidates, t);
    const tag = (perTag[d.tag] ??= { ok: 0, n: 0 });
    tag.n++;
    let ok;
    if (d.expect === "absent") {
      absentTotal++;
      ok = a.verdict === "absent";
      if (ok) abstained++;
    } else {
      answerableTotal++;
      const led = a.verdict !== "absent" && a.answer && d.blocks.includes(a.answer.block_id);
      ok = !!led;
      if (led) top1++;
      if (a.verdict === "answered") confident++;
    }
    if (ok) { exact++; tag.ok++; } else misses.push({ q: d.q, tag: d.tag, expect: d.expect, got: a.verdict, block: a.answer?.block_id ?? null, want: d.blocks });
  }
  return { exact, n: dump.length, abstained, absentTotal, top1, answerableTotal, confident, perTag, misses };
}

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "n/a");
const show = (label, t, s) => console.log(
  `${label.padEnd(30)} exact ${String(s.exact).padStart(3)}/${s.n} (${pct(s.exact, s.n).padStart(6)})  ` +
  `top1 ${pct(s.top1, s.answerableTotal).padStart(6)}  abstain ${pct(s.abstained, s.absentTotal).padStart(6)}`,
);

const base = score(DEFAULTS);
console.log(`gold: ${dump.length} queries (${base.answerableTotal} answerable, ${base.absentTotal} unanswerable)\n`);
show("shipped defaults", DEFAULTS, base);

if (argv.includes("--sweep")) {
  const grid = [];
  const range = (a, b, step) => { const o = []; for (let v = a; v <= b + 1e-9; v += step) o.push(+v.toFixed(3)); return o; };
  for (const ABSENT of range(0.1, 0.9, 0.05))
    for (const ROUTER_MIN_CONF of range(0.2, 0.9, 0.1))
      for (const ROUTER_MARGIN of range(0.1, 1.0, 0.1))
        grid.push({ ...DEFAULTS, ABSENT, ROUTER_MIN_CONF, ROUTER_MARGIN });

  let best = null;
  const t0 = Date.now();
  for (const t of grid) {
    const s = score(t);
    // Ties on `exact` are broken toward abstaining more: answering a question the
    // docs do not cover is the failure this whole design exists to avoid, so when
    // two settings are equally right, prefer the more cautious one.
    const better = !best || s.exact > best.s.exact || (s.exact === best.s.exact && s.abstained > best.s.abstained);
    if (better) best = { t, s };
  }
  console.log(`\nswept ${grid.length} combinations in ${Date.now() - t0}ms\n`);
  {
    show("best found", best.t, best.s);
    console.log(`\n  ABSENT ${best.t.ABSENT}   ROUTER_MIN_CONF ${best.t.ROUTER_MIN_CONF}   ROUTER_MARGIN ${best.t.ROUTER_MARGIN}`);
    console.log("\nby category:");
    for (const [tag, v] of Object.entries(best.s.perTag).sort()) console.log(`  ${tag.padEnd(16)} ${String(v.ok).padStart(3)}/${String(v.n).padEnd(3)} ${pct(v.ok, v.n)}`);
    console.log(`\nstill wrong (${best.s.misses.length}):`);
    for (const m of best.s.misses) console.log(`  [${m.tag}] ${m.q}\n      got ${m.got} ${m.block ?? "(abstained)"}${m.expect === "answered" ? `  want one of ${m.want.join(", ")}` : ""}`);
  }
} else {
  console.log("\nby category:");
  for (const [tag, v] of Object.entries(base.perTag).sort()) console.log(`  ${tag.padEnd(16)} ${String(v.ok).padStart(3)}/${String(v.n).padEnd(3)} ${pct(v.ok, v.n)}`);
  console.log(`\nwrong (${base.misses.length}):`);
  for (const m of base.misses) console.log(`  [${m.tag}] ${m.q}\n      got ${m.got} ${m.block ?? "(abstained)"}${m.expect === "answered" ? `  want one of ${m.want.join(", ")}` : ""}`);
  console.log("\nadd --sweep to search the thresholds");
}
