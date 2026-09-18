"use client";

import { useCallback, useEffect, useRef } from "react";
import AskChat from "./ask-chat";
import Sparkle from "./sparkle";

/* The panel: the same conversation as /ask, over the page you are reading, for
   when you do not want to leave it. Opened by the launcher under the contents
   list, or by anything that fires `docs:ask`. The full page is the other door
   to the same room. */
export default function Ask() {
  const box = useRef<HTMLDialogElement>(null);

  /* The dialog's own `open` is the only state here. Mirroring it in React
     desynced the moment the browser closed the dialog itself — Esc closes it
     natively without React's onClose firing, which left the mirror stuck on
     "open" and every later click on the launcher a no-op, locking the panel
     shut until a reload. Asking the element is always right. */
  const show = useCallback(() => {
    const d = box.current;
    if (d && !d.open) d.showModal();
  }, []);
  const hide = useCallback(() => box.current?.close(), []);

  useEffect(() => {
    window.addEventListener("docs:ask", show);
    return () => window.removeEventListener("docs:ask", show);
  }, [show]);

  return (
    <dialog
      className="ask"
      ref={box}
      aria-label="Ask the docs"
      onClick={(e) => {
        if (e.target === e.currentTarget) hide();
      }}
    >
      <div className="ask-card">
        <header className="ask-head">
          <div className="ask-title">
            <Sparkle />
            <b>Ask the docs</b>
            <span className="ask-alpha">alpha</span>
          </div>
          <a className="ask-expand" href="/ask" aria-label="Open the full page">
            Open full page ↗
          </a>
          <button className="icon" type="button" onClick={hide} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <p className="ask-note">
          This is <b>alpha</b>. It does not write answers — it finds the paragraph of the docs that answers you and shows it word
          for word, or tells you the docs do not cover it. It can still pick the wrong paragraph, so check the page it links to
          before you rely on it.
        </p>

        <AskChat />
      </div>
    </dialog>
  );
}
