import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";
import { DOC_PAGES } from "../lib/nav";

export default function sitemap(): MetadataRoute.Sitemap {
  return DOC_PAGES.map((p) => ({ url: `${SITE_URL}/${p.slug}` }));
}
