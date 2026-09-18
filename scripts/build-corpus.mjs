/* Build lib/corpus.json: the text /api/ask is allowed to quote.
   Two sources, both markdown, both split on ATX headings:
     docs  — this site's own /llms.txt -> every /<slug>.md (needs the site running)
     cli   — leakdown-cli README.md, AGENTS.md, CHANGELOG.md and `leakdown --help`
   Node stdlib only. Deterministic block ids, so a rebuild with no doc change
   produces a byte-identical file.

   usage:
     node scripts/build-corpus.mjs [--base http://127.0.0.1:3001] [--cli ../../leakdown-cli] [--check]
*/
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL } from "../lib/site.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "lib", "corpus.json");
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const BASE = (flag("base", process.env.DOCS_BASE || "http://127.0.0.1:3001")).replace(/\/$/, "");
const CLI_DIR = path.resolve(ROOT, flag("cli", process.env.CLI_DIR || "../leakdown-cli"));
const CHECK = argv.includes("--check");
const REPO_BLOB = "https://github.com/0xSarnavo/leakdown-cli/blob/main";
// blocks are quoted with a link, and the link must work off this machine
const PUBLIC = (process.env.DOCS_PUBLIC || SITE_URL).replace(/\/$/, "");

const LINK_RE = /\[([^\]]+)\]\((\S+?)\)/g;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;

async function fetchText(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "leakdown-docs-corpus/1" } });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.text();
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`fetch ${url}: ${last?.message ?? last}`);
}

/* lib/markdown.ts turns an empty <li> into a bare "-", which is invisible on a
   docs page but becomes a stray bullet once a block is quoted on its own. The
   same artifact is in /<slug>.md today; this strips it on the way in rather
   than changing what that endpoint has always returned. */
