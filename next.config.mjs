/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // dev would otherwise write AGENTS.md/CLAUDE.md into the repo on every start
  agentRules: false,
  async rewrites() {
    // /<slug>.md is the page as markdown (app/md/[slug]/route.ts)
    return [{ source: "/:slug.md", destination: "/md/:slug" }];
  },
};

export default nextConfig;
