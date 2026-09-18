import type { Metadata } from "next";
import AskChat from "../../components/ask-chat";
import { SITE_URL } from "../../lib/site";

/* The full page: a conversation with the docs and nothing else on screen. The
   panel (components/ask.tsx) is the same conversation over a page you are
   already reading; this is for when the asking IS the task.

   The page says the least it can get away with. What matters before you type is
   one thing — that nothing here is written by a model — and everything else is
   learned faster by asking a question than by reading about asking questions.

   A static route, so it wins over app/[slug] without either knowing about the
   other, and it borrows the docs shell so it is the same site. */

// nonce CSP needs a request per render (see proxy.ts)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ask · Leakdown Docs",
  description: "Ask the Leakdown docs a question and get the paragraph that answers it, word for word.",
  alternates: { canonical: `${SITE_URL}/ask` },
};

export default function AskPage() {
  return (
    <div className="page is-wide is-chat">
      <article className="doc askpage">
        <AskChat page autoFocus />
      </article>
    </div>
  );
}
