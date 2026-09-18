"use client";

import { useState } from "react";
import CopyButton from "./copy-button";
import { Chrome, Lines } from "./code";

/* Type the site, pick what you want to know, copy the command. */

type Job = {
  id: string;
  label: string;
  hint: string;
  ask?: [key: "goal" | "flow" | "b" | "persona", label: string, placeholder: string];
};

const JOBS: Job[] = [
  { id: "full", label: "Where does signup leak?", hint: "The full run. About an hour." },
  { id: "ci", label: "Does signup still work?", hint: "A pass or fail for CI.", ask: ["goal", "The goal", "sign up and get an API key"] },
  { id: "mobile", label: "Does it work on a phone?", hint: "The full run on a phone screen." },
  { id: "flow", label: "Does one journey work?", hint: "Every session is scored against its steps.", ask: ["flow", "The journey", "signup through to the dashboard"] },
  { id: "ab", label: "Which version leaks less?", hint: "The same prospects on both, one verdict.", ask: ["b", "The other version", "https://new.your-site.com"] },
  { id: "retest", label: "Was that finding real?", hint: "The same prospect three times.", ask: ["persona", "The prospect", "cold"] },
  { id: "pdf", label: "Share the last report", hint: "One PDF for someone who will not open markdown." },
];

// same rule as the CLI's siteSlug: host, no www., odd characters to _
const slugOf = (url: string) => {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).host.replace(/^www\./, "").replace(/[^a-zA-Z0-9._-]/g, "_") || "your-site.com";
  } catch {
    return "your-site.com";
  }
};

export default function CommandBuilder() {
  const [job, setJob] = useState("full");
  const [site, setSite] = useState("");
  const [ask, setAsk] = useState<Record<string, string>>({});
  const [watch, setWatch] = useState(false);

  const j = JOBS.find((x) => x.id === job)!;
  const url = site.trim() || "your-site.com";
  const slug = slugOf(url);
  const val = j.ask ? (ask[j.ask[0]]?.trim() || j.ask[2]) : "";
  const flags = watch ? " --yes" : " --yes --headless";

  let cmds: string[];
  let then = `Then open runs/${slug}/AGGREGATE.md.`;
  switch (job) {
    case "ci":
      cmds = [`leakdown ${url} --goal "${val}" --steps 15${flags}`];
      then = "Exit 0: every session completed. 1: someone failed on the site. 2: could not run, retry.";
      break;
    case "mobile":
      cmds = [`leakdown ${url} --mobile${flags}`];
      break;
    case "flow":
      cmds = [`leakdown ${url} --flow "${val}"${flags}`];
      then = `The steps land in runs/${slug}/FLOW.md and the report scores each one.`;
      break;
    case "ab":
      cmds = [`leakdown ${url} --variant control${flags}`, `leakdown ${val} --variant new${flags}`, `leakdown --compare ${slug}`];
      then = `The verdict is written to runs/${slug}/COMPARE.md.`;
      break;
    case "retest":
      cmds = [`leakdown ${url} --persona ${val},${val},${val}${flags}`];
      break;
    case "pdf":
      cmds = [`leakdown --pdf ${slug}`];
      then = `Writes runs/${slug}/${slug}-report.pdf.`;
      break;
    default:
      cmds = [`leakdown ${url} --ladder${flags}`];
  }

  return (
    <div className="cb">
      <div className="cb-left">
        <label className="cb-field">
          <span>Your site</span>
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="your-site.com" autoComplete="off" spellCheck={false} />
        </label>
        <p className="cb-h">What do you want to know?</p>
        <div className="cb-jobs" role="radiogroup" aria-label="What do you want to know?">
          {JOBS.map((x) => (
            <label key={x.id} className={x.id === job ? "is-on" : undefined}>
              <input type="radio" name="cb-job" value={x.id} checked={x.id === job} onChange={() => setJob(x.id)} />
              <b>{x.label}</b>
              <span>{x.hint}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="cb-right">
        {j.ask && (
          <label className="cb-field">
            <span>{j.ask[1]}</span>
            <input value={ask[j.ask[0]] ?? ""} onChange={(e) => setAsk({ ...ask, [j.ask![0]]: e.target.value })} placeholder={j.ask[2]} autoComplete="off" spellCheck={false} />
          </label>
        )}
        <p className="cb-h">Run this</p>
        <figure className="code is-term">
          <figcaption>
            <Chrome title="terminal" />
            <CopyButton target="cb-cmd" />
          </figcaption>
          <pre tabIndex={0}>
            <code id="cb-cmd">
              <Lines code={cmds.join("\n")} />
            </code>
          </pre>
        </figure>
        <p className="cb-then">{then}</p>
        <div className="cb-toggles">
          <label>
            <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} /> show the browser while it runs
          </label>
        </div>
        <p className="cb-then">
          Running from the clone instead of <code>npm link</code>? Use <code>node dist/cli.js</code> in place of <code>leakdown</code>.
        </p>
      </div>
    </div>
  );
}
