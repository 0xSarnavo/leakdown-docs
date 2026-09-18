import { Callout, H2, Table } from "../components/ui";
import { Code } from "../components/code";
import { CLI_VERSION } from "../lib/nav";
import CommandTable, { type Cmd } from "../components/command-table";

const CMDS: Cmd[] = [
  { group: "Run", flag: "leakdown <url>", does: "A plain run, with menus for the brain, model and who visits." },
  { group: "Run", flag: "leakdown", does: "No arguments: a guided flow for everything." },
  { group: "Run", flag: "--ladder", does: "The full run: cheap models visit every persona, sonnet verifies the sessions that agree, opus re-walks the hardest one and writes the report. About an hour." },
  { group: "Run", flag: '--wide "<spec>"', does: 'With --ladder, splits the sweep, e.g. "haiku:5,opencode/<model>:5".' },
  { group: "Run", flag: "--stop <stage>", does: "End after one stage: site, map, personas, visit, report or fix." },
  { group: "Run", flag: '--flow "<intent>"', does: "Drafts checkpoints for a journey and scores each session against them (FLOW.md)." },
  { group: "Run", flag: "--flow-file <id|path>", does: "Runs against a flow file you wrote." },
  { group: "Run", flag: "--validate-flow [file]", does: "Checks flow files without a browser and lists what is wrong. Exits 1 on errors." },
  { group: "Run", flag: "--variant <slug>", does: "Labels a run for an A/B test, e.g. control or new-pricing." },
  { group: "Run", flag: "--compare <site>", does: "The newest run of each variant side by side, in COMPARE.md." },
  { group: "Run", flag: "--plan", does: "Re-reads the site and rebuilds its personas." },
  { group: "Run", flag: "--no-map", does: "Skips the re-crawl that checks whether the site changed." },
  { group: "Run", flag: "--force", does: "Regenerates outputs that are already up to date." },
  { group: "Who visits", flag: "--persona <list>", does: "An explicit queue, e.g. cold,warm,hot. Max 10." },
  { group: "Who visits", flag: "--random <n>", does: "n prospects chosen at random. Max 10." },
  { group: "Who visits", flag: "--count <n>", does: "How many prospects the personas stage builds, 2 to 10. Default 10." },
  { group: "Goal tests", flag: '--goal "<text>"', does: "Every persona gets this goal. Exit 0 only if every session completes it." },
  { group: "Goal tests", flag: "--steps <n>", does: "Step cap per session, 1 to 50. Default: each persona's own patience." },
  { group: "Goal tests", flag: '--expect "label=value"', does: "Repeatable. The page must show the value before a completion counts." },
  { group: "How it runs", flag: "--brain <claude|opencode|codex>", does: "Which AI CLI plays the prospect." },
  { group: "How it runs", flag: "--model <name>", does: "Pin a model. Lists are read live from the CLI." },
  { group: "How it runs", flag: "--effort <level>", does: "Reasoning effort. claude: low to max. codex: low, medium, high." },
  { group: "How it runs", flag: "--time <minutes>", does: "Wall-clock ceiling per session. Default 20. Waiting on mail and pauses does not count." },
  { group: "How it runs", flag: "--headless", does: "No visible browser window." },
  { group: "How it runs", flag: "--serial / --parallel", does: "One persona at a time (default) or all at once. Parallel needs a browser and AI CLI per persona." },
  { group: "How it runs", flag: "--mobile", does: "Phone viewport, 390 × 844 with touch." },
  { group: "How it runs", flag: "--yes", does: "Never prompt; take the default for every question." },
  { group: "How it runs", flag: "--version", does: "Print the version. Put it in bug reports." },
  { group: "How it runs", flag: "-h, --help", does: "The flag reference." },
  { group: "On its own", flag: "--history [site]", does: "Every run, one line each: date, the one number, who sat in which seat." },
  { group: "On its own", flag: "--report [what…]", does: "Rebuild the reports for those sessions." },
  { group: "On its own", flag: "--fix [what…]", does: "Run the expert panel over those sessions (FIXES.md)." },
  { group: "On its own", flag: "--replication [what…]", does: "Element refs cited across sessions: replicated versus single-source." },
  { group: "On its own", flag: "--pdf [sites…]", does: "One shareable PDF per site: the funnel and every fix." },
  { group: "On its own", flag: "--doctor", does: "Checks Node, Chromium, your AI CLI, mail and ffmpeg." },
  { group: "On its own", flag: "--list-personas", does: "Every persona: built-in, yours and per site." },
  { group: "On its own", flag: '--new-persona "Name"', does: "Build one persona by answering a few questions." },
  { group: "On its own", flag: "--mailtest", does: "Tests mailbox create, receive, extract and destroy." },
  { group: "Website orders", flag: "--orders [--all]", does: "Run requests left on the website: new ones, or every status." },
  { group: "Website orders", flag: "--order <id>", does: "Run one order here and email the PDF." },
  { group: "Website orders", flag: '--order <id> --reject "why"', does: "Decline an order." },
];

