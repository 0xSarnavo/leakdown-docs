import { Callout, Card, Cards, H2, H3, Step, Steps, Table, Ext } from "../components/ui";
import { Code, CodeTabs } from "../components/code";
import { CAL, REPO, SITE } from "../lib/nav";

export function Introduction() {
  return (
    <>
      <p className="lead">
        Leakdown sends simulated prospects through your signup in a real browser. They think out loud and quit the way
        people do. You get one page: where they stalled, in their words, and a fix for each.
      </p>
      <p>
        Analytics tell you which page people leave from. Leakdown tells you what they were thinking when they left.
        It runs on the AI CLI subscription you already have (Claude Code, opencode or Codex), needs no API key, and
        keeps everything it records on your machine.
      </p>

      <H2 id="what-you-get">What you get</H2>
      <Cards cols={3}>
        <Card href="/reading-the-report" title="The one number">
          How many finished, how many walked out and why, and how sure the report is.
        </Card>
        <Card href="/reading-the-report#one-page" title="Fix these first">
          The three pages people left from, a quote, and the steps to see it yourself.
        </Card>
        <Card href="/reading-the-report#evidence" title="Every session on film">
          Video, screenshots and a filmstrip of every step with the thought behind it.
        </Card>
      </Cards>

      <H2 id="try-it">Try it</H2>
      <CodeTabs
        id="intro-try"
        tabs={[
          { label: "Full run", code: `git clone ${REPO}\ncd leakdown-cli && npm ci && npm run build\nnpx playwright install chromium\nnode dist/cli.js your-site.com --ladder --yes --headless` },
          { label: "CI check", code: 'leakdown your-site.com --goal "sign up and get an API key" --steps 15 --yes --headless' },
          { label: "Phone", code: "leakdown your-site.com --mobile --yes --headless" },
        ]}
      />
      <p>
        When it finishes, open <code>runs/your-site.com/AGGREGATE.md</code>. Not sure which flags you want? The{" "}
        <a href="/build-a-command">Builder</a> writes the command from what you want to know.
      </p>

      <H2 id="see-it">What a run looks like</H2>
      <p>Six stages print in order. Prospects have one-word names and think out loud at every step.</p>
      <Code
        id="intro-run"
        out={`▸ stage 1/6 · site
  product   API for search over your own docs
  signup    /signup · email + 6-digit code · plan picker
  brief: runs/your-site.com/SITE.md

▸ stage 2/6 · map
  38 pages: docs 21, marketing 9, auth 4, pricing 2, payment 2
  payment  /billing — commit refused by the guard

▸ stage 3/6 · personas
  ✓ 10 persona file(s) written to personas/

▸ stage 4/6 · visit
  10 prospect(s) queued, one at a time: momus, egeria, felicitas, … | haiku, headless
  [momus] [1/12 · 2/10 confusion] Momus: "Pricing is clear. Starting on the free tier."
  [momus] [4/12 · 6/10 confusion] Momus: "This reads like a done page. Where is continue?"
============================================================
  [1/10] ABANDONED
  Where: step 4 on https://your-site.com/signup/step-2
  Why: "The plan selector looks like a confirmation page. I think I am done."
  Session: runs/your-site.com/2026-09-17/10-14-02/wide/haiku/momus
  [##----------------------] 1/10 agents finished
  ...
  filter: 3 replicated ref(s), 1 single-source; 3 session(s) go to the verifier

▸ stage 5/6 · report
  3 of 10 completed their goal. 4 walked out with a reason. 3 ran out of patience still trying.
  Fix first: your-site.com/signup/step-2 — 3 of 10 walked out here

  Full report: runs/your-site.com/2026-09-17/10-14-02/AGGREGATE.md, then REPORT.md beside it`}
      >
        {"leakdown your-site.com --ladder --yes --headless"}
      </Code>

      <H2 id="explore">Explore the docs</H2>
      <Cards>
        <Card href="/quickstart" title="Quickstart">From nothing to your first report in five commands.</Card>
        <Card href="/how-it-works" title="How a run works">The six stages, what each writes, how a session ends.</Card>
        <Card href="/build-a-command" title="Builder">Pick the job, type your site, copy the command.</Card>
        <Card href="/goal-tests" title="Goal tests in CI">A pass or fail on every deploy.</Card>
        <Card href="/commands" title="Commands">Every flag, filterable.</Card>
        <Card href="/requested-runs" title="Requested runs">Have us run it and email you the report.</Card>
      </Cards>

      <H2 id="before-you-ship">Before you rely on it</H2>
      <Callout kind="warn" title="Only test sites you own or have written permission to test">
        <p>A run creates real accounts and triggers real emails and webhooks. Use a staging copy when you can.</p>
      </Callout>
      <p>
        Leakdown is in alpha. A finding is a risk to check on your own page, not a measurement of your traffic. Under
        three sessions the report says <em>too few to call</em>. <a href="/safety">Safety</a> lists what a prospect
        never does.
      </p>
    </>
  );
}
export function Quickstart() {
  return (
    <>
      <p className="lead">Five commands take you from nothing to a report. The full run takes about an hour, and you can leave it running.</p>

      <H2 id="requirements">Requirements</H2>
      <p>Four things need to be on the machine before the first run.</p>
      <Table
        head={["You need", "Why"]}
        rows={[
          [<b key="n">Node 20 or newer</b>, "The CLI is a Node program."],
          [<b key="c">Chromium</b>, "Every prospect drives a real browser. Installed in step 2."],
          [<b key="a">One AI CLI, logged in</b>, <span key="a2"><code>claude</code>, <code>opencode</code> or <code>codex</code> plays the prospect.</span>],
          [<span key="f"><b>ffmpeg</b> (optional)</span>, <span key="f2">A playable <code>video.mp4</code> per session. Without it you get <code>video.webm</code>.</span>],
        ]}
      />

      <H2 id="install">Install</H2>
      <p>Installing takes three steps and a few minutes.</p>
      <Steps>
        <Step title="Get the code">
          <Code id="qs-clone">{`git clone ${REPO}\ncd leakdown-cli && npm ci && npm run build`}</Code>
        </Step>
        <Step title="Add a browser and video support">
          <CodeTabs
            id="qs-deps"
            tabs={[
              { label: "macOS", code: "npx playwright install chromium\nbrew install ffmpeg" },
              { label: "Linux", code: "npx playwright install --with-deps chromium\nsudo apt-get install ffmpeg" },
            ]}
          />
        </Step>
        <Step title="Check your setup">
          <Code
            id="qs-doctor"
            out={`
  checking your setup...
  ✓ Node.js >= 20: v22.12.0
  ✓ Playwright chromium: launches OK
  ✓ AI CLI (any one): claude: installed, codex: not installed, opencode: installed
  ✓ brain claude (live call): responded
  ✓ mailbox (live): not configured (optional — see README for OTP signups)
  ✓ ffmpeg: /opt/homebrew/bin/ffmpeg — sessions get a playable video.mp4`}
          >
            {"node dist/cli.js --doctor"}
          </Code>
          <p>
            A <code>✗</code> line names what to install. The result is cached for a week; <code>--doctor --force</code>{" "}
            checks again.
          </p>
        </Step>
      </Steps>

      <H2 id="first-run">Your first run</H2>
      <p>The first run uses the full ladder, then you open the report it writes.</p>
      <Steps>
        <Step title="Run the full test">
          <Code
            id="qs-run"
            out={`
  ladder on your-site.com: wide haiku ×10 → filter → sonnet verifies → opus digs

▸ stage 1/6 · site
  ...
  ladder done: 10 wide + 1 deep session(s). VERIFIED.md and REPORT.md sit beside the report, mirrored at runs/your-site.com/.

  3 of 10 completed their goal. 4 walked out with a reason. 3 ran out of patience still trying.
  Fix first: your-site.com/signup/step-2 — 3 of 10 walked out here
  "The plan selector looks like a confirmation page. I think I am done."

  Full report: runs/your-site.com/2026-09-17/10-14-02/AGGREGATE.md, then REPORT.md beside it`}
          >
            {"node dist/cli.js your-site.com --ladder --yes --headless"}
          </Code>
          <p>
            <code>--yes</code> takes the default for every question and <code>--headless</code> hides the browser. Drop
            both to watch it and answer the menus yourself. The last four lines are the result: the one number, the
            first wall, and where the report is.
          </p>
        </Step>
        <Step title="Read the report">
          <Code id="qs-read" title="open">{"runs/your-site.com/AGGREGATE.md"}</Code>
          <p>
            <a href="/reading-the-report">Reading the report</a> explains each section.
          </p>
        </Step>
      </Steps>
      <Callout kind="tip" title="Make it a command">
        <p>
          Run <code>npm link</code> once inside the clone and every command works as <code>leakdown</code> instead of{" "}
          <code>node dist/cli.js</code>, from any folder. The CLI reads <code>.env</code> from, and writes{" "}
          <code>runs/</code> to, the folder you run it in.
        </p>
      </Callout>

      <H2 id="next-steps">Next steps</H2>
      <p>Once the first report is in, these pages cover the usual follow-ups.</p>
      <Cards>
        <Card href="/email" title="Set up email">Let prospects read verification codes and magic links.</Card>
        <Card href="/goal-tests" title="Add it to CI">Fail the build when signup breaks.</Card>
        <Card href="/personas" title="Shape the prospects">Presets, your own personas, and real-visitor weighting.</Card>
        <Card href="/choosing-the-ai" title="Pick the model">Brain, model and effort, and usage limits.</Card>
      </Cards>
    </>
  );
}

