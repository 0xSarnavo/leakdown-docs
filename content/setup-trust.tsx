import { Callout, Ext, H2, Table } from "../components/ui";
import { Code, CodeTabs } from "../components/code";
import { REPO } from "../lib/nav";

export function ChoosingTheAi() {
  return (
    <>
      <p className="lead">
        Every stage uses one AI CLI (the brain), one model and one effort level. Pass them as flags, or leave them out
        and pick from a menu.
      </p>

      <H2 id="brains">Brains</H2>
      <p>Three AI CLIs can play the prospect. The menus read their options live.</p>
      <Table
        head={["--brain", "Models listed from", "Effort"]}
        rows={[
          [<code key="c">claude</code>, <code key="c2">claude --help</code>, "low to max"],
          [<code key="x">codex</code>, <code key="x2">codex --help</code>, "low, medium, high"],
          [<code key="o">opencode</code>, <code key="o2">opencode models</code>, "Not asked; opencode has no effort setting"],
        ]}
      />
      <CodeTabs
        id="ai-pick"
        tabs={[
          { label: "Menus", code: "leakdown your-site.com" },
          { label: "Brain only", code: "leakdown your-site.com --brain claude" },
          { label: "No menus", code: "leakdown your-site.com --brain claude --model opus --effort high" },
        ]}
      />
      <p>
        Menus always offer <b>default</b> (the CLI&apos;s own setting) and, for models, <b>custom…</b> to type any id.
        Running bare <code>leakdown</code> opens a guided flow for all of it.
      </p>

      <H2 id="scripts">In scripts and CI</H2>
      <p>
        With no terminal attached nothing is asked: the brain falls back to <code>claude</code> and the model and effort
        to the CLI&apos;s defaults. Pass all three so runs are reproducible. Each session records what it used in{" "}
        <code>meta.json</code>.
      </p>

      <H2 id="limits">Usage limits</H2>
      <p>
        A personal subscription can hit its usage limit on a long run. The queue stops, names the limit, and tells you
        to rerun later. Nothing is lost, and a ladder run resumes the same day.
      </p>
      <Callout kind="note">
        <p>
          The CLI calls your AI CLI once per step, up to three attempts each. Automated use of a consumer subscription is
          between you and that provider&apos;s terms and rate limits.
        </p>
      </Callout>
    </>
  );
}

export function Email() {
  return (
    <>
      <p className="lead">
        Signups send codes and magic links. With a catch-all domain forwarded to an IMAP inbox, every prospect gets its
        own address and reads its own mail.
      </p>

      <H2 id="setup">Set up a mailbox</H2>
      <p>
        Copy <code>.env.example</code> to <code>.env</code> and fill it in. Never commit <code>.env</code>.
      </p>
      <Code id="em-env" title=".env">{`LEAKDOWN_IMAP_HOST="imap.gmail.com"
LEAKDOWN_IMAP_USER="you@gmail.com"
LEAKDOWN_IMAP_PASS="xxxx xxxx xxxx xxxx"   # an app password
LEAKDOWN_MAIL_DOMAIN="yourdomain.com"      # catch-all forwarded to that inbox`}</Code>
      <Callout kind="note" title="Older names">
        <p>
          <code>CLIENTSIM_*</code> variables still work but are deprecated. Use <code>LEAKDOWN_*</code>.
        </p>
      </Callout>

      <H2 id="test">Test it</H2>
      <p>One command checks the whole mailbox round trip.</p>
      <Code
        id="em-test"
        out={`
  ✅ mailbox created: momus.4f1c@yourdomain.com
  ✉ probe 1 sent via SMTP — a second follows at 60s. Waiting up to 5 minutes.
  (a self-sent probe proves SMTP + IMAP; to prove the forwarder, also send one to that address from another account now)

  📬 arrived after 14s: probe 1`}
      >
        {"leakdown --mailtest   # create, receive, extract and destroy a mailbox"}
      </Code>
      <ul>
        <li>Every run checks the mailbox once a day. If two prospects blame email and nothing arrived, those verdicts are marked unverified.</li>
        <li>Each prospect&apos;s mail moves to Trash when its session ends. It is not purged.</li>
      </ul>

      <H2 id="without">Without mail</H2>
      <p>
        Prospects treat &quot;check your email&quot; as the point they leave, and the report says so. That is useful when
        you want to know how many people a verification step loses, and misleading when you don&apos;t.
      </p>
    </>
  );
}

