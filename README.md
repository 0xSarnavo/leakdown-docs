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
npm run eval:ask -- --local-only       # BM25 recall + no-LLM audit, zero API calls
TYPESAFE_API_KEY=... npm run eval:ask -- --live   # 36 model calls
```

`--live` requires 95% verdict accuracy, 85% top-1 and **100% abstention**, and exits
nonzero otherwise. The audit fails the run if any file imports a generative or
embedding library — that is what keeps "it never writes an answer" honest.

Thresholds in `lib/ask.ts` are tuned on the gold set, not per question. Retune with
`--live` after a rebuild.

### Deploy

`TYPESAFE_API_KEY` must be set on the server (Railway → Variables). It is read only
in the route handler, never sent to the browser, and the panel calls `/api/ask`
same-origin so the strict nonce CSP in `proxy.ts` is unchanged. Without the key the
site serves normally and the panel reports that ask is not configured.
