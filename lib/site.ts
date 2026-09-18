/* The public origin of the docs site, in one place.

   Canonicals, the sitemap, robots, the "open this page in an AI" links and the
   corpus the model quotes from all need an absolute URL, and every one of them
   used to spell the domain out. Moving hosts meant finding seven of them and
   regenerating the corpus by hand — which is how the site ended up advertising
   a domain that no longer resolved.

   A plain constant, not an env var: page-actions.tsx is a client component, and
   Next only inlines NEXT_PUBLIC_* into the browser bundle, so a non-prefixed
   env var would read as the default there and as the override on the server —
   the same page claiming two different origins. The corpus script keeps its own
   DOCS_PUBLIC escape hatch, where the value is only ever read on the server.

   Changing domains is this line, then `npm run corpus` to rewrite block URLs. */
export const SITE_URL = "https://docs.leakdown.dev";
