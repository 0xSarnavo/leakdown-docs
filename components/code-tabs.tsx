"use client";

import { useId, useState } from "react";
import CopyButton from "./copy-button";
import { Lines, Out, isTerm } from "./code";

export default function CodeTabs({ id, tabs }: { id: string; tabs: Array<{ label: string; title?: string; code: string; out?: string }> }) {
  const [on, setOn] = useState(0);
  const base = useId();
  const term = isTerm(tabs[on].title ?? "terminal");
  return (
    <figure className={term ? "code has-tabs is-term" : "code has-tabs"}>
      <figcaption>
        {term && (
          <span className="code-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
        <div className="code-tabs" role="tablist" aria-label="Examples">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              id={`${base}-t${i}`}
              aria-selected={on === i}
              aria-controls={`${base}-p${i}`}
              tabIndex={on === i ? 0 : -1}
              className={on === i ? "is-on" : undefined}
              onClick={() => setOn(i)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const n = (on + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
                setOn(n);
                document.getElementById(`${base}-t${n}`)?.focus();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CopyButton target={`${id}-${on}`} />
      </figcaption>
      {tabs.map((t, i) => {
        const tt = isTerm(t.title ?? "terminal");
        return (
          <pre key={t.label} tabIndex={0} role="tabpanel" id={`${base}-p${i}`} aria-labelledby={`${base}-t${i}`} hidden={on !== i}>
            <code id={`${id}-${i}`}>{tt ? <Lines code={t.code} /> : t.code}</code>
            {t.out && (tt ? <Out text={t.out.replace(/^\n/, "")} /> : <samp>{t.out}</samp>)}
          </pre>
        );
      })}
    </figure>
  );
}
