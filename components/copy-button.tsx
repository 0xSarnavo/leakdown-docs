"use client";

import { useRef, useState } from "react";
import { trackCopy } from "./track";

/* Copies the text of the element with id `target`. Shows a check for 1.4s. */
export default function CopyButton({ target }: { target: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number | undefined>(undefined);
  const onClick = async () => {
    const txt = document.getElementById(target)?.textContent?.trim() ?? "";
    let next: "ok" | "fail" = "fail";
    try {
      if (txt && navigator.clipboard) {
        await navigator.clipboard.writeText(txt);
        next = "ok";
      }
    } catch {
      next = "fail";
    }
    if (next === "ok") trackCopy(target);
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1400);
  };
  return (
    <button
      className={`copy${state === "ok" ? " is-ok" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={state === "ok" ? "Copied" : state === "fail" ? "Copy failed" : "Copy"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {state === "ok" ? (
          <path d="M20 6L9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
    </button>
  );
}
