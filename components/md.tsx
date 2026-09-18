/* A corpus block, rendered.

   Blocks are stored as the markdown the docs already publish at /<slug>.md, so
   showing one means rendering markdown — the site's own pages are TSX, and
   lib/markdown.ts only goes the other way. This is the small half of a markdown
   renderer: headings, fenced code, lists, tables, quotes, and inline code, bold
   and links. Nothing is rewritten or summarised; every character shown is a
   character from the docs.

   No dangerouslySetInnerHTML: blocks are ours, but the answer path should not
   be the one place on this site that can inject markup. */

import { Fragment, type ReactNode } from "react";
import { SITE_URL } from "../lib/site";

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return <code key={k}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) return <b key={k}>{part.slice(2, -2)}</b>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
      return (
        <a key={k} href={href} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
          {inline(label, k)}
        </a>
      );
    }
    return <Fragment key={k}>{part}</Fragment>;
  });
}

/* A markdown table: the header row, the |---| rule, then the body. The docs
   emit a blank line between the rule and the body, so blank lines inside a
   table are skipped rather than ending it. */
function table(rows: string[], key: string) {
  const cells = (row: string) =>
    row
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const [head, ...body] = rows.filter((r) => !/^\|[\s|:-]+\|?$/.test(r.replace(/\s/g, "")) || !/^[\s|:-]+$/.test(r.replace(/\|/g, "")));
  return (
    <div className="ask-table" key={key}>
    <table>
      <thead>
        <tr>{cells(head).map((c, i) => <th key={i}>{inline(c, `${key}-h${i}`)}</th>)}</tr>
      </thead>
      <tbody>
        {body.map((row, r) => (
          <tr key={r}>{cells(row).map((c, i) => <td key={i}>{inline(c, `${key}-${r}-${i}`)}</td>)}</tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export default function Md({ text, skipFirstHeading }: { text: string; skipFirstHeading?: boolean }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let firstHeading = true;

  const flushParagraph = (buf: string[]) => {
    if (!buf.length) return;
    out.push(<p key={`p${out.length}`}>{inline(buf.join(" "), `p${out.length}`)}</p>);
    buf.length = 0;
  };

  const para: string[] = [];
  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      flushParagraph(para);
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) body.push(lines[i++]);
      i++; // the closing fence
      out.push(
        <pre key={`c${out.length}`} data-lang={lang || undefined}>
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(para);
      i++;
      // the block's own heading is already shown as the breadcrumb above it
      if (firstHeading && skipFirstHeading) {
        firstHeading = false;
        continue;
      }
      firstHeading = false;
      const Tag = (heading[1].length <= 2 ? "h4" : "h5") as "h4" | "h5";
      out.push(<Tag key={`h${out.length}`}>{inline(heading[2], `h${out.length}`)}</Tag>);
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushParagraph(para);
      const rows: string[] = [];
      while (i < lines.length && (/^\s*\|.*\|\s*$/.test(lines[i]) || (!lines[i].trim() && /^\s*\|/.test(lines[i + 1] ?? "")))) {
        if (lines[i].trim()) rows.push(lines[i].trim());
        i++;
      }
      out.push(table(rows, `t${out.length}`));
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph(para);
      const ordered = !!numbered;
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered ? /^\s*\d+\.\s+(.*)$/.exec(lines[i]) : /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (m) items.push(m[1]);
        else if (/^\s+\S/.test(lines[i]) && items.length) items[items.length - 1] += " " + lines[i].trim(); // wrapped line
        else break;
        i++;
      }
      const List = ordered ? "ol" : "ul";
      out.push(
        <List key={`l${out.length}`}>
          {items.map((it, n) => (
            <li key={n}>{inline(it, `l${out.length}-${n}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph(para);
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      out.push(<blockquote key={`q${out.length}`}>{inline(quote.join(" "), `q${out.length}`)}</blockquote>);
      continue;
    }

    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph(para);
      out.push(<hr key={`r${out.length}`} />);
      i++;
      continue;
    }

    if (!line.trim()) {
      flushParagraph(para);
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushParagraph(para);
  return <>{out}</>;
}
