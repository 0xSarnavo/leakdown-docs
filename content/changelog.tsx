import { Ext } from "../components/ui";
import { REPO } from "../lib/nav";

/* From leakdown-cli CHANGELOG.md. Newest first. */
const RELEASES: Array<{ v: string; id: string; date: string; head: string; items: Array<[string, React.ReactNode]> }> = [
  {
    v: "0.8.0",
    id: "v0-8-0",
    date: "18 September 2026",
    head: "A pluggable judge, and every completion claim keeps its page",
    items: [
      ["The yes/no rulings can come from somewhere else", <>Three questions have a yes or no answer rather than prose: was the goal reached, which flow checkpoints were reached, and does the page show an <code>--expect</code> value in other words. Point <code>LEAKDOWN_JUDGE</code> at a module that exports <code>createJudge()</code> and it answers those instead of the AI CLI; its usage is recorded apart, as <code>usageJudge</code> in <code>meta.json</code>. Unset, which is the default, nothing changes, and a judge that is missing or failing never ends a session.</>],
      ["Every completion claim leaves its page behind", <>A session that claims it is done appends to <code>verifications.jsonl</code>: the page that was judged, the verdict, and any <code>--expect</code> results. A rejected completion used to say only that it was rejected; now you can read the page and judge for yourself, and past runs can be replayed without re-visiting the site.</>],
    ],
  },
  {
    v: "0.7.0",
    id: "v0-7-0",
    date: "17 September 2026",
    head: "Assertions, could-not-run, your own flows, A/B",
    items: [
      ["Goal tests can assert values", <><code>--expect &quot;total=$96.00&quot;</code>, repeatable, makes a completion count only when the page shows the value. The report&apos;s Assertions section quotes what it found.</>],
      ['"Could not run" is its own verdict', <>An unreachable page, a model that stops answering or a setup error no longer reads as a guardrail stop. <code>--goal</code> exits 0 (all passed), 1 (a session failed on the site) or 2 (could not run).</>],
      ["Write your own flows", <><code>flows/&lt;id&gt;.yaml</code> holds a journey as ordered steps. <code>--validate-flow</code> checks them without a browser; <code>--flow-file</code> runs one. A <code>stop_after</code> step ends the session completed when its text shows.</>],
      ["A/B on your laptop", <><code>--variant</code> labels a run and <code>--compare</code> writes <code>COMPARE.md</code>: sessions, completed, leaked, an interval per variant, and one verdict.</>],
      ["Ready for outside testers", <><code>--version</code>; a mistyped flag is an error. Every report carries the version. <code>VERDICTS.md</code> is written once per report. <code>--doctor</code> checks ffmpeg. <code>video.webm</code> is deleted once <code>video.mp4</code> exists (37% less disk per session). Scrolling no longer waits for the network, up to a minute faster per long page.</>],
      ["Reports say how sure they are", <>Every wall and repeated element ref carries its count with a 95% interval. Under three sessions it says too few to call.</>],
    ],
  },
  {
    v: "0.6.0",
    id: "v0-6-0",
    date: "15 September 2026",
    head: "Sharper evidence, and the Leakdown name",
    items: [
      ["Retina screenshots and playable video", <>2560px step screenshots with settled fonts, recordings with reduced motion, <code>video.mp4</code> (with ffmpeg) and <code>filmstrip.html</code> per session.</>],
      ["Rebrand", <>The command is <code>leakdown</code> (was <code>client-simulator</code>). Env vars are <code>LEAKDOWN_*</code>; <code>CLIENTSIM_*</code> works for one more minor. Local state moved to <code>.leakdown-state.json</code>, and the lockfile is committed.</>],
    ],
  },
  {
    v: "0.5.0",
    id: "v0-5-0",
    date: "14 September 2026",
    head: "Where runs land, and getting around",
    items: [
      ["One folder per run", <><code>runs/&lt;site&gt;/&lt;date&gt;/&lt;time&gt;/</code> with <code>wide/</code>, <code>verify/</code> and <code>deep/</code> seats, and <code>RUN.md</code>, <code>AGGREGATE.md</code>, <code>DETAIL.md</code>, <code>VERIFIED.md</code>, <code>REPORT.md</code>.</>],
      ["Getting around", <><code>--history</code>; <code>--report</code>, <code>--fix</code> and <code>--replication</code> take a site name. A run ends by printing the one number and the first wall.</>],
      ["Runs", <>Every run re-crawls once and asks before rebuilding; <code>--no-map</code> skips it. <code>--random</code> replaces <code>--runs</code>. Per-model reports are always written.</>],
      ["Personas", <>Generated prospects get lesser-known mythological names, so a report never reads as quoting a real person.</>],
    ],
  },
  {
    v: "0.4.0",
    id: "v0-4-0",
    date: "14 September 2026",
    head: "The map stage and the one-page report",
    items: [
      ["Map and aggregate", <>The crawler&apos;s view of the site with broken links, and <code>AGGREGATE.md</code> with <code>DETAIL.md</code> behind it.</>],
      ["The ladder and more", <><code>--ladder</code>, website orders, <code>analytics.json</code> calibration, the mail watchdog, and a usage limit that stops the queue and names itself.</>],
    ],
  },
  {
    v: "Earlier",
    id: "earlier",
    date: "",
    head: "The foundations",
    items: [["Before 0.4", <><code>--goal</code> for CI, <code>--mailtest</code>, shareable PDFs, per-model funnels, the expert panel, and the guard that never books a meeting.</>]],
  },
];

export function Changelog() {
  return (
    <>
      <p className="lead">
        Releases of the Leakdown CLI, newest first. The full notes live in{" "}
        <Ext href={`${REPO}/blob/main/CHANGELOG.md`}>CHANGELOG.md ↗</Ext>.
      </p>
      <ol className="rel">
        {RELEASES.map((r, i) => (
          <li key={r.v}>
            <span className="rel-dot" aria-hidden="true" />
            <div className="rel-side">
              <h2 id={r.id} className="anchor">
                {r.v}
              </h2>
              {i === 0 && <span className="tag">Latest release</span>}
              {r.date && <time>{r.date}</time>}
            </div>
            <div className="rel-body">
              <p className="rel-t">{r.head}</p>
              <ul>
                {r.items.map(([h, t]) => (
                  <li key={h}>
                    <b>{h}.</b> {t}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
