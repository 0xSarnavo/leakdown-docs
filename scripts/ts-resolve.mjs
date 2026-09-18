/* Let plain node import the app's own modules.

   lib/*.ts uses extensionless relative imports ("./bm25"), which the bundler
   resolves and node does not. This hook appends .ts, so scripts/ can run the
   REAL lib/ask.ts rather than a copy of it that can quietly drift out of step
   with what the route actually does.

   Used as: node --experimental-strip-types --import ./scripts/ts-resolve.mjs … */
import { register } from "node:module";

if (!process.env.__TS_RESOLVE__) {
  process.env.__TS_RESOLVE__ = "1";
  register("./ts-resolve-hook.mjs", import.meta.url);
}
