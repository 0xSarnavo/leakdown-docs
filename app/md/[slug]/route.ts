import { pageBySlug } from "../../../lib/nav";
import { htmlToMd } from "../../../lib/markdown";

/* /<slug>.md (rewritten here): the page as plain markdown, for people and
   for the AI links in the top bar. Route handlers cannot render React, so it
   fetches the page's own HTML and converts the article. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  // an app page has no prose to convert
  if (!page || page.app) return new Response("not found", { status: 404 });
  // the PUBLIC origin: behind a proxy (Railway, Vercel) req.url can carry the
  // internal host, and the links written into the markdown must be clickable
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") || "https"}://${host}` : new URL(req.url).origin;
  const html = await (await fetch(`${origin}/${slug}`, { cache: "no-store" })).text();
  const start = html.indexOf('<div class="prose">');
  const end = html.indexOf('<nav class="pn"', start);
  if (start < 0 || end < 0) return new Response("could not render", { status: 500 });
  const body = htmlToMd(html.slice(start, end), origin);
  const md = `# ${page.title}\n\n> ${page.description}\n\n${body}\n\n---\nSource: ${origin}/${slug}\n`;
  return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
