"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoMark from "./logo-mark";
import Sparkle from "./sparkle";
import { REPO, TABS, pageBySlug } from "../lib/nav";

type Theme = "auto" | "light" | "dark";
const KEY = "leakdown-theme";

/* One-row top bar: mark, tabs, search, GitHub, theme. Under 900px the tabs drop to a second row and the menu button
   opens the sidebar as a drawer (sidebar.tsx listens for it). */
export default function Topbar() {
  const path = usePathname();
  const tab = pageBySlug(path.replace(/^\//, ""))?.tab ?? "guides";
  const [theme, setTheme] = useState<Theme>("auto");
  const [dark, setDark] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark" || saved === "auto") setTheme(saved);
    } catch {
      /* storage off: stay on auto */
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage off */
    }
    let d = theme === "dark";
    if (theme === "auto") {
      try {
        d = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch {
        d = true;
      }
    }
    setDark(d);
  }, [theme]);

  return (
    <header className="top">
      <div className="top-row">
        <button
          className="icon menu-btn"
          type="button"
          aria-label="Open navigation"
          onClick={() => window.dispatchEvent(new Event("docs:drawer"))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <Link className="brand" href="/introduction">
          <LogoMark className="brand-mark" />
          <span>Leakdown</span>
        </Link>
        <button className="search-btn" type="button" onClick={() => window.dispatchEvent(new Event("docs:search"))}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <span>Search docs</span>
          <kbd>⌘K</kbd>
        </button>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/${t.home}`}
              className={`${t.id === "ask" ? "ask-tab " : ""}${tab === t.id ? "is-on" : ""}`.trim() || undefined}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.label}
              {/* Ask is a tab like the rest — a page, not a popup. The star sits
                  after the word the way a footnote mark does: the label reads
                  first, then what marks it as the AI-backed one. */}
              {t.id === "ask" && <Sparkle />}
            </Link>
          ))}
        </nav>
        <span className="sp" />
        <a className="icon" href={REPO} target="_blank" rel="noopener noreferrer" aria-label="Leakdown CLI on GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="fill">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>
        <button
          className="icon"
          type="button"
          onClick={() => setTheme((t) => (t === "auto" ? "light" : t === "light" ? "dark" : "auto"))}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {dark ? (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            ) : (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </>
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
