import { Callout, Card, Cards, H2, H3, Table } from "../components/ui";
import { Code, CodeTabs } from "../components/code";
import CommandBuilder from "../components/command-builder";

export function BuildACommand() {
  return (
    <>
      <CommandBuilder />
      <p>
        Not installed yet? <a href="/quickstart">Quickstart</a> is five commands. Every other flag, such as <code>--model</code> and{" "}
        <code>--time</code>, is on <a href="/commands">Commands</a>.
      </p>

      <H2 id="after">After it runs</H2>
      <p>The terminal ends with the result, and the files sit under <code>runs/</code>.</p>
      <Code id="bc-after" title="terminal · the end of a run" out={`  3 of 10 completed their goal. 4 walked out with a reason. 3 ran out of patience still trying.
  Fix first: your-site.com/signup/step-2 — 3 of 10 walked out here
  "The plan selector looks like a confirmation page. I think I am done."

  Full report: runs/your-site.com/2026-09-17/10-14-02/AGGREGATE.md, then REPORT.md beside it`}>{""}</Code>
      <Cards>
        <Card href="/reading-the-report" title="Reading the report">What AGGREGATE.md says, in order.</Card>
        <Card href="/troubleshooting" title="Something went wrong">Usage limits, exit 2, missing video.</Card>
      </Cards>
    </>
  );
}

export function UseCases() {
  return (
    <>
      <p className="lead">Pick the job and copy the command. Each one uses the same prospects and the same report.</p>

      <H2 id="launch">Before a launch</H2>
      <p>
        Find where a new signup flow loses people. Ten prospects walk it, and the report names the three pages they
        left from, with a quote and the element they were on.
      </p>
      <Code id="uc-launch">{"leakdown your-site.com --ladder --yes --headless"}</Code>
      <p>
        Want the run shaped around one journey? Add <code>--flow &quot;signup through to the dashboard&quot;</code>. See{" "}
        <a href="/flows">Flows</a>.
      </p>

      <H2 id="mobile">Phone layouts</H2>
      <p>
        The same run on a 390 × 844 touch viewport. The report&apos;s ruler also flags tap targets under 24px, sideways
        scroll and a missing viewport meta tag.
      </p>
      <Code id="uc-mobile">{"leakdown your-site.com --mobile --yes --headless"}</Code>

      <H2 id="retest">Retest one finding</H2>
      <p>
        A finding cited by one session is marked unverified. Send the same persona three times to see if it holds, or
        draw a random set.
      </p>
      <CodeTabs
        id="uc-retest"
        tabs={[
          { label: "Same persona", code: "leakdown your-site.com --persona marcus,marcus,marcus --yes" },
          { label: "Random set", code: "leakdown your-site.com --random 5 --yes" },
          { label: "Cited refs", code: "leakdown --replication your-site.com" },
        ]}
      />

      <H2 id="share">Share the result</H2>
      <p>One PDF per site with the funnel and every fix, for someone who will not open markdown.</p>
      <Code id="uc-pdf">{"leakdown --pdf your-site.com   # writes runs/your-site.com/your-site.com-report.pdf"}</Code>
      <p>
        <code>--history</code> lists every run with its one number, so you can point at the right one.
      </p>
      <Code
        id="uc-history"
        out={`
  your-site.com
    2026-09-09 16-02-40  5 of 10 completed their goal.       wide haiku×10
    2026-09-17 10-14-02  3 of 10 completed their goal.       wide haiku×10 · deep opus×1  REPORT.md

  Open: runs/<site>/<date>/<time>/AGGREGATE.md — or leakdown --fix <site> for the newest run.`}
      >
        {"leakdown --history"}
      </Code>

      <H2 id="more">More jobs</H2>
      <p>Other jobs have their own pages.</p>
      <Cards>
        <Card href="/build-a-command" title="Command builder">Pick the job, type your site, copy the command.</Card>
        <Card href="/goal-tests" title="Fail the build when signup breaks">Goal tests with exit codes CI can read.</Card>
        <Card href="/goal-tests#expect" title="Check a price or a total">--expect makes a completion count only when the value shows.</Card>
        <Card href="/ab-tests" title="Compare two versions">Same prospects, one verdict.</Card>
        <Card href="/email" title="Test email verification">Codes and magic links, read by each prospect.</Card>
      </Cards>
    </>
  );
}