const STAGES = [
  { n: "site", does: "Reads your landing page: what you sell, to whom, the signup path, visible pricing, walls, and what a first-timer trips on.", out: "SITE.md" },
  { n: "map", does: "Crawls two clicks deep plus your sitemap, with no AI. Tags every page and every booking or payment surface. The report later lists pages no prospect found.", out: "MAP.md" },
  { n: "personas", does: "Builds up to 10 prospects that fit your product, spread across core buyers, adjacent roles and people outside the target.", out: "personas/" },
  { n: "visit", does: "One real browser session per prospect. Each step: look at the screen, decide, act, think out loud.", out: "session.jsonl · video.mp4 · filmstrip.html" },
  { n: "report", does: "The one-page report plus every table behind it.", out: "AGGREGATE.md · DETAIL.md" },
  { n: "fix", does: "An expert panel reads each session and proposes the fix.", out: "FIXES.md" },
];

export function HowItWorks() {
  return (
    <>
      <p className="lead">Point Leakdown at a site and six stages run in order. Each one writes a file you can open.</p>

      <H2 id="stages">The six stages</H2>
      <p>Each stage reads what the one before it wrote, and you can stop after any of them.</p>
      <ol className="pipe">
        {STAGES.map((s, i) => (
          <li key={s.n}>
            <span className="pipe-dot" aria-hidden="true" />
            <div>
              <p className="pipe-n">
                <b>{String(i + 1).padStart(2, "0")}</b>
                {s.n}
              </p>
              <p>{s.does}</p>
              <code>{s.out}</code>
            </div>
          </li>
        ))}
      </ol>
      <Code id="hw-stop">{"leakdown your-site.com --stop personas   # read the site and build prospects, then stop"}</Code>

      <H2 id="sessions">Inside a session</H2>
      <p>
        A prospect only sees one screen at a time, plus an outline of the headings below it. On a page 21 screens long
        that is about 40 elements instead of 776. Scrolling is free and does not use up patience.
      </p>
      <p>Every session ends one of four ways:</p>
      <Table
        head={["Ending", "Meaning"]}
        rows={[
          [<b key="c">Completed</b>, "The prospect reached the goal."],
          [<b key="a">Abandoned</b>, "The prospect walked out, with a reason, or ran out of patience."],
          [<b key="g">Guardrail</b>, "A safety rule stopped an action, such as paying or booking."],
          [<b key="n">Could not run</b>, "Our side failed: the URL was unreachable, the model stopped answering, or setup broke. It is never counted as a drop-off."],
        ]}
      />
      <p>Each ending prints a block like this in the terminal, then the tally of prospects so far.</p>
      <Code id="hw-exit" title="terminal · one session ending" out={`============================================================
  [4/10] ABANDONED
  Where: step 7 on https://your-site.com/signup/step-2
  Why: "The plan selector looks like a confirmation page. I think I am done."
  Wanted answered: "Which button takes me to the dashboard?"
  Session: runs/your-site.com/2026-09-17/10-14-02/wide/haiku/momus
  [##########--------------] 4/10 agents finished`}>{""}</Code>

      <H2 id="ladder">The ladder</H2>
      <p>
        <code>--ladder</code> is the full run. Cheap models visit every persona and act as votes. A filter keeps only
        what more than one session cites. Sonnet verifies those sessions, then opus re-walks the hardest persona and
        writes the report you read.
      </p>
      <Code id="hw-ladder">{'leakdown your-site.com --ladder --yes --headless\nleakdown your-site.com --ladder --wide "haiku:5,opencode/<model>:5"   # split the sweep'}</Code>
      <Callout kind="note">
        <p>A finding cited by a single session is marked unverified. It needs a second run before it counts.</p>
      </Callout>

      <H2 id="reruns">Reruns and caching</H2>
      <p>
        <code>SITE.md</code> is written once per site, and personas are skipped when a set already exists. Every run
        re-crawls the site once and asks whether to rebuild when the page list changed.
      </p>
      <Table
        head={["Flag", "Effect"]}
        rows={[
          [<code key="1">--plan</code>, "Re-read the site and rebuild its personas."],
          [<code key="2">--no-map</code>, "Skip the re-crawl."],
          [<code key="3">--force</code>, "Regenerate outputs that are already up to date."],
        ]}
      />
      <p>
        A ladder run that stopped, for example on a usage limit, resumes the same day and reuses the sessions it
        already has.
      </p>
    </>
  );
}

