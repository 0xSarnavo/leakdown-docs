/* Print the mark as ASCII, from the same geometry the logo and favicon use.

     npm run ascii

   The CLI has no business importing brand geometry, so it carries the output as
   a constant — but the constant has to come from somewhere, and "somebody drew
   it by hand once" is how the favicon drifted to 55 dots while the logo showed
   69. Run this and paste, and the three marks stay the same mark. */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { MARK_DOTS, MARK_BOX } = await import(pathToFileURL(path.join(ROOT, "lib", "mark.ts")).href);

// Five weights standing in for dot radius, so the light from the top left
// survives the trip into monospace.
const RAMP = [".", ":", "o", "O", "@"];

const xs = [...new Set(MARK_DOTS.map((d) => d.x))].sort((a, b) => a - b);
const rows = [...new Set(MARK_DOTS.map((d) => d.row))].sort((a, b) => a - b);
const rMin = Math.min(...MARK_DOTS.map((d) => d.r));
const rMax = Math.max(...MARK_DOTS.map((d) => d.r));

const lines = rows.map((row) => {
  let s = "";
  for (const x of xs) {
    const d = MARK_DOTS.find((c) => c.row === row && c.x === x);
    // a space per empty cell, doubled: characters are about twice as tall as
    // they are wide, so one dot has to be two columns or the drop goes oval
    if (!d) { s += "  "; continue; }
    const t = (d.r - rMin) / (rMax - rMin || 1);
    s += RAMP[Math.min(RAMP.length - 1, Math.round(t * (RAMP.length - 1)))] + " ";
  }
  return s.replace(/\s+$/, "");
});
lines.push(" ".repeat(xs.indexOf(MARK_BOX.dripX) * 2) + "."); // the drip, mid-fall

console.log(lines.join("\n"));
console.error(`\n(${MARK_DOTS.length} dots + drip, ${xs.length} columns)`);
