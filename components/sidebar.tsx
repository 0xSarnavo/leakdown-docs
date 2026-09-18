"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PAGES, isWide, pageBySlug } from "../lib/nav";

/* The pages of the current tab, grouped under plain labels. A tab with one
   group shows no label; a tab with one page lists that page's sections
   instead (the changelog's versions). The open page is scrolled into view. On narrow screens it is a drawer the top bar's menu
   button opens; it closes on navigation, Esc or the scrim. */
export default function Sidebar() {
  const path = usePathname();
  const slug = path.replace(/^\//, "");
  const tab = pageBySlug(slug)?.tab ?? "guides";
  const pages = PAGES.filter((p) => p.tab === tab);
  const groups = [...new Set(pages.map((p) => p.group))];
  const [open, setOpen] = useState(false);
  const aside = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("docs:drawer", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("docs:drawer", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    aside.current?.querySelector(".is-on")?.scrollIntoView({ block: "nearest" });
  }, [path]);

  if (isWide(tab)) return null;

  return (
    <>
      <div className={`scrim${open ? " is-on" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`side${open ? " is-open" : ""}`} aria-label="Docs pages" ref={aside}>
        {pages.length === 1 ? (
          <div className="side-group">
            <ul>
              {pages[0].sections.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
        groups.map((g) => (
          <div className="side-group" key={g}>
            {groups.length > 1 && <p>{g}</p>}
            <ul>
              {pages
                .filter((p) => p.group === g)
                .map((p) => (
                  <li key={p.slug}>
                    <Link href={`/${p.slug}`} className={p.slug === slug ? "is-on" : undefined} aria-current={p.slug === slug ? "page" : undefined}>
                      {p.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))
        )}
      </aside>
    </>
  );
}
