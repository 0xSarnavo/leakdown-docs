"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import posthog from "posthog-js";
import { getConsent } from "./consent";
import ConsentBanner from "./consent-banner";

/* Traffic, funnels and session replay, through PostHog.

   Everything talks to /ingest on this origin, never to posthog.com. That is not
   about ad blockers: proxy.ts sends `script-src 'self'` and `connect-src 'self'`
   with a per-request nonce, so a third-party script tag and a cross-origin beacon
   are both refused by the browser. next.config.mjs rewrites /ingest to PostHog
   server-side, which keeps the CSP exactly as strict as it was — no new origin is
   trusted, and the analytics work.

   Nothing is sent from anywhere but the real hosts — see HOSTS below. */
/* The project token is write-only and public by design — PostHog ships it in the
   client bundle of every site that uses them, and it cannot read anything back.
   Hardcoding it keeps the deploy from depending on an env var somebody forgets
   to set on one of the two Vercel projects; the env var still wins if present,
   which is how you would point a fork at a different project. */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_pBLWnRUuF6S64en6b6eeCQjysWdbuKjND3RUSX9KxiCP";

/* Only the real hosts report. Without this, `npm run dev` and every preview
   deploy would file their pageviews next to real ones, and the first funnel
   anyone builds would be measuring us reloading localhost. */
const HOSTS = new Set(["docs.leakdown.dev", "www.leakdown.dev", "leakdown.dev"]);
const live = () => typeof window !== "undefined" && HOSTS.has(window.location.hostname);

function Pageviews() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!KEY || !live() || !posthog.__loaded) return;
    // App Router never reloads the document, so PostHog's own pageview capture
    // fires once and then never again. Send them ourselves on every navigation.
    const qs = params.toString();
    posthog.capture("$pageview", { $current_url: window.location.origin + pathname + (qs ? `?${qs}` : "") });
  }, [pathname, params]);

  return null;
}

export default function Analytics() {
  /* Nothing loads until the visitor agrees.
     A cookie and a session recording are not something to take first and
     explain afterwards, so init() waits for "granted" — from a stored answer,
     or from the banner in this same page view. Do Not Track counts as a no. */
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const read = () => setOk(getConsent() === "granted");
    read();
    const onChange = () => read();
    window.addEventListener("ld-consent", onChange);
    window.addEventListener("storage", onChange); // another tab answered
    return () => {
      window.removeEventListener("ld-consent", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    if (!ok || !KEY || !live() || posthog.__loaded) return;
    posthog.init(KEY, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      // we send them from Pageviews, which sees client-side navigation too
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: true,
      disable_session_recording: false,
    });
  }, [ok]);

  // useSearchParams needs a Suspense boundary or it opts the whole tree out of
  // static rendering, which would turn every prerendered doc page dynamic.
  return (
    <>
      <ConsentBanner />
      {ok ? (
        <Suspense fallback={null}>
          <Pageviews />
        </Suspense>
      ) : null}
    </>
  );
}
