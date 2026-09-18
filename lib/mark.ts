/* The Leakdown mark, as geometry.

   A teardrop of halftone dots, sized by a light from the top left. This file is
   the single source of that shape: components/logo-mark.tsx renders it in the
   page, scripts/build-icon.mjs renders it into app/icon.svg. The favicon drifted
   from the logo once already — 55 dots against the mark's 69 — because the two
   were drawn separately. Deriving both from here is what stops that happening
   again. No JSX in this file, so plain node can import it. */

export type Dot = { x: number; y: number; r: number; row: number };

const PITCH = 9;
const CX = 45;
const CY = 70;
const R = 40;
const TIP = 12;
const LIGHT = [-0.45, -0.62, 0.64].map((v, _, a) => v / Math.hypot(a[0], a[1], a[2]));

function build(): Dot[] {
  const d = CY - TIP;
  const tan = R / Math.sqrt(d * d - R * R);
  const joinY = CY - (R * R) / d;
  const out: Dot[] = [];
  for (let row = 0; row * PITCH + 4 <= CY + R; row++) {
    const y = row * PITCH + 4;
    for (let x = CX % PITCH; x <= 90; x += PITCH) {
      const dx = x - CX;
      const dy = y - CY;
      const inCircle = dx * dx + dy * dy <= R * R;
      const inCone = y >= TIP && y <= joinY && Math.abs(dx) <= (y - TIP) * tan;
      if (!inCircle && !inCone) continue;
      let nx = dx / R;
      let ny = dy / R;
      if (!inCircle) {
        nx = dx / Math.max(1, (y - TIP) * tan);
        ny = -0.35;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      // chunky dots: the mark has to hold up at 16-24px
      out.push({ x, y, r: +Math.min(4.35, 2.4 + lit * 2.2).toFixed(2), row });
    }
  }
  return out;
}

export const MARK_DOTS: Dot[] = build();
export const MARK_BOX = { w: 90, h: 136, dripX: CX, dripY: CY + R + 4, floor: 132 };
/* The drop at rest under the mark, drawn in the favicon and as the drip head in
   the animated logo. */
export const DROP_R = 3.6;
