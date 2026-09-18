import type { MetadataRoute } from "next";
import { DOC_PAGES } from "../lib/nav";

export default function sitemap(): MetadataRoute.Sitemap {
  return DOC_PAGES.map((p) => ({ url: `https://docs.leakdown.ai/${p.slug}` }));
}
