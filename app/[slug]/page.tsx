import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTENT } from "../../lib/pages";
import { CLI_VERSION, DOC_PAGES, PAGES, REPO, isWide, neighbours, pageBySlug } from "../../lib/nav";
import Toc from "../../components/toc";
import PageActions from "../../components/page-actions";
import { SITE_URL } from "../../lib/site";

// nonce CSP needs a request per render (see proxy.ts)
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pageBySlug((await params).slug);
  if (!p) return {};
  return { title: `${p.title} · Leakdown Docs`, description: p.description, alternates: { canonical: `${SITE_URL}/${p.slug}` } };
}

export function generateStaticParams() {
  return DOC_PAGES.map((p) => ({ slug: p.slug }));
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  const Body = CONTENT[slug];
  if (!page || !Body) notFound();
  const { prev, next } = neighbours(slug);
  const wide = isWide(page.tab);
  // one group on the tab: the crumb would only repeat the tab name
  const crumb = new Set(PAGES.filter((p) => p.tab === page.tab).map((p) => p.group)).size > 1;
  return (
    <div className={wide ? "page is-wide" : "page"}>
      <article className="doc" key={slug}>
        <header className="doc-head">
          {crumb && <p className="crumb">{page.group}</p>}
          <div className="doc-title">
            <h1>{page.title}</h1>
            {!wide && <PageActions slug={slug} />}
          </div>
          <p className="desc">{page.description}</p>
        </header>
        <div className="prose">
          <Body />
        </div>
        <nav className="pn" aria-label="Previous and next">
          {prev ? (
            <Link href={`/${prev.slug}`} className="pn-prev">
              <small>Previous</small>
              <b>{prev.title}</b>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/${next.slug}`} className="pn-next">
              <small>Next</small>
              <b>{next.title}</b>
            </Link>
          )}
        </nav>
        <footer className="doc-foot">
          <a href={`${REPO}/issues/new?title=${encodeURIComponent(`Docs: ${page.title}`)}`} target="_blank" rel="noopener noreferrer">
            Suggest a change ↗
          </a>
          <span>Leakdown CLI {CLI_VERSION} · MIT</span>
        </footer>
      </article>
      {!wide && (
        <div className="toc-col">
          <Toc />
        </div>
      )}
    </div>
  );
}
