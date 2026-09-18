import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <article className="doc">
        <header className="doc-head">
          <p className="crumb">404</p>
          <h1>This page isn&apos;t in the docs</h1>
          <p className="desc">It may have moved. Search with ⌘K, or start from the introduction.</p>
        </header>
        <p>
          <Link className="btn" href="/introduction">
            Go to the introduction →
          </Link>
        </p>
      </article>
    </div>
  );
}
