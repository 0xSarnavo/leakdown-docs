import type { MetadataRoute } from "next";
import { PAGES } from "../lib/nav";

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `https://docs.leakdown.ai/${p.slug}` }));
}
