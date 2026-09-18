/* Write app/icon.svg from lib/mark.ts — the same geometry the topbar logo uses.

   Run it after any change to the mark:
     npm run icon           # writes app/icon.svg
     npm run icon -- --check  # fails if the committed icon is stale (no write)

   Next serves app/icon.svg as the favicon automatically. */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app", "icon.svg");
const CHECK = process.argv.includes("--check");

const { MARK_DOTS, MARK_BOX, DROP_R } = await import(pathToFileURL(path.join(ROOT, "lib", "mark.ts")).href);

// Body plus the drop at rest: the mark reads as a teardrop mid-drip, which is
// the thing the brand is named for.
const circles = [...MARK_DOTS.map((d) => ({ x: d.x, y: d.y, r: d.r })), { x: MARK_BOX.dripX, y: MARK_BOX.dripY, r: DROP_R }];

/* A square box centred on the mark's own axis. Derived rather than hardcoded so
   the frame follows the shape if the geometry ever changes. */
const pad = 4;
const top = Math.min(...circles.map((c) => c.y - c.r)) - pad;
const bottom = Math.max(...circles.map((c) => c.y + c.r)) + pad;
const side = bottom - top;
const minX = MARK_BOX.dripX - side / 2;
const box = [minX, top, side, side].map((n) => +n.toFixed(2)).join(" ");

// Brand purple, light and dark. Shared with leakdown-website's icon.
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">\n` +
  `  <style>g{fill:#6d28d9}@media (prefers-color-scheme:dark){g{fill:#a78bfa}}</style>\n` +
  `  <g>` +
  circles.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="${c.r}"/>`).join("") +
  `</g>\n</svg>\n`;

if (CHECK) {
  const have = readFileSync(OUT, "utf8");
  if (have !== svg) {
    console.error("FAIL: app/icon.svg is stale — the favicon no longer matches the logo.");
    console.error("      run: npm run icon");
    process.exit(1);
  }
  console.log(`app/icon.svg matches the mark (${circles.length} dots)`);
} else {
  writeFileSync(OUT, svg);
  console.log(`app/icon.svg <- ${circles.length} dots, viewBox "${box}", ${svg.length} bytes`);
}
