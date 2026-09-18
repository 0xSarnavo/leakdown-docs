/* The corpus, as the server sees it. The JSON import lives here alone so that
   lib/ask.ts stays importable by plain node — which is what lets the tuner in
   scripts/ replay saved model answers through the real decision logic instead
   of a copy of it. */

import corpus from "./corpus.json";
import type { Block } from "./bm25";

export const BLOCKS = corpus.blocks as Block[];
export const BUILT_AT: string = corpus.built_at;
