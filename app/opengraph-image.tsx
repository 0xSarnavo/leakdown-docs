import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { dropSvg } from "../lib/og-drop";

/* The card behind every shared docs link.

   Generated, not a checked-in JPEG: the docs have no art of their own, and a
   file would drift from the mark the moment either changed. Next serves it at
   /opengraph-image and stamps the URL into the og:image tag for every page that
   inherits app/layout.tsx.

   It is the marketing site's card with the headline swapped, deliberately: the
   two sites share a domain in people's heads and should share one in a feed.
   Same drop, same ground, same serif over mono. The fonts are read off disk as
   TrueType because satori cannot parse the woff2 the site itself ships. */
export const alt = "Leakdown Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (file: string) => readFileSync(join(process.cwd(), "public", "fonts", file));

export default function Image() {
  const drop = dropSvg({ pitch: 3.1 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#101012",
          color: "#F1EDE1",
          padding: "0 72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div
            style={{
              fontFamily: "Newsreader",
              fontSize: 82,
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Leakdown</span>
            <span>documentation.</span>
          </div>
          <div
            style={{
              fontFamily: "Plex",
              fontSize: 21,
              letterSpacing: "0.16em",
              color: "#B9B2A2",
              marginTop: 40,
              display: "flex",
            }}
          >
            DOCS.LEAKDOWN.DEV
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={drop} alt="" width={340} height={480} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: font("newsreader-light.ttf"), weight: 300, style: "normal" },
        { name: "Plex", data: font("plexmono-regular.ttf"), weight: 400, style: "normal" },
      ],
    },
  );
}
