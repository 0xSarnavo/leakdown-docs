"use client";

import { useEffect, useRef } from "react";

/* The hero drop, copied from leakdown-website so /ask opens with the same
   object the marketing site does. A teardrop drawn as a halftone dot field
   (same language as the site's dot grids and the logo mark). Dot size follows a
   soft light from the top left, a slow ripple runs through it, the whole drop
   wobbles and bobs like liquid while purple water gathers at its tip, necks
   down, lets go, and falls away. Canvas, pauses offscreen / on a hidden tab,
   one still frame under reduced motion. Colours come from the theme tokens, so
   it follows light and dark here without changes.

   Keep in step with leakdown-website/components/hero-drop.tsx.

   `measure()` looks for the website hero's `.l2gap` and `.sub` to slide the drop
   into the headline gap. Neither exists here, so dx falls back to 0 (centred)
   and the drip runs its full length — which is what this page wants. It does
   need a <section> ancestor, which .askhero provides. */

const GAP = 8.5; // dot pitch, css px
const LIGHT = (() => {
  const v = [-0.45, -0.62, 0.64];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / l);
})();

export default function HeroDrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const canvas: HTMLCanvasElement = cv;
    const g: CanvasRenderingContext2D = ctx;
    let w = 0;
    let h = 0;
    let ink = "#f1ede1";
    let accent = "#9d7bf5";
    let raf = 0;
    let visible = true;
    let lastColor = 0;
    let drip: { t0: number; released?: boolean } | null = null;
    let fall: { y: number; vy: number; recoil: number; live?: boolean } | null = null;
    let nextDrop = 0;

    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }

    const readColors = () => {
      const cs = getComputedStyle(canvas);
      ink = cs.getPropertyValue("--ink").trim() || ink;
      accent = cs.getPropertyValue("--accent").trim() || accent;
    };

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // teardrop: circle at the bottom, cone to a point at the top
    const shape = () => {
      const R = Math.min(w * 0.4, h * 0.3);
      const cx = w / 2;
      const cy = h - R - h * 0.2; // room below for the drip
      const tipY = h * 0.03;
      const d = cy - tipY;
      const tan = R / Math.sqrt(Math.max(1, d * d - R * R));
      const joinY = cy - (R * R) / d; // where the cone's sides touch the circle
      return { R, cx, cy, tipY, tan, joinY };
    };

    // cursor: dots within REACH are pushed away, easing in and out
    const REACH = 70;
    let mx = -999;
    let my = -999;
    let pointerIn = false;
    let push = 0;
    // keep the pointer in page terms and map it onto the canvas every frame,
    // so scrolling under a still cursor moves the dent with the drop
    let cx0 = -9999;
    let cy0 = -9999;
    const place = () => {
      const r = canvas.getBoundingClientRect();
      mx = cx0 - r.left;
      my = cy0 - r.top;
      pointerIn = mx > -REACH && my > -REACH && mx < w + REACH && my < h + REACH;
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cx0 = e.clientX;
      cy0 = e.clientY;
      place();
    };
    const onLeave = () => {
      cx0 = cy0 = -9999;
      place();
    };
    if (!reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("scroll", place, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    // the drop slides sideways so its tip sits in the headline gap; the drip
    // fades out before it reaches the sub line
    let subY = Infinity; // top of the sub line, canvas px
    const measure = () => {
      const hero = canvas.closest("section");
      if (!hero) return;
      canvas.style.transform = "translateX(-50%)";
      const c = canvas.getBoundingClientRect();
      const gr = hero.querySelector<HTMLElement>(".l2gap")?.getBoundingClientRect();
      const sub = hero.querySelector<HTMLElement>(".sub")?.getBoundingClientRect();
      subY = sub ? sub.top - c.top : Infinity;
      const dx = gr && gr.width > 0 ? gr.left + gr.width / 2 - (c.left + c.width / 2) : 0;
      canvas.style.transform = `translateX(calc(-50% + ${dx.toFixed(1)}px))`;
      canvas.parentElement?.style.setProperty("--hd-dx", `${dx.toFixed(1)}px`); // callouts follow the drop
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);

    const draw = (now: number) => {
      g.clearRect(0, 0, w, h);
      const { R, cx, cy: cy0, tipY, tan: tan0, joinY: join0 } = shape();
      // the whole drop breathes: a slow bob plus squash and stretch
      const t = now * 0.0011;
      const m = reduced ? 0 : Math.sin(t * 1.3);
      // the drop turns slowly on its axis: normals spin, so the light and the
      // surface bands travel across it
      const spin = reduced ? 0.6 : now * 0.00042;
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const cy = cy0 + m * R * 0.035;
      const sx = 1 + m * 0.035;
      const tan = tan0 * sx;
      const joinY = join0 + m * R * 0.035;
      const dripX = cx;
      const dripY = cy + R * (1 - m * 0.03);
      const floor = Math.min(h - 6, subY - 10);
      const cols = Math.floor(w / GAP);
      const rows = Math.floor(h / GAP);
      const ox = (w - (cols - 1) * GAP) / 2;
      g.fillStyle = ink;
      for (let j = 0; j < rows; j++) {
        const y = j * GAP + GAP / 2;
        for (let i = 0; i < cols; i++) {
          const x = ox + i * GAP;
          const dx = (x - cx) / sx;
          const dy = y - cy;
          // liquid edge: the radius wobbles around the rim
          const ang = Math.atan2(dy, dx);
          const rr = reduced ? R : R * (1 + 0.03 * Math.sin(3 * ang + t * 1.7) + 0.018 * Math.sin(5 * ang - t * 2.3));
          // soft edge: rim dots grow and shrink with the wobble instead of popping
          const dc = Math.hypot(dx, dy);
          const inCircle = dc <= rr;
          const inCone = y >= tipY && y <= joinY && Math.abs(dx) <= (y - tipY) * tan;
          const edge = Math.max(rr + GAP * 0.5 - dc, y >= tipY && y <= joinY ? (y - tipY) * tan + GAP * 0.5 - Math.abs(dx) : -1);
          if (edge <= 0) continue;
          const soft = Math.min(1, edge / GAP);
          // surface normal: sphere below, rounded cone above
          let nx = dx / R;
          let ny = dy / R;
          if (!inCircle) {
            const half = Math.max(1, (y - tipY) * tan);
            nx = dx / half;
            ny = -0.35;
          }
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          // rotate the normal about the vertical axis
          const rx = nx * cs + nz * sn;
          const rz = -nx * sn + nz * cs;
          // key light turns with the drop; a soft front fill keeps the far side from going black
          const lit0 = Math.max(0, rx * LIGHT[0] + ny * LIGHT[1] + rz * LIGHT[2]) * 0.72 + nz * 0.3;
          // longitude bands ride the turn; a highlight sweeps past the front
          const lon = Math.atan2(nx, nz) + spin;
          const band = 0.5 + 0.5 * Math.cos(lon * 5);
          const shine = Math.max(0, Math.cos(lon * 1 - 0.9)) ** 8 * nz;
          const lit = Math.min(1, lit0 * (0.78 + 0.22 * band) + shine * 0.35);
          const rim = Math.max(0, 1 - nz) ** 3;
          const ripple = reduced ? 0 : Math.sin(t * 2 + (x * 0.6 + y) * 0.035) * 0.18;
          const r = (0.75 + lit * 2.05 + rim * 0.7 + ripple) * soft;
          if (r <= 0.3) continue;
          g.globalAlpha = Math.min(1, 0.38 + lit * 0.62);
          let px = x;
          let py = y;
          if (push > 0.01) {
            const ex = x - mx;
            const ey = y - my;
            const dd = Math.hypot(ex, ey);
            if (dd < REACH && dd > 0.001) {
              const f = (1 - dd / REACH) ** 2 * 16 * push;
              px += (ex / dd) * f;
              py += (ey / dd) * f;
            }
          }
          g.beginPath();
          g.arc(px, py, r, 0, Math.PI * 2);
          g.fill();
        }
      }

      // one drip at a time: water gathers under the base, necks down, lets go,
      // falls and fades. The neck recoils after release. No splash.
      const dt = Math.min(48, now - (lastColor || now)) / 16;
      push += ((pointerIn ? 1 : 0) - push) * Math.min(1, 0.12 * dt);
      g.fillStyle = accent;
      const bx = dripX;
      const by = dripY - 3;
      const blob = (neckW: number, cyB: number, r: number) => {
        g.beginPath();
        g.moveTo(bx - neckW, by);
        g.quadraticCurveTo(bx - neckW * 0.35, cyB - r * 0.9, bx - r, cyB);
        g.arc(bx, cyB, r, Math.PI, 0, true);
        g.quadraticCurveTo(bx + neckW * 0.35, cyB - r * 0.9, bx + neckW, by);
        g.closePath();
        g.fill();
      };
      const ease = (v: number) => v * v * (3 - 2 * v);
      // the neck stretches and the drop falls only as far as the room allows
      const room = Math.max(8, floor - by);
      const neck = Math.min(15, room * 0.3);
      const relY = by + 5.5 + neck;
      if (reduced) {
        g.globalAlpha = 1;
        blob(5, by + 5, 4);
      } else {
        if (!drip && now >= nextDrop) drip = { t0: now };
        if (drip) {
          const e = now - drip.t0;
          g.globalAlpha = 1;
          if (e < 1500) {
            const k = ease(e / 1500);
            blob(2 + 4.5 * k, by + 1.5 + 4 * k, 1 + 3.6 * k);
          } else if (e < 2000) {
            const k = ease((e - 1500) / 500);
            blob(6.5 - 5 * k, by + 5.5 + neck * k, 4.6 - 0.4 * k);
          } else {
            if (!drip.released) {
              drip.released = true; // exactly one falling drop per drip
              fall = { y: relY, vy: 0.6, recoil: 0 };
            }
            const q = Math.min(1, (e - 2000) / 320);
            if (q < 1) blob(1.5 * (1 - q) + 0.5, by + 3 * (1 - ease(q)), 1.8 * (1 - q) + 0.2);
            if (e > 2600 && !fall) drip = null;
          }
        }
        if (fall) {
          fall.vy += (room < 60 ? 0.05 : 0.17) * dt;
          fall.y += fall.vy * dt;
          fall.live = fall.y < floor;
          const fadeSpan = Math.max(6, Math.min(90, floor - relY));
          const fadeFrom = floor - fadeSpan;
          const alpha = fall.y < fadeFrom ? 1 : Math.max(0, 1 - (fall.y - fadeFrom) / fadeSpan);
          const st = 1 + Math.min(0.5, fall.vy * 0.045);
          g.globalAlpha = alpha;
          g.beginPath();
          g.ellipse(bx, fall.y, 4.2 / Math.sqrt(st), 4.2 * st, 0, 0, Math.PI * 2);
          g.fill();
          if (!fall.live) {
            fall = null;
            if (!drip) nextDrop = now + 350 + Math.random() * 450;
          }
        }
      }
      g.globalAlpha = 1;
      lastColor = now;
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const sync = () => {
      const on = visible && document.visibilityState !== "hidden" && !reduced;
      if (on && !raf) raf = requestAnimationFrame(loop);
      if (!on && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    readColors();
    size();
    draw(performance.now());
    const ro = new ResizeObserver(() => {
      size();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(canvas);
    // theme toggles flip the tokens
    const mo = new MutationObserver(() => {
      readColors();
      if (reduced) draw(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", place);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <canvas className="hd" ref={ref} aria-hidden="true" />;
}
