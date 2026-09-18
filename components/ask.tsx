"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Md from "./md";

/* Ask the docs. A launcher in the corner of every page, and the same panel
   from the "Ask" button in the top bar (both dispatch `docs:ask`).

   What comes back is not written by a model. A block of the docs is chosen and
   shown exactly as it is published, with the page it came from; when nothing in
   the docs answers the question the panel says so and shows nothing else. That
   is the whole point of it, so the UI never renders an answer and a doubt in
   the same breath. */

type Hit = {
  block_id: string;
  prob: number;
  text: string;
  heading_path: string[];
  page_url: string;
  page_title: string;
  source: "docs" | "cli";
};

type Reply = {
  verdict: "answered" | "partial" | "absent";
  label: string;
  exists: number;
  fully: number;
  answer: Hit | null;
  supporting: Hit[];
  router: { choice: string; confidence: number } | null;
};

type Turn = { q: string; state: "asking" | "done" | "error"; reply?: Reply; error?: string };

const EXAMPLES = ["How do I install it?", "What does exit code 2 mean?", "How do I run a goal test in CI?"];

function Crumb({ hit }: { hit: Hit }) {
  return (
    <a className="ask-crumb" href={hit.page_url} target="_blank" rel="noreferrer noopener">
      {hit.heading_path.map((h, i) => (
        <span key={i}>{h}</span>
      ))}
      <span className="ask-src">{hit.source === "cli" ? "from the CLI repo" : "docs"}</span>
    </a>
  );
}

export default function Ask() {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const box = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.state === "asking");

  /* The dialog's own `open` is the only state here. Mirroring it in React
     desynced the moment the browser closed the dialog itself — Esc closes it
     natively without React's onClose firing, which left the mirror stuck on
     "open" and every later click on the launcher a no-op, locking the panel
     shut until a reload. Asking the element is always right. */
  const show = useCallback(() => {
    const d = box.current;
    if (d && !d.open) {
      d.showModal();
      input.current?.focus();
    }
  }, []);
  const hide = useCallback(() => box.current?.close(), []);

  useEffect(() => {
    window.addEventListener("docs:ask", show);
    return () => window.removeEventListener("docs:ask", show);
  }, [show]);

  // keep the newest turn in view as answers arrive
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send(question: string) {
    const query = question.trim();
    if (!query || busy) return;
    setQ("");
    const at = turns.length;
    setTurns((t) => [...t, { q: query, state: "asking" }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setTurns((t) =>
        t.map((turn, i) =>
          i === at ? (res.ok ? { ...turn, state: "done", reply: data as Reply } : { ...turn, state: "error", error: data.error ?? "that did not work" }) : turn,
        ),
      );
    } catch {
      setTurns((t) => t.map((turn, i) => (i === at ? { ...turn, state: "error", error: "no answer came back — check your connection" } : turn)));
    }
  }

  return (
    <>
      <button className="ask-fab" type="button" onClick={show} aria-label="Ask the docs a question">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 1 1 21 12z" />
        </svg>
        <span>Ask the docs</span>
      </button>

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
              <b>Ask the docs</b>
              <span className="ask-alpha">alpha</span>
            </div>
            <button className="icon" type="button" onClick={hide} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <p className="ask-note">
            This is <b>alpha</b>. It does not write answers — it finds the paragraph of the docs that answers you and shows it
            word for word, or tells you the docs do not cover it. It can still pick the wrong paragraph, so check the page it
            links to before you rely on it.
          </p>

          <div className="ask-feed" ref={feed}>
            {!turns.length && (
              <div className="ask-empty">
                <p>Ask a question about the Leakdown CLI.</p>
                <ul>
                  {EXAMPLES.map((e) => (
                    <li key={e}>
                      <button type="button" onClick={() => send(e)}>
                        {e}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {turns.map((t, i) => (
              <div className="ask-turn" key={i}>
                <p className="ask-q">{t.q}</p>

                {t.state === "asking" && (
                  <p className="ask-wait" role="status">
                    Reading the docs…
                  </p>
                )}

                {t.state === "error" && <p className="ask-err">{t.error}</p>}

                {t.state === "done" && t.reply && (
                  <div className="ask-a">
                    <p className={`ask-verdict is-${t.reply.verdict}`}>
                      {t.reply.label}
                      {t.reply.verdict !== "absent" && t.reply.answer && <em>{Math.round(t.reply.answer.prob * 100)}% of the weight on this block</em>}
                    </p>

                    {t.reply.verdict === "absent" ? (
                      <p className="ask-none">
                        Nothing in the docs or the CLI repo answers this, so there is nothing to quote.
                        {t.reply.router && <> The closest page is {t.reply.router.choice}.</>}
                      </p>
                    ) : (
                      t.reply.answer && (
                        <>
                          <Crumb hit={t.reply.answer} />
                          <div className="ask-quote">
                            <Md text={t.reply.answer.text} skipFirstHeading />
                          </div>
                        </>
                      )
                    )}

                    {t.reply.supporting.length > 0 && (
                      <details className="ask-more">
                        <summary>{t.reply.supporting.length} more passage{t.reply.supporting.length > 1 ? "s" : ""} on this</summary>
                        {t.reply.supporting.map((s) => (
                          <div className="ask-sup" key={s.block_id}>
                            <Crumb hit={s} />
                            <div className="ask-quote">
                              <Md text={s.text} skipFirstHeading />
                            </div>
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            className="ask-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(q);
            }}
          >
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question about the CLI"
              aria-label="Your question"
              autoComplete="off"
              maxLength={400}
            />
            <button type="submit" disabled={busy || !q.trim()}>
              {busy ? "…" : "Ask"}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
