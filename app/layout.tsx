import type { Metadata } from "next";
import "./globals.css";
import Topbar from "../components/topbar";
import Sidebar from "../components/sidebar";
import Search from "../components/search";
import Ask from "../components/ask";
import Analytics from "../components/analytics";
import { SITE_URL } from "../lib/site";

const DESCRIPTION = "Install the Leakdown CLI, run your first test, read the report, and look up every flag.";

/* openGraph and twitter are inherited by every page, so a shared docs link
   renders as a card instead of a bare URL. Per-page metadata overrides `title`
   and `description` and the card follows, because Next merges the two — the
   image is the only part that has to be stated once, here. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Leakdown Docs",
  description: DESCRIPTION,
  openGraph: {
    title: "Leakdown Docs",
    description: DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "Leakdown Docs",
  },
  twitter: { card: "summary_large_image", title: "Leakdown Docs", description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="auto">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div className="progress" aria-hidden="true">
          <i />
        </div>
        <Topbar />
        <div className="shell">
          <Sidebar />
          <main id="main">{children}</main>
        </div>
        <Search />
        <Ask />
        <Analytics />
      </body>
    </html>
  );
}
