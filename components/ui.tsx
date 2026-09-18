import Link from "next/link";

/* Small building blocks for docs pages. Headings carry ids for the
   on-this-page list and for search. */

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="anchor">
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="anchor">
      {children}
    </h3>
  );
}

type Kind = "note" | "tip" | "warn";
const LABEL: Record<Kind, string> = { note: "Note", tip: "Tip", warn: "Warning" };

export function Callout({ kind = "note", title, children }: { kind?: Kind; title?: string; children: React.ReactNode }) {
  return (
    <aside className={`callout is-${kind}`}>
      <p className="callout-h">
        <span className="callout-i" aria-hidden="true" />
        {title ?? LABEL[kind]}
      </p>
      <div>{children}</div>
    </aside>
  );
}

export function Cards({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return <div className={`cards cols-${cols}`}>{children}</div>;
}

export function Card({ href, title, children, icon }: { href: string; title: string; children: React.ReactNode; icon?: string }) {
  const external = /^https?:/.test(href);
  const body = (
    <>
      {icon && (
        <span className="card-i" aria-hidden="true">
          {icon}
        </span>
      )}
      <b>{title}</b>
      <span>{children}</span>
      <i className="card-arrow" aria-hidden="true">
        {external ? "↗" : "→"}
      </i>
    </>
  );
  return external ? (
    <a className="card" href={href} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <Link className="card" href={href}>
      {body}
    </Link>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="step">
      <h3 className="step-h">{title}</h3>
      <div className="step-b">{children}</div>
    </li>
  );
}

export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
