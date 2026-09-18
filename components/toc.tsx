"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { id: string; label: string; level: number };

/* "On this page": built from the article's h2/h3 after each navigation. The
   heading under the reading line lights up and a bar tracks scroll progress. */
export default function Toc() {
  const path = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const art = document.querySelector("article.doc");
    if (!art) return;
    const hs = Array.from(art.querySelectorAll<HTMLElement>("h2.anchor[id], h3.anchor[id]"));
    setItems(hs.map((h) => ({ id: h.id, label: h.textContent?.replace(/^#/, "").trim() ?? "", level: h.tagName === "H2" ? 2 : 3 })));

    let raf = 0;
    const bar = document.querySelector<HTMLElement>(".progress i");
    const read = () => {
      raf = 0;
      const line = 140;
      let on = hs[0]?.id ?? "";
      for (const h of hs) if (h.getBoundingClientRect().top <= line) on = h.id;
      setActive(on);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar?.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, window.scrollY / max).toFixed(3) : "0"})`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [path]);

  if (!items.length) return <div className="toc" />;
  return (
    <nav className="toc" aria-label="On this page">
      <p>On this page</p>
      <ul>
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? "sub" : undefined}>
            <a href={`#${it.id}`} className={active === it.id ? "is-on" : undefined}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
