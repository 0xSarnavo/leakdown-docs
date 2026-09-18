"use client";

/**
 * Whether the visitor agreed to analytics.
 *
 * Nothing loads until they say yes. "No" is remembered as firmly as "yes", so a
 * decline is not re-asked on every page, and Do Not Track counts as a decline
 * without a banner: someone who set that header already answered the question.
 *
 * The answer lives in localStorage, which is first-party and carries no id.
 * Every read is wrapped: Safari in private mode throws on access, and a page
 * that cannot remember an answer must fall back to not tracking.
 */
export const CONSENT_KEY = "ld-analytics-consent";
export type Consent = "granted" | "denied" | null;

export function dnt(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { doNotTrack?: string; navigator: Navigator & { msDoNotTrack?: string } };
  return [w.navigator.doNotTrack, w.doNotTrack, w.navigator.msDoNotTrack].some((v) => v === "1" || v === "yes");
}

export function getConsent(): Consent {
  if (typeof window === "undefined") return null;
  if (dnt()) return "denied";
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return "denied"; // cannot remember a yes → do not act on one
  }
}

/** Records the answer and tells this tab's listeners, so the banner and the page agree. */
export function setConsent(v: Exclude<Consent, null>): void {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* private mode: the choice holds for this page view only */
  }
  window.dispatchEvent(new CustomEvent("ld-consent", { detail: v }));
}
