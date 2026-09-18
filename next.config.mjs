/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev would otherwise write AGENTS.md/CLAUDE.md into the repo on every start
  agentRules: false,
  // PostHog sets no trailing slash on /ingest/* and Next would redirect it away
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // /<slug>.md is the page as markdown (app/md/[slug]/route.ts)
      { source: "/:slug.md", destination: "/md/:slug" },
      /* PostHog, served from our own origin. The CSP in proxy.ts trusts 'self'
         and nothing else, so the browser must never see posthog.com — these
         rewrites make the round trip server-side instead. US cloud; on EU cloud
         these two hosts become eu-assets.i.posthog.com and eu.i.posthog.com. */
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;
