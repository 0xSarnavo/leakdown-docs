import { ImageResponse } from "next/og";

/* The card behind every shared docs link. Generated, not a checked-in JPEG:
   the docs have no art of their own, and a file would drift from the wordmark
   the moment either changed. Next serves it at /opengraph-image and stamps the
   URL into the og:image tag for every page that inherits app/layout.tsx.

   No custom font is loaded on purpose. Fetching one at render turns a card into
   a build-time network dependency, and the system stack renders identically
   enough at 1200x630 to not be worth the failure mode. */
export const alt = "Leakdown Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "#0b0c0e",
          color: "#f3f4f6",
        }}
      >
        <div style={{ fontSize: 34, color: "#8b8f97", letterSpacing: 1 }}>LEAKDOWN</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 18, lineHeight: 1.1 }}>Documentation</div>
        <div style={{ fontSize: 34, color: "#b8bcc4", marginTop: 26, maxWidth: 900, lineHeight: 1.35 }}>
          Install the CLI, run your first test, read the report, look up every flag.
        </div>
      </div>
    ),
    size,
  );
}