export function Safety() {
  return (
    <>
      <p className="lead">
        Prospects may go anywhere, including pricing and checkout. Reaching the wall is the finding. The action that
        commits is blocked.
      </p>

      <H2 id="permission">Permission first</H2>
      <Callout kind="warn" title="Only test sites you own or have written permission to test">
        <p>A run creates real accounts, triggers real emails and webhooks, and records what it sees. Use a staging copy when you can.</p>
      </Callout>

      <H2 id="never">What it never does</H2>
      <div className="grid4">
        <div>
          <b>Pay</b>
          <p>Card fields, anything that passes a card-number check, pay buttons in several languages. A bare &quot;Subscribe&quot; stays clickable.</p>
        </div>
        <div>
          <b>Book a meeting</b>
          <p>Scheduler commit buttons are refused. &quot;Book a demo&quot; still opens, because a demo-gated signup is a finding.</p>
        </div>
        <div>
          <b>Sign in with a provider</b>
          <p>Google, GitHub, SSO and work-account buttons. &quot;Continue with email&quot; is allowed.</p>
        </div>
        <div>
          <b>Delete, invite or publish</b>
          <p>No deleting data, inviting teammates, publishing, opening support chat or contacting third parties.</p>
        </div>
      </div>
      <ul>
        <li>Every session starts in a fresh browser with no saved cards or logins.</li>
        <li>Typing never presses Enter, and the email is always the assigned mailbox.</li>
        <li>A refusal does not end the session: the prospect is told why and routes around it or leaves.</li>
      </ul>

      <H2 id="limits">Where the guards stop</H2>
      <Callout kind="warn" title="Best effort, not a guarantee">
        <p>
          The payment, booking and sign-in guards match button labels. An unseen label, an uncovered language or a
          control with no accessible name can pass. Do not point Leakdown at a live checkout and assume it cannot buy.
        </p>
      </Callout>
      <p>
        The last rule above is a prompt rule, not a mechanical block. A &quot;request a demo&quot; form or a free trial with
        no card is submitted like any other form.
      </p>
    </>
  );
}
export function YourData() {
  return (
    <>
      <p className="lead">
        Everything lands under <code>runs/&lt;site&gt;/</code> on the machine that ran it. Nothing is uploaded.
      </p>

      <H2 id="stored">What is stored</H2>
      <p>Each session writes these files, and some of them contain things you typed or saw.</p>
      <Table
        head={["File", "Contains"]}
        rows={[
          [<code key="1">session.jsonl</code>, "Every thought, and every string a prospect typed, including the names and passwords it invents."],
          [<code key="2">shots/</code>, "A screenshot per step, plus a render of every email received."],
          [<code key="3">video.mp4</code>, "Whatever the page showed. Past a signup, that includes your own dashboard."],
          [<code key="4">meta.json</code>, "The URL, brain, model, effort, version and variant."],
        ]}
      />

      <H2 id="delete">Delete it</H2>
      <p>Deleting the folder deletes the run. There is no other copy.</p>
      <CodeTabs
        id="dt-del"
        tabs={[
          { label: "One site", code: "rm -rf runs/your-site.com" },
          { label: "Everything", code: "rm -rf runs/" },
        ]}
      />
      <p>
        Requested runs are different: they live on our side. <a href="/requested-runs#what-we-keep">What we keep</a>{" "}
        explains how to have them deleted.
      </p>
    </>
  );
}

const TROUBLE: Array<[string, React.ReactNode]> = [
  ["The run stopped halfway", <>Your AI subscription likely hit its usage limit. Rerun the same command later; a ladder run from the same day picks up where it stopped.</>],
  ["--goal exited with 2", <>Nothing failed on your site. The run could not start: the URL was unreachable, the model stopped answering, or setup failed. Run <code>leakdown --doctor</code>.</>],
  ["There is only video.webm", <>ffmpeg is not installed. Install it and new sessions also save <code>video.mp4</code>. <code>--doctor</code> says whether it was found.</>],
  ["A flag seems to do nothing", <>Since 0.7.0 an unknown flag is an error, so check the exact spelling in <a href="/commands">Commands</a>.</>],
  ['Prospects stop at "check your email"', <>Mail is not set up, so they cannot read the code. See <a href="/email">Email walls</a>.</>],
  ["A finding appears only once", <>It is marked unverified. Send the same persona again with <code>--persona name,name,name</code>.</>],
  ["Ctrl-C in a menu", <>It exits cleanly with status 130. Nothing is written.</>],
  ["--doctor says everything is fine but the run fails", <>The result is cached for a week. <code>leakdown --doctor --force</code> checks again, including a live call to your AI CLI.</>],
  ['"the brain is not answering"', <>Your AI CLI stopped replying, which is what a usage limit looks like. Wait for it to reset and rerun the same command; nothing is lost.</>],
];

export function Troubleshooting() {
  return (
    <>
      <p className="lead">Start with <code>leakdown --doctor</code>. It checks Node, Chromium, your AI CLI, mail and ffmpeg.</p>

      <H2 id="common">Common problems</H2>
      <p>Open a problem to see the fix.</p>
      <div className="faq">
        {TROUBLE.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 6l4.5 4.5L12.5 6" />
              </svg>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>

      <H2 id="bugs">Report a bug</H2>
      <p>
        <Ext href={`${REPO}/issues`}>Open an issue on GitHub ↗</Ext> and include the version:
      </p>
      <Code id="tr-version" out={"leakdown 0.7.0"}>{"leakdown --version"}</Code>
    </>
  );
}
