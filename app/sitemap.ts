import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { CHAPTERS } from "@/lib/content/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    ...CHAPTERS.map((c) => ({ url: `${SITE_URL}/play/${c.slug}`, priority: 0.8 })),
  ];
}
