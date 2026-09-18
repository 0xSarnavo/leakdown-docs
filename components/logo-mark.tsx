/* Leakdown mark: a teardrop made of halftone dots, the same drop as the hero.
   Dot size follows a light from the top left. The drop itself stays still; a
   drip gathers at its base, necks, and falls away. Hover
   glitches the rows, click (nav) bursts them. All CSS (.lm-*); still under
   reduced motion. */

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

export default function LogoMark({ className, animate = true }: { className?: string; animate?: boolean }) {
  return (
    <svg
      className={`${className ?? ""}${animate ? " lm-live" : ""}`}
      viewBox={`0 0 ${MARK_BOX.w} ${MARK_BOX.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <g className="lm-body">
          {MARK_DOTS.map((d) => (
            <circle
              key={`${d.x}-${d.y}`}
              className={`lm-row lm-r${d.row}${d.row % 2 ? " lm-odd" : ""}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
            />
          ))}
        </g>
        {animate && (
          <circle className="lm-drop" cx={MARK_BOX.dripX} cy={MARK_BOX.dripY} r="3.6" />
        )}
      </g>
    </svg>
  );
}
