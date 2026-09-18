import CopyButton from "./copy-button";
import CodeTabsClient from "./code-tabs";

/* Code blocks. A "terminal" block gets window dots, a `$` prompt on every
   command line (CSS, so the copy button never copies it) and coloured output.
   Ids must be unique on a page. */

export const isTerm = (title: string) => title.startsWith("terminal");

/* one span per line, so CSS can put a prompt before each; the newline stays
   in the text so copy keeps the line breaks */
export function Lines({ code }: { code: string }) {
  const ls = code.split("\n");
  return (
    <>
      {ls.map((l, i) => (
        <span className="ln" key={i}>
          {l}
          {i < ls.length - 1 ? "\n" : ""}
        </span>
      ))}
    </>
  );
}

const tone = (l: string) => {
  if (/^\s*▸/.test(l)) return "t-stage";
  if (/ABANDONED|GUARDRAIL|COULD NOT RUN|✗|⛔|🛑|FAIL\b/.test(l)) return "t-err";
  if (/✓|✅|COMPLETED|PASS\b|📬/.test(l)) return "t-ok";
  if (/⚠|!/.test(l) && !/^\s*\[/.test(l)) return "t-warn";
  if (/^\s*Fix first:|^\s*\d+ of \d+ completed/.test(l)) return "t-strong";
  return "t-dim";
};

export function Out({ text }: { text: string }) {
  return (
    <samp>
      {text.split("\n").map((l, i) => (
        <span className={tone(l)} key={i}>
          {l}
          {"\n"}
        </span>
      ))}
    </samp>
  );
}

export function Chrome({ title }: { title: string }) {
  return isTerm(title) ? (
    <>
      <span className="code-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="code-t">{title.replace(/^terminal\s*·?\s*/, "") || "zsh"}</span>
    </>
  ) : (
    <span className="code-t">{title}</span>
  );
}

export function Code({ id, title = "terminal", out, children }: { id: string; title?: string; out?: string; children: string }) {
  const term = isTerm(title);
  return (
    <figure className={term ? "code is-term" : "code"}>
      <figcaption>
        <Chrome title={title} />
        <CopyButton target={id} />
      </figcaption>
      <pre tabIndex={0}>
        <code id={id}>{term ? <Lines code={children} /> : children}</code>
        {out && (term ? <Out text={out.replace(/^\n/, "")} /> : <samp>{out}</samp>)}
      </pre>
    </figure>
  );
}

/* Several snippets for the same job, one tab each. */
export function CodeTabs({ id, tabs }: { id: string; tabs: Array<{ label: string; title?: string; code: string; out?: string }> }) {
  return <CodeTabsClient id={id} tabs={tabs} />;
}
