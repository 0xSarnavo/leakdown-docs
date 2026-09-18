"use client";

import { useRef, useState } from "react";
import { SITE_URL } from "../lib/site";

/* Beside the title: "Copy page" copies the page as markdown; the chevron
   opens the rest (view as markdown, ChatGPT, Claude, llms.txt). The links
   work without JS. */
export default function PageActions({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const box = useRef<HTMLDetailsElement>(null);
  const md = `/${slug}.md`;
  const ask = (site: string) => encodeURIComponent(`Read ${site}${md} so I can ask questions about it.`);
  const site = SITE_URL;

  const copy = async () => {
    let next: "ok" | "fail" = "fail";
    try {
      await navigator.clipboard.writeText(await (await fetch(md)).text());
      next = "ok";
    } catch {
      next = "fail";
    }
    setCopied(next);
    box.current?.removeAttribute("open");
    window.setTimeout(() => setCopied(""), 1400);
  };

  return (
    <div className="pa">
      <button type="button" className="pa-copy" onClick={copy}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed" : "Copy page"}
      </button>
      <details ref={box}>
        <summary aria-label="More ways to open this page">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 6l4.5 4.5L12.5 6" />
          </svg>
        </summary>
        <div className="pa-menu">
          <a href={md} target="_blank" rel="noopener noreferrer">
            <b>View as Markdown</b>
            <span>The page as plain text</span>
          </a>
          <a href={`https://chatgpt.com/?q=${ask(site)}`} target="_blank" rel="noopener noreferrer">
            <b>Open in ChatGPT</b>
            <span>Ask questions about this page</span>
          </a>
          <a href={`https://claude.ai/new?q=${ask(site)}`} target="_blank" rel="noopener noreferrer">
            <b>Open in Claude</b>
            <span>Ask questions about this page</span>
          </a>
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer">
            <b>llms.txt</b>
            <span>Every page, for an AI</span>
          </a>
        </div>
      </details>
    </div>
  );
}
