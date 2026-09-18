import { Callout, H2, H3, Table } from "../components/ui";
import { Code, CodeTabs } from "../components/code";

const REPORT = [
  ["The one number", "How many completed, walked out with a reason, or ran out of patience. Sessions that could not run are counted apart, never as a drop-off."],
  ["How sure", "Every wall and repeated finding shows its count with a 95% interval."],
  ["Fix these first", "The three pages people left from, who left, one quote, and what they did just before, so you can reproduce it."],
  ["Measured on the page", "A ruler, not a persona: controls with no accessible name, tap targets under 24px, sideways scroll, missing viewport meta."],
  ["For developers", "Element refs cited by more than one session. Refs seen once are listed as unverified, not hidden."],
  ["Also found by the crawler", "Real 404s and unreachable links."],
  ["Variants compared", "After two --variant runs, which side leaks more, or no meaningful difference."],
];

export function ReadingTheReport() {
  return (
    <>
      <p className="lead">
        Open <code>runs/&lt;site&gt;/AGGREGATE.md</code> first. It fits on one page. <code>DETAIL.md</code> beside it
        holds every table behind it.
      </p>

      <H2 id="one-page">The one-page report</H2>
      <p>The sections, in the order they appear:</p>
      <ol className="rows">
        {REPORT.map(([h, t], i) => (
          <li key={h}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <b>{h}</b>
              <p>{t}</p>
            </div>
          </li>
        ))}
      </ol>

      <H2 id="confidence">How sure it is</H2>
      <p>Counts come with an interval, so a small run cannot pass for a big one.</p>
      <Code id="rr-ci" title="AGGREGATE.md">{"Plan picker reads like a confirmation\n  3/5 sessions · 60% [23–88%]\n\nDocs link 404 on /pricing\n  1/2 sessions · too few to call"}</Code>
      <Callout kind="note">
        <p>
          Read every finding as a risk to check, not a measurement of your traffic. A simulated prospect stalling is a
          signal that real visitors could.
        </p>
      </Callout>

      <H2 id="verdicts">Mark what was real</H2>
      <p>
        After a report, <code>runs/&lt;site&gt;/VERDICTS.md</code> is written once, with a <code>?:</code> line per wall.
        Change each to <code>real:</code> or <code>false:</code> and the next report counts your verdicts.
      </p>
      <Code id="rr-verdicts" title="VERDICTS.md">{"real:  signup step 2 plan picker reads like a confirmation\nfalse: docs link 404 (fixed before the run)\n?:     google sign-in returns to the homepage"}</Code>

      <H2 id="evidence">The evidence behind it</H2>
      <p>Every session keeps what it saw, so you can check a finding instead of trusting it.</p>
      <Table
        head={["File", "What it is"]}
        rows={[
          [<code key="1">video.mp4</code>, "The recording. Plays in QuickTime and Safari. Needs ffmpeg, otherwise video.webm."],
          [<code key="2">filmstrip.html</code>, "Every step with its screenshot and thought. No video player needed."],
          [<code key="3">shots/</code>, "A retina screenshot per step, plus a render of every email received."],
          [<code key="4">report.md</code>, "That session's story, with links to the evidence."],
          [<code key="5">FIXES.md</code>, "The expert panel's proposed fix."],
        ]}
      />
      <CodeTabs
        id="rr-rebuild"
        tabs={[
          { label: "Rebuild reports", code: "leakdown --report your-site.com" },
          { label: "Run the panel again", code: "leakdown --fix your-site.com" },
          { label: "One run", code: "leakdown --report your-site.com/<date>/<time>" },
        ]}
      />
    </>
  );
}

export function Personas() {
  return (
    <>
      <p className="lead">
        A persona is one prospect: who they are, what they want, and how much they know when they arrive. How much they
        know is most of what makes them behave differently.
      </p>

      <H2 id="presets">The three presets</H2>
      <p>The presets differ mostly in how much they know before they arrive.</p>
      <Table
        head={["Preset", "Behaves like", "Arrives knowing"]}
        rows={[
          [<code key="c">cold</code>, "First visit, low tech comfort, skims, distrusts forms and jargon, low patience.", "Nothing"],
          [<code key="w">warm</code>, "Comparing options, wants pricing and features, tolerates small friction.", "The pitch from SITE.md"],
          [<code key="h">hot</code>, "Decided to buy, goes straight to signup, leaves only when blocked.", "The pitch, the price and the signup path"],
        ]}
      />
      <Code id="ps-presets">{"leakdown your-site.com --persona cold,warm,hot --yes"}</Code>
      <p>
        Each persona also has a patience for verification email. Waiting too long is an in-character reason to leave.
      </p>

      <H2 id="generated">Generated sets</H2>
      <p>
        The personas stage builds a set fitted to your product by default: core buyers, adjacent roles and people
        outside the target. They get one-word mythological names (Momus, Egeria, Felicitas) so a report never reads as
        quoting a real person.
      </p>
      <CodeTabs
        id="ps-gen"
        tabs={[
          { label: "Build a set", code: "leakdown your-site.com --stop personas" },
          { label: "Smaller set", code: "leakdown your-site.com --stop personas --count 5" },
          { label: "Rebuild", code: "leakdown your-site.com --plan" },
        ]}
      />

      <H2 id="custom">Your own personas</H2>
      <p>Answer a few questions, or write the YAML yourself. The most specific one wins when ids collide.</p>
      <Table
        head={["Where", "Applies to"]}
        rows={[
          ["Built-in presets", "Everywhere"],
          [<code key="y">personas/*.yaml</code>, "Every site"],
          [<code key="s">runs/&lt;site&gt;/personas/*.yaml</code>, "That site only"],
        ]}
      />
      <Code id="ps-new">{'leakdown --new-persona "Procurement lead"   # asks scope, temperature, goal, traits\nleakdown --list-personas'}</Code>

      <H2 id="calibrate">Weight toward real visitors</H2>
      <p>
        Drop <code>analytics.json</code> beside the brief and the next set leans toward what your dashboard says. Shares
        are fractions of 1. No file means fully synthetic, which is the default.
      </p>
      <Code id="ps-analytics" title="runs/<site>/analytics.json">{`{
  "exitPages": [{ "path": "/pricing", "share": 0.38 }, { "path": "/", "share": 0.31 }],
  "devices": { "mobile": 0.55, "desktop": 0.45 },
  "entry": ["google organic", "product hunt"],
  "note": "Most signups come through the docs, not the homepage."
}`}</Code>
      <H3 id="calibrate-then">Then rebuild</H3>
      <Code id="ps-plan">{"leakdown your-site.com --plan"}</Code>
    </>
  );
}