export function GoalTests() {
  return (
    <>
      <p className="lead">
        <code>--goal</code> gives every prospect the same goal and turns the run into a pass or fail. The exit code
        tells CI whether your site stopped someone or the run itself broke.
      </p>

      <H2 id="run">Run a goal test</H2>
      <p>One flag turns any run into a test.</p>
      <Code
        id="gt-run"
        out={`
  3 prospect(s) queued, one at a time: cold, warm, hot | claude, headless
  [------------------------] 0/3 agents finished
  ...
  goal FAIL: 2/3 session(s) completed "log in and get an API key"`}
      >
        {'leakdown your-site.com --goal "log in and get an API key" --steps 15 --yes --headless'}
      </Code>
      <p>
        That run exits 1: one prospect did not get the key. <code>--steps</code> (1 to 50) caps each session. Everything else stays the same: same personas, same reports,
        same recordings.
      </p>

      <H2 id="exit-codes">Exit codes</H2>
      <p>The exit code separates a broken site from a broken run.</p>
      <Table
        head={["Code", "Meaning", "What to do"]}
        rows={[
          [<code key="0">0</code>, "Every session completed the goal.", "Ship."],
          [<code key="1">1</code>, "A session walked out or hit a guardrail. The site failed someone.", "Open the report."],
          [<code key="2">2</code>, "Nothing failed, but a session could not run: unreachable URL, model down, setup error.", "Check the runner, not the site."],
        ]}
      />

      <H2 id="expect">Check values with --expect</H2>
      <p>
        Add <code>--expect &quot;label=value&quot;</code>, as many times as you need. A completion only counts when the page
        shows every value. The check is a plain text match that ignores whitespace, and the report&apos;s Assertions section
        quotes what it found.
      </p>
      <Code id="gt-expect">{'leakdown your-site.com --goal "apply SAVE20" --expect "total=$96.00" --yes'}</Code>
      <Code id="gt-expect-out" title="report.md">{"Assertions\n  expected total=$96.00, found 'Total: $120.00'"}</Code>

      <H2 id="ci">In a CI job</H2>
      <p>
        With no terminal attached nothing is ever asked, so pass the brain, model and effort explicitly to keep runs
        reproducible.
      </p>
      <Code id="gt-ci" title=".github/workflows/signup.yml">{`name: signup
on: [deployment_status]
jobs:
  goal:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { repository: 0xSarnavo/leakdown-cli }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build && npx playwright install --with-deps chromium
      # log in your AI CLI here (see the note below)
      - run: >
          node dist/cli.js \${{ github.event.deployment_status.target_url }}
          --goal "sign up and get an API key" --steps 15
          --brain claude --model sonnet --yes --headless`}</Code>
      <Callout kind="warn" title="The AI CLI needs a login on the runner">
        <p>
          <code>ANTHROPIC_API_KEY</code> and <code>OPENAI_API_KEY</code> are passed through if set, but that path is
          untested. Automating a consumer subscription is between you and that provider&apos;s terms.
        </p>
      </Callout>
      <H3 id="ci-tips">Tips</H3>
      <ul>
        <li>Point it at a preview or staging deploy, never production checkout.</li>
        <li>Treat exit 2 as a retry, not a failed build.</li>
        <li>
          Keep <code>runs/</code> as a build artifact so the video is there when a check fails.
        </li>
      </ul>
    </>
  );
}

