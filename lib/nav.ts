/* The docs map: tabs, sidebar groups and pages, in reading order. The
   sidebar, the top tabs, search and the previous/next links all read this.
   `sections` lists each page's h2 ids so search can jump straight to one. */

export const SITE = "https://leakdown.dev";
export const REPO = "https://github.com/0xSarnavo/leakdown-cli";
export const CLI_VERSION = "0.7.0";

export type Tab = "guides" | "reference" | "changelog" | "builder" | "ask";

export type Page = {
  slug: string;
  title: string;
  description: string;
  tab: Tab;
  group: string;
  sections: Array<[id: string, label: string]>;
  keywords?: string;
  /* An application, not a documentation page: it has no prose, so it is left
     out of llms.txt, the sitemap, /<slug>.md and the previous/next chain. It is
     still in PAGES so the sidebar, the tab strip and search all know it. */
  app?: boolean;
};

/* `wide` tabs have no sidebar or contents list: one page, full width. */
export const TABS: Array<{ id: Tab; label: string; home: string; wide?: boolean }> = [
  { id: "guides", label: "Guides", home: "introduction" },
  { id: "reference", label: "CLI reference", home: "commands" },
  { id: "changelog", label: "Changelog", home: "changelog" },
  { id: "builder", label: "Builder", home: "build-a-command", wide: true },
  { id: "ask", label: "Ask", home: "ask", wide: true },
];
export const isWide = (tab?: Tab) => !!TABS.find((t) => t.id === tab)?.wide;

