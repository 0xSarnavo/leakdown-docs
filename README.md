# leakdown-docs

The Leakdown documentation site, hosted on its own (docs.leakdown.ai), separate from `leakdown-website`.

```bash
npm ci
npm run dev      # http://localhost:3001
npm run build && npm start
```

- Pages are listed in `lib/nav.ts` (tabs, sidebar groups, search sections) and written in `content/*.tsx`.
- Facts come from `leakdown-cli` (README, AGENTS.md, `--help`, CHANGELOG). Update both when the CLI changes.
- Same strict nonce CSP as the website (`proxy.ts`): no inline styles, no third-party scripts.
- Every page is also served as markdown at `/<slug>.md` (`app/md/[slug]/route.ts` converts the rendered article), and `/llms.txt` lists them. "Copy page" and the Open in ChatGPT / Claude links beside each title use those.
- `/build-a-command` is an interactive command builder (`components/command-builder.tsx`).

## Ask the docs (alpha)

A launcher on every page, and an **Ask** button in the top bar, open a panel that
answers a question with the paragraph of the docs that answers it — copied word
for word, never written. When nothing covers the question it says so and shows
nothing else.

```
question -> BM25 over lib/corpus.json  (top 40 blocks, stdlib, ~0.1ms)
         -> ONE call to TypeSafe's Jev (a System One model, no LLM):
              Choice where   which block answers this
              Noul  exists   is it in the docs at all
              Noul  fully    does one block state it outright
              Choice router  which page covers this
         -> fully >= 0.7 answered | exists < 0.55 abstain | else partly covered
         -> that block verbatim + breadcrumb + up to 4 supporting passages
```

| Path | What |
|---|---|
| `app/api/ask/route.ts` | `POST /api/ask`, `GET /api/ask` (health). Holds the key; rate limited. |
| `lib/ask.ts` | The Jev call, verdict thresholds, the router tie-break |
| `lib/bm25.ts` | Tokenizer, index and shortlist — pure, so the eval can score it offline |
| `lib/corpus.json` | 155 blocks over 25 pages. Committed, so a deploy needs no build step. |
| `components/ask.tsx` | The panel. `components/md.tsx` renders a block. |
| `scripts/build-corpus.mjs` | Rebuilds the corpus from this site + `leakdown-cli` |
| `scripts/eval-ask.mjs` | Gold set of 36 queries, and the no-LLM audit |

### Rebuild the corpus

Run it whenever a docs page or the CLI's README/AGENTS/CHANGELOG/`--help` changes —
the corpus is committed, so an edit is not answerable until you do.

```bash
npm run dev                            # the builder reads this site's own /llms.txt
npm run corpus -- --check              # -> lib/corpus.json
```

### Verify

```bash
npm run typecheck
npm run eval:ask -- --local-only       # BM25 recall + the no-LLM audit, zero API calls
TYPESAFE_API_KEY=... npm run eval:ask -- --live   # the whole gold set through the real route
```

The gold set is 107 questions in `scripts/ask-gold.json`, tagged by the kind of
question they are, because the weaknesses are not evenly spread. Where the tuned
build stands:

| | |
|---|---|
| **exact** | 103/107 (96.3%) |
| top-1 block | 81/84 (96.4%) |
| abstention | 22/23 (95.7%) |
| paraphrase · terse · typo · internals · factual | 83% · 100% · 100% · 100% · 100% |

`exact` is the only number worth quoting: an unanswerable question is right only
if it abstained, an answerable one only if it led with a block the gold set
accepts. No partial credit. `--live` fails the run below those gates, and the
no-LLM audit fails it if any file imports a generative or embedding library.

Two things the gold set is careful about. Its `blocks` list every block that
would be a correct answer, not the one that reads best — a block goes in only if,
read alone, it states the answer. And a third of it is unanswerable on purpose,
half of those adjacent to something the docs *do* cover ("what is the SLA for a
requested run?"), because that is where abstention actually gets tested.

### Tuning

```bash
npm run tune:ask -- --collect   # one model call per gold question -> scripts/ask-dump.json
npm run tune:ask -- --sweep     # replays those answers through decide(), free
```

`decide()` in `lib/ask.ts` is pure, so a saved answer can be re-scored under any
thresholds without asking the model again: the sweep tries ~1400 combinations in
about a second. `scripts/ask-dump.json` is committed so the numbers above can be
reproduced without spending 1.5M tokens again. Re-collect after a corpus rebuild
or a change to the questions in `questionsFor`; correcting a *gold* entry needs no
re-collect, since the dump holds only what the model said.

Three findings from tuning, so they are not re-litigated:

- **Retrieval is not the bottleneck.** BM25 recall@40 is 100%, so the right block
  is always in front of the model. Sweeping `k1`/`b`/heading weight moved MRR by
  4% and `exact` by nothing — the shortlist is an unordered set of choices, so
  only recall matters. The defaults stand.
- **The shortlist cannot shrink.** Recall is 98.8% at 30 and 96.4% at 20, and the
  losses are paraphrases. 40 is the smallest size that keeps every answer.
- **A stricter `exists` wording made it worse.** It lowered unanswerable scores
  but lowered real ones further, narrowing the usable gap from 0.26 to 0.16.

One known failure is a documentation gap rather than a bug: "how much does
leakdown cost per run?" is answered from adjacent pages because the docs never
state what a run costs. A line saying so would fix the answer and the gap.

### Deploy

`TYPESAFE_API_KEY` must be set on the server (Vercel → Settings → Environment
Variables). It is read only in the route handler, never sent to the browser, and
the panel calls `/api/ask` same-origin, so the strict nonce CSP in `proxy.ts` is
unchanged. Without the key the site serves normally and the panel reports that ask
is not configured.

Next.js needs no `vercel.json` here, and `proxy.ts` (Next 16's name for middleware)
runs on Vercel, so the CSP still applies. Two things behave differently there than
on a single server:

- The rate limit in `app/api/ask/route.ts` counts per instance, not per address —
  see the comment there before relying on it as a budget.
- `/<slug>.md` renders by fetching its own page. With Deployment Protection on
  (the default for previews) that self-fetch is refused, so the `.md` routes, "Copy
  page" and `scripts/build-corpus.mjs` fail against a protected preview URL.
  Production is unaffected.
