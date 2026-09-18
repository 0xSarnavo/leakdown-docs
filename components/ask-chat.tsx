"use client";

import { useEffect, useRef, useState } from "react";
import HeroDrop from "./hero-drop";
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

type Turn = {
  q: string;
  state: "asking" | "done" | "error" | "said";
  reply?: Reply;
  error?: string;
  said?: "help" | "examples" | "unknown";
  vote?: "up" | "down" | "sent";
};

/* Why an answer missed, in the three ways it actually misses. Each maps to a
   different fix: a wrong paragraph is a ranking problem, "not in the docs" is
   usually a page that needs writing, and "not enough" is a chunk that got split
   away from what it needed. */
const REASONS: Array<[value: string, label: string]> = [
  ["wrong-paragraph", "Wrong paragraph"],
  ["not-in-docs", "Not in the docs"],
  ["too-thin", "Not enough detail"],
];

/* The vote is the only thing this page ever sends back about an answer, and it
   carries the question, the block and the scores — nothing about who asked. */
function Vote({ turn, onDone }: { turn: Turn; onDone: (v: "up" | "down" | "sent") => void }) {
  const send = (helpful: boolean, reason = "") => {
    onDone(helpful ? "sent" : "sent");
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: turn.q,
        helpful,
        reason,
        block_id: turn.reply?.answer?.block_id ?? null,
        verdict: turn.reply?.verdict ?? "",
        exists: turn.reply?.exists ?? null,
        fully: turn.reply?.fully ?? null,
      }),
    }).catch(() => {
      /* a lost vote is not worth telling anyone about */
    });
  };

  if (turn.vote === "sent") return <p className="ask-vote is-done">Thanks — that goes into the question set.</p>;

  if (turn.vote === "down") {
    return (
      <div className="ask-vote">
        <span>What went wrong?</span>
        {REASONS.map(([value, label]) => (
          <button key={value} type="button" onClick={() => send(false, value)}>
            {label}
          </button>
        ))}
        <button type="button" className="ask-vote-skip" onClick={() => send(false)}>
          Skip
        </button>
      </div>
    );
  }

  return (
    <div className="ask-vote">
      <span>{turn.reply?.verdict === "absent" ? "Was it right to say no?" : "Did that answer it?"}</span>
      <button type="button" onClick={() => send(true)} aria-label="Yes">
        Yes
      </button>
      <button type="button" onClick={() => onDone("down")} aria-label="No">
        No
      </button>
    </div>
  );
}

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
      <section className="askhero">
        <div className="askhero-stage" aria-hidden="true">
          <HeroDrop />
        </div>
        <h2>
          Ask the docs <span>anything</span>
        </h2>
        <p className="askhero-sub">Exact paragraphs, their source, and a straight no when the docs do not cover it.</p>
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
        <p className="askhero-foot">
          Powered by{" "}
          <a href="https://docs.typesafe.ai/models" target="_blank" rel="noreferrer noopener">
            Jev
          </a>{" "}
          <i aria-hidden="true">·</i> Exact paragraphs, no hallucinations <i aria-hidden="true">·</i> Leakdown is in alpha
        </p>
      </section>
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

                <Vote turn={t} onDone={(v) => setTurns((all) => all.map((x, n) => (n === i ? { ...x, vote: v } : x)))} />

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
