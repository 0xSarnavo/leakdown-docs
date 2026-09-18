"use client";

import { useEffect, useRef, useState } from "react";
import Md from "./md";

/* The conversation itself, shared by the panel (components/ask.tsx) and the
   full page (app/ask/page.tsx). One implementation, so an answer looks and
   behaves the same wherever you asked it from.

   What comes back is not written by a model. A block of the docs is chosen and
   shown exactly as published, with the page it came from; when nothing answers
   the question the panel says so and shows nothing else. That is the point of
   it, so this never renders an answer and a doubt in the same breath. */

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

type Turn = { q: string; state: "asking" | "done" | "error" | "said"; reply?: Reply; error?: string; said?: "help" | "examples" | "unknown" };

const EXAMPLES = ["How do I install it?", "What does exit code 2 mean?", "How do I run a goal test in CI?"];

/* Typed commands, not a menu: this is a text box, so the things you can do to
   it should be typeable too. Handled here and never sent to the model. */
const COMMANDS: Array<[name: string, does: string]> = [
  ["/clear", "start over — forget everything above"],
  ["/examples", "show the example questions again"],
  ["/help", "this list"],
];

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

export default function AskChat({ page = false, autoFocus = false }: { page?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.state === "asking");

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  // keep the newest turn in view as answers arrive
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send(question: string) {
    const query = question.trim();
    if (!query || busy) return;
    setQ("");

    // a command acts on the conversation; it is never a question for the docs
    if (query.startsWith("/")) {
      const name = query.split(/\s+/)[0].toLowerCase();
      if (name === "/clear") {
        setTurns([]);
        return;
      }
      const said = name === "/help" ? "help" : name === "/examples" ? "examples" : "unknown";
      setTurns((t) => [...t, { q: query, state: "said", said }]);
      return;
    }

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

  const dock = (
    <div className={page ? "ask-dock is-page" : "ask-dock"}>
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
          placeholder={page ? "Ask anything about the CLI" : "Ask a question about the CLI"}
          aria-label="Your question"
          autoComplete="off"
          maxLength={400}
        />
        <button type="submit" disabled={busy || !q.trim()} aria-label="Ask">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
      <p className="ask-hint">
        Answers are copied from the docs, never written. Type <code>/help</code> for commands.
      </p>
    </div>
  );

  /* Nothing asked yet, on the page: the question is the only thing on screen,
     centred, the way every chat does it. Once there is a conversation the
     composer drops to the bottom and the answers take the room. */
  if (page && !turns.length) {
    return (
      <div className="askstart">
        <h2>What do you want to know?</h2>
        {dock}
        <ul className="askstart-eg">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <button type="button" onClick={() => send(e)}>
                {e}
              </button>
            </li>
          ))}
        </ul>
        <p className="askstart-note">
          Not a chatbot. Every answer is a paragraph of these docs, copied word for word, with a link to where it came from —
          and when the docs do not cover your question it says so instead of guessing. <b>Alpha</b>: the paragraph is always
          real, but it may not be the one you wanted.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={page ? "ask-feed is-page" : "ask-feed"} ref={feed}>
        {!turns.length && (
          <div className="ask-empty">
            <p>{page ? "Try one of these, or ask your own." : "Ask a question about the Leakdown CLI."}</p>
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

            {t.state === "said" && t.said === "help" && (
              <div className="ask-sys">
                <b>Commands</b>
                <ul>
                  {COMMANDS.map(([name, does]) => (
                    <li key={name}>
                      <code>{name}</code>
                      <span>{does}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {t.state === "said" && t.said === "examples" && (
              <div className="ask-sys">
                <b>Try one of these</b>
                <ul>
                  {EXAMPLES.map((e) => (
                    <li key={e}>
                      <button type="button" className="ask-eg" onClick={() => send(e)}>
                        {e}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {t.state === "said" && t.said === "unknown" && (
              <p className="ask-sys">
                No such command. <code>/help</code> lists them.
              </p>
            )}

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
                    <summary>
                      {t.reply.supporting.length} more passage{t.reply.supporting.length > 1 ? "s" : ""} on this
                    </summary>
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
      {dock}
    </>
  );
}
