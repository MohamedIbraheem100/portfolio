import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/* Only routes that exist and are meant to be indexed. /specimen is internal. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/fit`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/cv`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
