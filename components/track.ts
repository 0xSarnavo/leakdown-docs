"use client";

import posthog from "posthog-js";

/**
 * The few events worth having: did someone leave for GitHub, and did they take
 * a command with them.
 *
 * Deliberately small. Page views already say where people went; these say what
 * they did at the end of it, which is the only part the funnel cannot infer.
 *
 * Nothing fires unless analytics were allowed — `posthog.__loaded` is false
 * until consent, so a declined visitor sends nothing here either. Wrapped, so a
 * tracking failure can never break the click it is attached to.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !posthog.__loaded) return;
    posthog.capture(event, { ...props, surface: window.location.hostname, path: window.location.pathname });
  } catch {
    /* never let a metric break a page */
  }
}

/** Left for the repository — the last step before someone installs it. */
export const trackRepo = (where: string) => track("repo_opened", { where });

/** Took a command away with them; `what` says which one. */
export const trackCopy = (what: string) => track("command_copied", { what });