export function Flows() {
  return (
    <>
      <p className="lead">
        A flow file lists the journey you want checked, step by step. It scripts nothing: each prospect still decides
        for itself, and afterwards every step is scored as reached or not.
      </p>

      <H2 id="format">The file</H2>
      <p>
        Put it in <code>flows/&lt;id&gt;.yaml</code>, or <code>runs/&lt;site&gt;/flows/</code> for one site (that one wins
        on the same id). A step is a string, or a name plus <code>expect</code>: page text that proves the step.
      </p>
      <Code id="fl-yaml" title="flows/signup.yaml">{`name: Signup to first project
intent: sign up with email and reach the first empty project

steps:
  - found the signup form
  - name: submitted email and password
    expect: "Check your inbox"
  - received the verification email
  - name: saw the dashboard
    expect: "New project"

# end the session COMPLETED as soon as step 4's text is on screen
stop_after: 4`}</Code>
      <Callout kind="note" title="stop_after">
        <p>
          The step it names must have <code>expect</code>. The moment that text shows, the session ends as completed
          and the step counts as reached, before any more steps are spent.
        </p>
      </Callout>

      <H2 id="validate">Validate and run</H2>
      <p>Check the file first, then run it, with or without a goal.</p>
      <CodeTabs
        id="fl-run"
        tabs={[
          { label: "Validate", code: "leakdown --validate-flow flows/signup.yaml   # no browser; exits 1 on errors", out: '\n  ✓ flows/signup.yaml — "Signup to first project", 4 step(s), stops after step 4' },
          { label: "Run", code: "leakdown your-site.com --flow-file signup --yes" },
          { label: "With a goal", code: 'leakdown your-site.com --flow-file signup --goal "sign up" --yes' },
        ]}
      />

      <H2 id="drafted">Let Leakdown draft one</H2>
      <p>No file yet? Describe the journey and Leakdown drafts the checkpoints for you to review, then shapes the prospects around it.</p>
      <Code id="fl-draft">{'leakdown your-site.com --flow "signup through to the dashboard"   # writes runs/<site>/FLOW.md'}</Code>
    </>
  );
}

export function AbTests() {
  return (
    <>
      <p className="lead">Run the same prospects against two versions, then compare. You get one verdict.</p>

      <H2 id="run">Run both sides</H2>
      <p>Label each run with a variant, then compare the newest of each.</p>
      <Code
        id="ab-run"
        out={`
# your-site.com — variants compared

Newest run per variant: \`control\` → your-site.com/2026-09-17/10-14-02--control; \`new-pricing\` → your-site.com/2026-09-17/11-30-48--new-pricing.

| variant | sessions | completed | leaked | how sure |
|---|---|---|---|---|
| \`new-pricing\` | 10 | 3 | 7 | 70% [40–89%] |
| \`control\` | 10 | 7 | 3 | 30% [11–60%] |

**Verdict:** \`new-pricing\` leaks more — 40 points more of its visitors gave up than in \`control\` (40–89% vs 11–60%).

  Written: runs/your-site.com/COMPARE.md`}
      >
        {`leakdown https://your-site.com --variant control --yes --headless
leakdown https://new.your-site.com --variant new-pricing --yes --headless
leakdown --compare your-site.com`}
      </Code>
      <p>
        <code>--variant</code> labels every session and the run folder, so two variants never share a report.{" "}
        <code>--compare</code> takes the newest run of each.
      </p>

      <H2 id="verdict">Reading the verdict</H2>
      <p>For each side: sessions, completed, leaked, an interval, and where it lost people. Then one line:</p>
      <Table
        head={["Verdict", "When"]}
        rows={[
          ["Which side leaks more", "The intervals do not overlap."],
          [<em key="n">No meaningful difference</em>, "The intervals overlap."],
          [<em key="t">Too few</em>, "Under three sessions on a side."],
        ]}
      />
      <Callout kind="note">
        <p>
          Sessions that could not run are left out of every rate. Exactly two variants are compared; any more are
          listed.
        </p>
      </Callout>
    </>
  );
}