export function Commands() {
  return (
    <>
      <p className="lead">
        Every flag in CLI {CLI_VERSION}. <code>&lt;what&gt;</code> is a site name (its newest run), <code>site/date/time</code>,
        or a folder.
      </p>
      <Callout kind="note">
        <p>A mistyped flag is an error, not ignored. Before 0.7.0, <code>--headles</code> quietly ran a visible browser.</p>
      </Callout>
      <H2 id="all">All flags</H2>
      <p>Type in the box to filter by flag, description or group.</p>
      <CommandTable cmds={CMDS} />
    </>
  );
}

export function ExitCodes() {
  return (
    <>
      <p className="lead">Every session ends one of four ways, and a goal test turns those into an exit code.</p>
      <H2 id="endings">Session endings</H2>
      <p>The ending decides whether a session counts as a drop-off.</p>
      <Table
        head={["Ending", "Meaning", "Counts as a drop-off"]}
        rows={[
          [<b key="1">COMPLETED</b>, "Reached the goal. With --expect, only if every value showed.", "No"],
          [<b key="2">ABANDONED</b>, "Walked out with a reason, or ran out of patience.", "Yes"],
          [<b key="3">GUARDRAIL</b>, "A safety rule refused an action and the prospect could not route around it.", "Yes"],
          [<b key="4">COULD NOT RUN</b>, "Our side failed: unreachable URL, model stopped answering, setup error.", "No, counted apart"],
        ]}
      />
      <H2 id="codes">Exit codes</H2>
      <p>The process exit code is what CI and shell scripts read.</p>
      <Table
        head={["Code", "With --goal", "Anywhere"]}
        rows={[
          [<code key="0">0</code>, "Every session completed.", "Success."],
          [<code key="1">1</code>, "A session walked out or hit a guardrail.", "An error, e.g. --validate-flow found a problem."],
          [<code key="2">2</code>, "Nothing failed, but a session could not run.", ""],
          [<code key="130">130</code>, "", "Ctrl-C out of a menu."],
        ]}
      />
      <Code id="ec-sh" title="ci.sh">{`leakdown "$URL" --goal "sign up" --steps 15 --yes --headless
case $? in
  0) echo "signup works" ;;
  1) echo "signup failed for someone"; exit 1 ;;
  2) echo "could not run; retry" ;;
esac`}</Code>
    </>
  );
}