function clean(md) {
  return md
    .split("\n")
    .filter((l) => !/^\s*[-*]\s*$/.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* Split markdown into one block per heading. Never splits inside a ``` fence:
   a code sample stays whole, so a quoted answer is always runnable. */
function splitBlocks(md, { slug, pageUrl, pageTitle, source }) {
  const segs = [];
  let cur = null;
  let inFence = false;
  for (const line of md.split("\n")) {
    let m = null;
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    else if (!inFence) m = HEADING_RE.exec(line);
    if (m) {
      if (cur && cur.lines.join("\n").trim()) segs.push(cur);
      cur = { level: m[1].length, title: m[2].replace(/\s+#+\s*$/, "").trim(), lines: [line] };
    } else {
      if (!cur) cur = { level: 0, title: "", lines: [] };
      cur.lines.push(line);
    }
  }
  if (cur && cur.lines.join("\n").trim()) segs.push(cur);

  const realTitle = segs.find((s) => s.level === 1)?.title || pageTitle;
  const blocks = [];
  let stack = [];
  for (const seg of segs) {
    stack = seg.level === 0 ? [realTitle] : [...stack.slice(0, seg.level - 1), seg.title];
    const text = clean(seg.lines.join("\n"));
    if (!text) continue;
    blocks.push({
      block_id: `${slug}-H${String(blocks.length).padStart(3, "0")}`,
      source,
      page_url: pageUrl,
      page_title: realTitle,
      heading_path: [...stack],
      level: seg.level,
      text,
    });
  }
  const kept = absorbThinSections(blocks);
  kept.forEach((b, i) => (b.block_id = `${slug}-H${String(i).padStart(3, "0")}`));
  return { blocks: kept, realTitle };
}

/* A heading whose own text only introduces what follows cannot answer anything
   on its own: "Install — installing takes three steps and a few minutes" is a
   lead-in, and the commands live in the subsections under it. Left alone it
   still wins the ranking and buries the real answer in the supporting
   passages. So a thin section swallows its subsections and becomes the
   self-contained answer, and a heading with no body at all is dropped — its
   words survive in its children's heading_path either way.

   Only level 2 and deeper: a page's opening block is a summary of the page and
   is meant to be short. The size cap stops a thin heading over a long subtree
   from turning a whole page into one block. */
const THIN_BODY = 200;
const MERGED_MAX = 2600;

const bodyOf = (text) => text.replace(/^#+ .*$/m, "").trim();

function absorbThinSections(blocks) {
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.level >= 2 && bodyOf(b.text).length < THIN_BODY) {
      let end = i + 1;
      while (end < blocks.length && blocks[end].level > b.level) end++;
      const kids = blocks.slice(i + 1, end);
      const merged = [b.text, ...kids.map((k) => k.text)].join("\n\n");
      if (kids.length && merged.length <= MERGED_MAX) {
        out.push({ ...b, text: merged });
        i = end - 1;
        continue;
      }
    }
    out.push(b);
  }
  // a heading with nothing under it says nothing
  return out.filter((b) => bodyOf(b.text).length > 0);
}

async function docsPages() {
  let index;
  try {
    index = await fetchText(`${BASE}/llms.txt`);
  } catch (e) {
    console.error(`\ncannot reach the docs site at ${BASE}`);
    console.error("start it first:  npm run build && npm start   (or npm run dev)\n");
    throw e;
  }
  const seen = new Set();
  const links = [];
  for (const [, title, url] of index.matchAll(LINK_RE)) {
    const abs = url.startsWith("http") ? url : `${BASE}${url}`;
    if (!/\.md$/.test(abs) || seen.has(abs)) continue;
    seen.add(abs);
    links.push({ title: title.trim(), url: abs });
  }
  const out = [];
  for (const { title, url } of links) {
    const slug = new URL(url).pathname.replace(/^\//, "").replace(/\.md$/, "") || "index";
    // Two things /<slug>.md adds for a human reader that must not reach a block:
    // its trailing "--- Source: <url>" footer, which would be quoted back as if
    // it were documentation, and absolute links built from the REQUEST origin,
    // which on this machine is localhost and would ship dead links to readers.
    const md = (await fetchText(url))
      .replace(/\n+---\nSource:[^\n]*\n*$/, "\n")
      .replaceAll(BASE, PUBLIC)
      .replaceAll(BASE.replace("127.0.0.1", "localhost"), PUBLIC);
    // link readers to the page, not to the .md
    const { blocks, realTitle } = await splitBlocks(md, {
      slug,
      pageUrl: `${PUBLIC}/${slug}`,
      pageTitle: title,
      source: "docs",
    });
    out.push({ url: `${PUBLIC}/${slug}.md`, title: realTitle, slug, source: "docs", block_count: blocks.length, blocks });
  }
  return out;
}

function cliPages() {
  const files = [
    { file: "README.md", title: "leakdown-cli README" },
    { file: "AGENTS.md", title: "leakdown-cli AGENTS guide" },
    { file: "CHANGELOG.md", title: "leakdown-cli changelog" },
  ];
  const out = [];
  for (const { file, title } of files) {
    const abs = path.join(CLI_DIR, file);
    if (!existsSync(abs)) {
      console.error(`skip ${file}: not at ${abs}`);
      continue;
    }
    const slug = `cli-${file.replace(/\.md$/, "").toLowerCase()}`;
    const { blocks, realTitle } = splitBlocks(readFileSync(abs, "utf8"), {
      slug,
      pageUrl: `${REPO_BLOB}/${file}`,
      pageTitle: title,
      source: "cli",
    });
    out.push({ url: `${REPO_BLOB}/${file}`, title: realTitle, slug, source: "cli", block_count: blocks.length, blocks });
  }

  // `leakdown --help` — the flag reference straight from the binary, so a flag
  // that exists but is not written up yet is still quotable.
  const bin = path.join(CLI_DIR, "dist", "cli.js");
  if (existsSync(bin)) {
    let help = "";
    try {
      help = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8", timeout: 30_000 });
    } catch (e) {
      // --help on some CLIs exits nonzero; the output is still on stdout
      help = e.stdout?.toString() ?? "";
    }
    if (help.trim()) {
      // The help text is plain, not markdown. Its section banners all sit at
      // column 0, open with two or more capitals and end in a colon
      // ("WHO GOES IN:", "ON ITS OWN - <what> is a site name ...:"); promoting
      // those to h2 splits the help into one block per section, so an answer
      // quotes the flags you asked about and not the whole page.
      const BANNER = /^[A-Z]{2,}[^\n]*:$/;
      const md =
        `# leakdown --help\n\n` +
        help
          .replace(/\r/g, "")
          .split("\n")
          .map((l) => (BANNER.test(l) ? `\n## ${l.replace(/:$/, "")}\n` : l))
          .join("\n");
      const { blocks } = splitBlocks(md, {
        slug: "cli-help",
        pageUrl: `${REPO_BLOB}/README.md`,
        pageTitle: "leakdown --help",
        source: "cli",
      });
      out.push({ url: `${REPO_BLOB}/README.md`, title: "leakdown --help", slug: "cli-help", source: "cli", block_count: blocks.length, blocks });
    }
  } else {
    console.error(`skip --help: no built CLI at ${bin} (run npm run build in leakdown-cli)`);
  }
  return out;
}

const pages = [...(await docsPages()), ...cliPages()];
const blocks = pages.flatMap((p) => p.blocks);
for (const p of pages) console.log(`${p.slug.padEnd(22)} ${String(p.block_count).padStart(3)} blocks  [${p.source}]`);

const corpus = {
  built_at: new Date().toISOString(),
  sources: ["docs:llms.txt", "cli:repo"],
  pages: pages.map(({ blocks: _drop, ...p }) => p),
  blocks,
};
writeFileSync(OUT, JSON.stringify(corpus, null, 1) + "\n");
console.log(`\npages=${pages.length} blocks=${blocks.length} -> lib/corpus.json`);

if (CHECK) {
  const fail = (m) => {
    console.error(`FAIL: ${m}`);
    process.exit(1);
  };
  const empty = blocks.filter((b) => !b.text.trim());
  if (empty.length) fail(`${empty.length} blocks have empty text`);
  const ids = blocks.map((b) => b.block_id);
  if (ids.length !== new Set(ids).size) fail("duplicate block_ids");
  if (!blocks.some((b) => b.source === "docs")) fail("no docs blocks");
  if (!blocks.some((b) => b.source === "cli")) fail("no cli blocks");
  const noHead = blocks.filter((b) => !b.heading_path.length);
  if (noHead.length) fail(`${noHead.length} blocks have no heading_path`);
  const big = pages.reduce((a, b) => (b.block_count > a.block_count ? b : a));
  console.log(`largest page: ${big.slug} (${big.block_count} blocks)`);
  console.log("check: OK");
}
