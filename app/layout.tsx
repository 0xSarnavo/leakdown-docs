import type { Metadata } from "next";
import "./globals.css";
import Topbar from "../components/topbar";
import Sidebar from "../components/sidebar";
import Search from "../components/search";
import Ask from "../components/ask";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Leakdown Docs",
  description: "Install the Leakdown CLI, run your first test, read the report, and look up every flag.",
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
      </body>
    </html>
  );
}
