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