export function RequestedRuns() {
  return (
    <>
      <p className="lead">
        Don&apos;t want to run it yourself? Request a run on leakdown.dev. It is a free early-access demo: we run the same
        CLI and email you the report.
      </p>

      <H2 id="how">How it works</H2>
      <Steps>
        <Step title="Send the request">
          <p>Your site, your email, and a full run (default) or a special run with what you want tested. You confirm you may test the site.</p>
        </Step>
        <Step title="We run it">
          <p>A person picks it up and runs it on our machine. Nothing runs automatically.</p>
        </Step>
        <Step title="The report arrives">
          <p>A PDF with the funnel and every fix. One request per email per day.</p>
        </Step>
      </Steps>

      <H2 id="what-we-keep">What we keep</H2>
      <ul>
        <li>Your site URL, email, run choice and brief, and whether you allow public sharing.</li>
        <li>The run&apos;s videos, logs and screenshots, kept with the report.</li>
        <li>Nothing sold. Ask and everything is deleted, recordings included. This docs site and the
          main site have their own analytics, described in the <a href="https://leakdown.dev/privacy">privacy
          policy</a>; the site we test for you is never tracked.</li>
      </ul>
      <Callout kind="note" title="Public sharing is opt-in">
        <p>A finding goes public only if you ticked the box, and only once it is fixed. Ask and it comes down.</p>
      </Callout>

      <H2 id="request">Request one</H2>
      <p>
        <Ext href={`${SITE}/#request`}>Request a run on leakdown.dev ↗</Ext> · <Ext href={CAL}>Book 30 minutes ↗</Ext> ·{" "}
        <Ext href={`${SITE}/privacy`}>Privacy</Ext>
      </p>
      <H3 id="for-operators">For the operator</H3>
      <Code id="rr-ops">{"leakdown --orders            # new requests on the website\nleakdown --order <id>        # run one here and email the PDF"}</Code>
      <p>
        Needs the website&apos;s URL and token in <code>.env</code> and mail configured. See{" "}
        <a href="/environment#orders">Environment variables</a>.
      </p>
    </>
  );
}
