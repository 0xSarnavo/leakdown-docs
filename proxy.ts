import { NextRequest, NextResponse } from "next/server";

// CSP-nonce tradeoff (why nonce, not unsafe-inline):
// App Router streams React Flight data via inline <script> tags it injects at
// render time. A static `script-src 'self'` alone would block those and break
// hydration, while `'unsafe-inline'` would bless EVERY inline script —
// including injected ones. The middle path is a per-request nonce: the server
// mints unguessable entropy, advertises it in the CSP response header, and
// passes it to server components via the `x-nonce` request header so any
// first-party inline script/style we add later can carry the matching nonce.
// The nonce is CSP entropy, never a client identifier: the docs site has no API
// keeps keying on the FIRST entry of `x-forwarded-for` per 03-01-PARITY.md,
// and no cookie is ever set (see verify below).
// No matcher config: the proxy (Next 16 name for middleware) runs on ALL routes, including /api/* (03-03
// inherits this shell unchanged).
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16)),
  ).toString("base64");

  const csp = [
    "default-src 'self'",
    "img-src 'self' data:",
    `style-src 'self' 'nonce-${nonce}'`,
    `script-src 'self' 'nonce-${nonce}'`,
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  // let Next stamp the nonce onto its inline Flight scripts at render time
  // (getScriptNonceFromHeader reads the *request* CSP header; response-only
  // leaves every bootstrap without a nonce and hydration silently dies)
  headers.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set(
    "referrer-policy",
    "strict-origin-when-cross-origin",
  );
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  // belt and braces for the frame-ancestors directive on browsers that predate CSP2
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  return response;
}
