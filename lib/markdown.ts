/* The rendered page as markdown, for /<slug>.md, llms.txt and "copy page".
   A regex pass over the static HTML of a doc's body: enough for headings,
   paragraphs, code, lists, tables and links. Ponytail: no HTML parser; add
   one if a page ever renders something this misses. */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#x27": "'", "#39": "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#x27|#39|nbsp);/g, (_, e) => ENTITIES[e]);

export function htmlToMd(html: string, origin: string): string {
  let s = html;
  s = s.replace(/<figcaption[\s\S]*?<\/figcaption>/g, "");
  s = s.replace(/<pre[^>]*\bhidden\b[^>]*>[\s\S]*?<\/pre>/g, ""); // inactive code tabs
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, body) => `\n\n\`\`\`\n${decode(body.replace(/<[^>]+>/g, ""))}\n\`\`\`\n\n`);
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, "\n\n## $1\n\n");
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, "\n\n### $1\n\n");
  s = s.replace(/<li[^>]*>/g, "\n- ").replace(/<\/li>/g, "");
  s = s.replace(/<thead>([\s\S]*?)<\/thead>/g, (_, t) => `${t}\n|${"---|".repeat((t.match(/<th\b/g) ?? []).length)}`);
  s = s.replace(/<tr[^>]*>/g, "\n| ").replace(/<\/t[hd]>/g, " | ").replace(/<\/tr>/g, "");
  s = s.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, text) => `[${text}](${href.startsWith("/") ? origin + href : href})`);
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, "`$1`");
  s = s.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/g, "**$2**");
  s = s.replace(/<(?:p|div|aside|section|figure|ol|ul|table|thead|tbody)[^>]*>/g, "\n").replace(/<br\s*\/?>/g, "\n");
  s = s.replace(/<[^>]+>/g, "");
  return decode(s).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
