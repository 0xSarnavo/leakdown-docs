"use client";

import { useState } from "react";

export type Cmd = { flag: string; does: string; group: string };

/* Every flag in one table, filterable as you type. */
export default function CommandTable({ cmds }: { cmds: Cmd[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? cmds.filter((c) => `${c.flag} ${c.does} ${c.group}`.toLowerCase().includes(needle)) : cmds;
  const groups = [...new Set(shown.map((c) => c.group))];
  return (
    <div className="dc-cmds">
      <label className="dc-filter">
        <span className="visually-hidden">Filter commands</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter flags, e.g. goal, mobile, pdf"
          autoComplete="off"
        />
        <span className="dc-count" aria-live="polite">
          {shown.length} of {cmds.length}
        </span>
      </label>
      {groups.map((g) => (
        <div className="dc-cmd-group" key={g}>
          <p className="dc-cmd-h">{g}</p>
          <dl>
            {shown
              .filter((c) => c.group === g)
              .map((c) => (
                <div className="dc-cmd" key={c.flag}>
                  <dt>
                    <code>{c.flag}</code>
                  </dt>
                  <dd>{c.does}</dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
      {!shown.length && <p className="dc-empty">No flag matches “{q}”.</p>}
    </div>
  );
}
