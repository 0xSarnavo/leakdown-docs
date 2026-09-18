/* A deep audit of the answers themselves, not of how they score against labels.

   scripts/eval-ask.mjs asks "did it pick a block the gold set accepts". That
   depends on my labels being right, and they have been wrong before. This asks
   things that do not need my judgement at all:

     verbatim   the shown text is byte-identical to a corpus block — the
                "nothing is generated" claim, checked on every answer rather
                than argued from the architecture
     substance  the answer is not a lead-in with the real content elsewhere
                (the bug where "Install" answered with "takes three steps")
     sourced    the link goes somewhere that exists
     silent     an abstention shows nothing at all
     stable     asking twice gives the same verdict and the same block

   usage: npm run audit:ask            (one call per gold query)
          npm run audit:ask -- --stability 20
*/
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL } from "../lib/site.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.ASK_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
const argv = process.argv.slice(2);
const at = argv.indexOf("--stability");
const STABILITY = at >= 0 ? Number(argv[at + 1] ?? 20) : 0;

const corpus = JSON.parse(readFileSync(path.join(ROOT, "lib", "corpus.json"), "utf8"));
const BY_ID = new Map(corpus.blocks.map((b) => [b.block_id, b]));
const SLUGS = new Set(corpus.pages.map((p) => p.slug));
const queries = JSON.parse(readFileSync(path.join(ROOT, "scripts", "ask-gold.json"), "utf8")).queries;

const body = (t) => t.replace(/^#+ .*$/m, "").trim();
const ask = async (q) => {
  const r = await fetch(`${BASE}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
  return r.json();
};

const fail = { verbatim: [], substance: [], sourced: [], silent: [], stable: [] };
const seen = [];
let answers = 0;
let abstentions = 0;

for (const [i, g] of queries.entries()) {
  process.stdout.write(`\r  ${i + 1}/${queries.length}  ${g.q.slice(0, 44).padEnd(44)}`);
  const r = await ask(g.q);
  if (r.error) {
    fail.verbatim.push(`${g.q} -> request error ${r.error}`);
    continue;
  }
  seen.push({ g, r });
  const hits = [r.answer, ...(r.supporting ?? [])].filter(Boolean);

  if (r.verdict === "absent") {
    abstentions++;
    // an abstention that still shows a passage is the failure this design exists to avoid
    if (r.answer || (r.supporting ?? []).length) fail.silent.push(`${g.q} -> abstained but showed ${hits.length} passage(s)`);
    continue;
  }
  answers++;

  for (const h of hits) {
    const block = BY_ID.get(h.block_id);
    // the whole promise: what is on screen is a copy, character for character
    if (!block) fail.verbatim.push(`${g.q} -> block ${h.block_id} is not in the corpus`);
    else if (block.text !== h.text) fail.verbatim.push(`${g.q} -> text for ${h.block_id} differs from the corpus`);

    const url = h.page_url ?? "";
    const ok = url.startsWith(`${SITE_URL}/`)
      ? SLUGS.has(url.replace(`${SITE_URL}/`, "").split("#")[0])
      : url.startsWith("https://github.com/0xSarnavo/leakdown-cli/");
    if (!ok) fail.sourced.push(`${g.q} -> ${h.block_id} links to ${url || "(nothing)"}`);
  }

  // a leading answer that is only a heading and a sentence of throat-clearing
  const lead = r.answer ? body(r.answer.text) : "";
  if (r.answer && lead.length < 120) fail.substance.push(`${g.q} -> ${r.answer.block_id} is ${lead.length} chars: "${lead.slice(0, 70)}"`);
}
console.log("\n");

if (STABILITY > 0) {
  const sample = queries.filter((_, i) => i % Math.ceil(queries.length / STABILITY) === 0).slice(0, STABILITY);
  for (const [i, g] of sample.entries()) {
    process.stdout.write(`\r  stability ${i + 1}/${sample.length}   `);
    const a = seen.find((s) => s.g.q === g.q)?.r;
    const b = await ask(g.q);
    if (!a || b.error) continue;
    if (a.verdict !== b.verdict) fail.stable.push(`${g.q} -> ${a.verdict} then ${b.verdict}`);
    else if ((a.answer?.block_id ?? null) !== (b.answer?.block_id ?? null)) fail.stable.push(`${g.q} -> ${a.answer?.block_id ?? "none"} then ${b.answer?.block_id ?? "none"}`);
  }
  console.log("\n");
}

const quoted = seen.reduce((n, s) => n + [s.r.answer, ...(s.r.supporting ?? [])].filter(Boolean).length, 0);
console.log(`${seen.length} questions asked · ${answers} answered · ${abstentions} abstained · ${quoted} passages shown\n`);

const line = (name, bad, total, what) =>
  console.log(`  ${name.padEnd(10)} ${bad.length ? "FAIL" : " OK "}  ${String(total - bad.length).padStart(4)}/${String(total).padEnd(4)} ${what}`);
line("verbatim", fail.verbatim, quoted, "passages byte-identical to the corpus");
line("sourced", fail.sourced, quoted, "passages link to a page that exists");
line("substance", fail.substance, answers, "answers lead with real content, not a lead-in");
line("silent", fail.silent, abstentions, "abstentions showed nothing at all");
if (STABILITY > 0) line("stable", fail.stable, STABILITY, "questions gave the same answer twice");

const all = Object.entries(fail).filter(([, v]) => v.length);
if (all.length) {
  for (const [name, list] of all) {
    console.log(`\n${name} (${list.length}):`);
    for (const f of list.slice(0, 12)) console.log(`  ${f}`);
    if (list.length > 12) console.log(`  … and ${list.length - 12} more`);
  }
  process.exit(1);
}
console.log("\nPASS — every passage shown was a copy, sourced, substantial, and stable.");
