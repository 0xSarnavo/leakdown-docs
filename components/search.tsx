"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PAGES, TABS } from "../lib/nav";

type Hit = { href: string; title: string; crumb: string; text: string };

const INDEX: Hit[] = PAGES.flatMap((p) => {
  const tab = TABS.find((t) => t.id === p.tab)?.label ?? "";
  return [
    { href: `/${p.slug}`, title: p.title, crumb: `${tab} · ${p.group}`, text: `${p.title} ${p.description} ${p.keywords ?? ""}` },
    ...p.sections.map(([id, label]) => ({
      href: `/${p.slug}#${id}`,
      title: label,
      crumb: `${p.title}`,
      text: `${label} ${p.title} ${p.keywords ?? ""}`,
    })),
  ];
});

/* ⌘K / Ctrl-K search over page titles, descriptions, keywords and sections.
   Arrow keys move, Enter opens, Esc closes. */
export default function Search() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return INDEX.filter((h) => !h.href.includes("#")).slice(0, 8);
    return INDEX.map((h) => {
      const t = h.text.toLowerCase();
      if (!words.every((w) => t.includes(w))) return null;
      const score = words.reduce((s, w) => s + (h.title.toLowerCase().includes(w) ? 3 : 1), 0) - (h.href.includes("#") ? 0.5 : 0);
      return { h, score };
    })
      .filter((x): x is { h: Hit; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.h);
  }, [q]);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("docs:search", show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("docs:search", show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const d = box.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQ("");
      setSel(0);
      input.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => setSel(0), [q]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    setOpen(false);
    router.push(h.href);
  };

  return (
    <dialog
      className="search"
      ref={box}
      aria-label="Search docs"
      onClose={() => setOpen(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="search-card">
        <label className="search-in">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <span className="visually-hidden">Search</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the docs, e.g. exit codes"
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-list"
            aria-activedescendant={hits[sel] ? `hit-${sel}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(hits.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(hits[sel]);
              }
            }}
          />
          <kbd>esc</kbd>
        </label>
        <ul className="search-list" id="search-list" role="listbox">
          {hits.map((h, i) => (
            <li key={h.href} id={`hit-${i}`} role="option" aria-selected={i === sel}>
              <button type="button" className={i === sel ? "is-on" : undefined} onMouseEnter={() => setSel(i)} onClick={() => go(h)}>
                <span className="hit-kind" aria-hidden="true">
                  {h.href.includes("#") ? "#" : "¶"}
                </span>
                <span className="hit-body">
                  <b>{h.title}</b>
                  <small>{h.crumb}</small>
                </span>
                <span className="hit-go" aria-hidden="true">
                  ↵
                </span>
              </button>
            </li>
          ))}
          {!hits.length && <li className="search-empty">Nothing matches “{q}”.</li>}
        </ul>
      </div>
    </dialog>
  );
}
