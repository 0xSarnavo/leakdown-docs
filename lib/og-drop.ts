/* The hero's drop, as a still SVG, for the share cards.

   The marketing site's hero draws this shape on a canvas and lib/mark.ts builds
   it at a 9px pitch for the logo and the favicon, where 69 chunky dots is the
   point. A share card sits between the two: big enough
   that the logo's dots would read as a logo rather than the hero's halftone, so
   this walks the same geometry at whatever pitch the card asks for.

   A copy of the marketing site's lib/og-drop.ts, the same way lib/mark.ts is a
   copy: two deploys, no shared package. The constants are the mark's.

   It returns a data URI rather than JSX because satori (behind next/og) renders
   an <img> through resvg, and a few hundred nested divs is a slower, worse way
   to say the same thing. Same constants as lib/mark.ts — if the drop's
   proportions ever change there, they change here. */

const CX = 45;
const CY = 70;
const R = 40;
const TIP = 12;
const BOX = { w: 90, h: 127 }; // body plus room for the whole drip under it
const LIGHT = [-0.45, -0.62, 0.64].map((v, _, a) => v / Math.hypot(a[0], a[1], a[2]));

export type DropOpts = {
  /** dot pitch in the 90-wide viewBox; smaller is finer. 9 is the logo. */
  pitch?: number;
  /** the dots */
  ink?: string;
  /** the drip gathering at the base */
  accent?: string;
};

export function dropSvg({ pitch = 3.1, ink = "#F1EDE1", accent = "#9d7bf5" }: DropOpts = {}): string {
  const d = CY - TIP;
  const tan = R / Math.sqrt(d * d - R * R);
  const joinY = CY - (R * R) / d;
  const scale = pitch / 9; // the mark's radii are tuned for a 9px pitch
  const dots: string[] = [];

  for (let y = TIP; y <= CY + R; y += pitch) {
    for (let x = CX % pitch; x <= BOX.w; x += pitch) {
      const dx = x - CX;
      const dy = y - CY;
      const inCircle = dx * dx + dy * dy <= R * R;
      const inCone = y >= TIP && y <= joinY && Math.abs(dx) <= (y - TIP) * tan;
      if (!inCircle && !inCone) continue;
      // surface normal: sphere below, rounded cone above
      let nx = dx / R;
      let ny = dy / R;
      if (!inCircle) {
        nx = dx / Math.max(1, (y - TIP) * tan);
        ny = -0.35;
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const r = scale * Math.min(4.35, 2.4 + lit * 2.2);
      // the same alpha ramp the canvas uses, so the lit side reads as lit
      const o = Math.min(1, 0.34 + lit * 0.6);
      dots.push(
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" opacity="${o.toFixed(2)}"/>`,
      );
    }
  }

  // the drip, caught mid-gather under the base: the card's one spot of purple.
  // A neck that narrows into a round head — the shape the canvas draws just
  // before it lets go. Keep it clear of BOX.h or the head renders clipped flat.
  const by = CY + R + 1;
  const hy = by + 7; // centre of the head
  const hr = 4.6;
  const drip =
    `<path fill="${accent}" d="M${CX - 2.4} ${by}` +
    ` C${CX - 2.4} ${by + 2.6} ${CX - hr} ${hy - 3.4} ${CX - hr} ${hy}` +
    ` A${hr} ${hr} 0 0 0 ${CX + hr} ${hy}` +
    ` C${CX + hr} ${hy - 3.4} ${CX + 2.4} ${by + 2.6} ${CX + 2.4} ${by} Z"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX.w} ${BOX.h}" width="${BOX.w}" height="${BOX.h}">` +
    `<g fill="${ink}">${dots.join("")}</g>${drip}</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const DROP_ASPECT = BOX.w / BOX.h;
