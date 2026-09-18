/* Leakdown mark: a teardrop made of halftone dots, the same drop as the hero.
   Dot size follows a light from the top left. The drop itself stays still; a
   drip gathers at its base, necks, and falls away. Hover
   glitches the rows, click (nav) bursts them. All CSS (.lm-*); still under
   reduced motion.

   The shape itself lives in lib/mark.ts, shared with the favicon generator. */

import { DROP_R, MARK_BOX, MARK_DOTS } from "../lib/mark";

export { MARK_BOX, MARK_DOTS };
export type { Dot } from "../lib/mark";

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
          <circle className="lm-drop" cx={MARK_BOX.dripX} cy={MARK_BOX.dripY} r={DROP_R} />
        )}
      </g>
    </svg>
  );
}