export const PAGES: Page[] = [
  // ---------- guides ----------
  {
    slug: "introduction",
    title: "Introduction",
    description: "Simulated prospects walk your signup in a real browser and tell you where they gave up.",
    tab: "guides",
    group: "Get started",
    sections: [
      ["what-you-get", "What you get"],
      ["try-it", "Try it"],
      ["see-it", "What a run looks like"],
      ["explore", "Explore the docs"],
      ["before-you-ship", "Before you rely on it"],
    ],
    keywords: "overview what is leakdown alpha",
  },
  {
    slug: "quickstart",
    title: "Quickstart",
    description: "From nothing to your first report in five commands.",
    tab: "guides",
    group: "Get started",
    sections: [
      ["requirements", "Requirements"],
      ["install", "Install"],
      ["first-run", "Your first run"],
      ["next-steps", "Next steps"],
    ],
    keywords: "install setup npm playwright chromium ffmpeg doctor",
  },
  {
    slug: "how-it-works",
    title: "How a run works",
    description: "The six stages, what each one writes, and how a session ends.",
    tab: "guides",
    group: "Get started",
    sections: [
      ["stages", "The six stages"],
      ["sessions", "Inside a session"],
      ["ladder", "The ladder"],
      ["reruns", "Reruns and caching"],
    ],
    keywords: "stages site map personas visit report fix ladder pipeline",
  },
  {
    slug: "requested-runs",
    title: "Requested runs",
    description: "Have us run it for you: what happens and what we keep.",
    tab: "guides",
    group: "Get started",
    sections: [
      ["how", "How it works"],
      ["what-we-keep", "What we keep"],
      ["request", "Request one"],
    ],
    keywords: "hosted demo early access request form privacy",
  },
  {
    slug: "use-cases",
    title: "Use cases",
    description: "Pick the job, copy the command.",
    tab: "guides",
    group: "Run it",
    sections: [
      ["launch", "Before a launch"],
      ["mobile", "Phone layouts"],
      ["retest", "Retest one finding"],
      ["share", "Share the result"],
      ["more", "More jobs"],
    ],
    keywords: "examples launch mobile retest pdf share",
  },
  {
    slug: "build-a-command",
    title: "Builder",
    description: "Pick the job, type your site, copy the command.",
    tab: "builder",
    group: "Tools",
    sections: [["after", "After it runs"]],
    keywords: "command builder generator wizard which flags copy build a command",
  },
  {
    slug: "goal-tests",
    title: "Goal tests in CI",
    description: "A pass or fail for every deploy, with exit codes CI can read.",
    tab: "guides",
    group: "Run it",
    sections: [
      ["run", "Run a goal test"],
      ["exit-codes", "Exit codes"],
      ["expect", "Check values with --expect"],
      ["ci", "In a CI job"],
    ],
    keywords: "goal ci github actions exit code expect assert deploy",
  },
  {
    slug: "flows",
    title: "Flows you write",
    description: "Describe the journey step by step and score every session against it.",
    tab: "guides",
    group: "Run it",
    sections: [
      ["format", "The file"],
      ["validate", "Validate and run"],
      ["drafted", "Let Leakdown draft one"],
    ],
    keywords: "flow yaml steps expect stop_after validate",
  },
  {
    slug: "ab-tests",
    title: "A/B tests",
    description: "Run two versions with the same prospects and get one verdict.",
    tab: "guides",
    group: "Run it",
    sections: [
      ["run", "Run both sides"],
      ["verdict", "Reading the verdict"],
    ],
    keywords: "variant compare ab test split",
  },
  {
    slug: "reading-the-report",
    title: "Reading the report",
    description: "What AGGREGATE.md says, in the order it says it.",
    tab: "guides",
    group: "Results",
    sections: [
      ["one-page", "The one-page report"],
      ["confidence", "How sure it is"],
      ["verdicts", "Mark what was real"],
      ["evidence", "The evidence behind it"],
    ],
    keywords: "aggregate report verdicts confidence interval filmstrip video",
  },
  {
    slug: "personas",
    title: "Personas",
    description: "Who visits your site, and how to shape them.",
    tab: "guides",
    group: "Results",
    sections: [
      ["presets", "The three presets"],
      ["generated", "Generated sets"],
      ["custom", "Your own personas"],
      ["calibrate", "Weight toward real visitors"],
    ],
    keywords: "persona cold warm hot analytics calibration yaml",
  },
  {
    slug: "choosing-the-ai",
    title: "Choosing the AI",
    description: "Which AI CLI plays the prospect, which model, and how hard it thinks.",
    tab: "guides",
    group: "Setup",
    sections: [
      ["brains", "Brains"],
      ["scripts", "In scripts and CI"],
      ["limits", "Usage limits"],
    ],
    keywords: "brain model effort claude codex opencode subscription",
  },
  {
    slug: "email",
    title: "Email walls",
    description: "Let prospects read their own verification codes and magic links.",
    tab: "guides",
    group: "Setup",
    sections: [
      ["setup", "Set up a mailbox"],
      ["test", "Test it"],
      ["without", "Without mail"],
    ],
    keywords: "imap email otp magic link verification env",
  },
  {
    slug: "safety",
    title: "Safety",
    description: "What a prospect is never allowed to do, and where the guards stop.",
    tab: "guides",
    group: "Trust",
    sections: [
      ["permission", "Permission first"],
      ["never", "What it never does"],
      ["limits", "Where the guards stop"],
    ],
    keywords: "safety payment booking sso guard permission",
  },
  {
    slug: "your-data",
    title: "Your data",
    description: "What a run stores, where, and how to delete it.",
    tab: "guides",
    group: "Trust",
    sections: [
      ["stored", "What is stored"],
      ["delete", "Delete it"],
    ],
    keywords: "privacy delete storage local runs",
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Fixes for the problems people hit most.",
    tab: "guides",
    group: "Trust",
    sections: [
      ["common", "Common problems"],
      ["bugs", "Report a bug"],
    ],
    keywords: "error stuck usage limit ffmpeg exit 2 help issue",
  },
  // ---------- reference ----------
  {
    slug: "commands",
    title: "Commands",
    description: "Every flag the CLI takes, filterable.",
    tab: "reference",
    group: "CLI",
    sections: [["all", "All flags"]],
    keywords: "flags options help cli reference",
  },
  {
    slug: "exit-codes",
    title: "Exit codes and verdicts",
    description: "How a session ends and what the process returns.",
    tab: "reference",
    group: "CLI",
    sections: [
      ["endings", "Session endings"],
      ["codes", "Exit codes"],
    ],
    keywords: "completed abandoned guardrail could not run exit",
  },
  {
    slug: "files",
    title: "Files and folders",
    description: "Everything a run writes, and where.",
    tab: "reference",
    group: "CLI",
    sections: [
      ["tree", "The runs folder"],
      ["per-session", "Per session"],
      ["inputs", "Files you add"],
    ],
    keywords: "runs folder aggregate detail meta session jsonl",
  },
  {
    slug: "environment",
    title: "Environment variables",
    description: "Everything the CLI reads from .env.",
    tab: "reference",
    group: "CLI",
    sections: [
      ["mail", "Mail"],
      ["orders", "Website orders"],
      ["passthrough", "Passed to your AI CLI"],
    ],
    keywords: "env dotenv imap orders token api key",
  },
  // ---------- changelog ----------
  {
    slug: "changelog",
    title: "Changelog",
    description: "What changed in each release of the CLI.",
    tab: "changelog",
    group: "Releases",
    sections: [
      ["v0-7-0", "0.7.0"],
      ["v0-6-0", "0.6.0"],
      ["v0-5-0", "0.5.0"],
      ["v0-4-0", "0.4.0"],
      ["earlier", "Earlier"],
    ],
    keywords: "release notes version history",
  },
  {
    slug: "ask",
    title: "Ask",
    description: "Ask the docs a question and get the paragraph that answers it, word for word.",
    tab: "ask",
    group: "Ask",
    sections: [],
    keywords: "ask search question answer ai chat",
    app: true,
  },
];

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);

/* Everything that is actually documentation. llms.txt, the sitemap, the .md
   routes and the previous/next chain all mean this, not PAGES. */
export const DOC_PAGES = PAGES.filter((p) => !p.app);

export function neighbours(slug: string) {
  const tab = pageBySlug(slug)?.tab;
  const list = DOC_PAGES.filter((p) => p.tab === tab);
  const i = list.findIndex((p) => p.slug === slug);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}