export function Files() {
  return (
    <>
      <p className="lead">
        One folder per site, one folder per run inside it. The site level keeps a copy of the newest run&apos;s reports.
      </p>
      <H2 id="tree">The runs folder</H2>
      <p>The layout below is what a site looks like after a few runs.</p>
      <Code id="fi-tree" title="runs/">{`runs/<site>/
  SITE.md              what the page sells, to whom, its walls
  MAP.md, map.json     every page the crawler found
  FLOW.md              drafted checkpoints (--flow)
  personas/            the prospects built for this site
  flows/               flow files for this site only
  analytics.json       optional: real-visitor weighting
  VERDICTS.md          mark each wall real: or false:
  COMPARE.md           A/B verdict (--compare)
  AGGREGATE.md …       copy of the newest run's reports
  <date>/<time>/       one run (<time>--<variant> for A/B)
    RUN.md             seat, model, sessions, exits, tokens, minutes
    AGGREGATE.md       the one-page report
    DETAIL.md          every table behind it
    VERIFIED.md        the verifier's panels (--ladder)
    REPORT.md          the writer's report (--ladder)
    wide/ verify/ deep/
      <model>/<session>/`}</Code>
      <H2 id="per-session">Per session</H2>
      <p>Each session folder holds the evidence for one prospect.</p>
      <Table
        head={["File", "Contains"]}
        rows={[
          [<code key="1">session.jsonl</code>, "Every step, thought and typed string."],
          [<code key="2">meta.json</code>, "URL, brain, model, effort, version, variant."],
          [<code key="3">shots/</code>, "Retina screenshot per step, and every email received."],
          [<code key="4">video.mp4</code>, "The recording (video.webm without ffmpeg)."],
          [<code key="5">filmstrip.html</code>, "Every step with its thought."],
          [<code key="6">report.md</code>, "The session's story, with Assertions when --expect was used."],
          [<code key="7">FIXES.md</code>, "The expert panel."],
        ]}
      />
      <H2 id="inputs">Files you add</H2>
      <p>Four files change how a run behaves, and none of them is required.</p>
      <Table
        head={["File", "Purpose", "Guide"]}
        rows={[
          [<code key="1">.env</code>, "Mail and order settings", <a key="1a" href="/environment">Environment</a>],
          [<code key="2">personas/*.yaml</code>, "Your own prospects", <a key="2a" href="/personas#custom">Personas</a>],
          [<code key="3">flows/*.yaml</code>, "Journeys to score", <a key="3a" href="/flows">Flows</a>],
          [<code key="4">runs/&lt;site&gt;/analytics.json</code>, "Real-visitor weighting", <a key="4a" href="/personas#calibrate">Personas</a>],
        ]}
      />
    </>
  );
}

export function Environment() {
  return (
    <>
      <p className="lead">
        The CLI reads <code>.env</code> from the folder you run it in. Every variable is optional until you need the
        feature behind it. Never commit <code>.env</code>.
      </p>
      <H2 id="mail">Mail</H2>
      <p>These four variables turn on per-prospect mailboxes.</p>
      <Table
        head={["Variable", "Value"]}
        rows={[
          [<code key="1">LEAKDOWN_IMAP_HOST</code>, "Your IMAP server, e.g. imap.gmail.com"],
          [<code key="2">LEAKDOWN_IMAP_USER</code>, "The inbox login"],
          [<code key="3">LEAKDOWN_IMAP_PASS</code>, "An app password"],
          [<code key="4">LEAKDOWN_MAIL_DOMAIN</code>, "A domain whose catch-all forwards to that inbox"],
        ]}
      />
      <H2 id="orders">Website orders</H2>
      <p>These two variables let the CLI pick up requests from the website.</p>
      <Table
        head={["Variable", "Value"]}
        rows={[
          [<code key="1">LEAKDOWN_ORDERS_URL</code>, "The request site's production URL"],
          [<code key="2">LEAKDOWN_ORDERS_TOKEN</code>, "The site's ORDERS_TOKEN"],
        ]}
      />
      <Code id="env-ex" title=".env">{`LEAKDOWN_IMAP_HOST=
LEAKDOWN_IMAP_USER=
LEAKDOWN_IMAP_PASS=
LEAKDOWN_MAIL_DOMAIN=
LEAKDOWN_ORDERS_URL=
LEAKDOWN_ORDERS_TOKEN=`}</Code>
      <H2 id="passthrough">Passed to your AI CLI</H2>
      <p>
        <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code> and their <code>*_BASE_URL</code> reach the AI CLIs if
        you set them. That path is untested.
      </p>
      <Callout kind="note" title="Older names">
        <p>
          <code>CLIENTSIM_*</code> still works with a deprecation warning. Rename to <code>LEAKDOWN_*</code>.
        </p>
      </Callout>
    </>
  );
}
