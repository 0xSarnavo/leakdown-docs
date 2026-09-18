import { DOC_PAGES, TABS } from "../../lib/nav";

/* llms.txt: what the docs are, and every page as a markdown link. */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") || "https"}://${host}` : new URL(req.url).origin;
  const lines = [
    "# Leakdown Docs",
    "",
    "> Leakdown sends simulated prospects through a website's signup in a real browser and reports where they gave up. This is the CLI documentation; every page is also available as markdown at the .md link.",
    "",
  ];
  for (const t of TABS) {
    const pages = DOC_PAGES.filter((p) => p.tab === t.id);
    if (!pages.length) continue; // an app tab, e.g. Ask: nothing to read as markdown
    lines.push(`## ${t.label}`, "");
    for (const p of pages) lines.push(`- [${p.title}](${origin}/${p.slug}.md): ${p.description}`);
    lines.push("");
  }
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
