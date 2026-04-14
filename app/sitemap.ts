import type { MetadataRoute } from "next";
import { getTopContractors, getTopCommunities } from "@/lib/seo-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yycpermits.com";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [contractors, communities] = await Promise.all([
    getTopContractors(500).catch(() => []),
    getTopCommunities(500).catch(() => []),
  ]);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contractors`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/communities`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...contractors.map((c) => ({
      url: `${SITE_URL}/contractors/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...communities.map((c) => ({
      url: `${SITE_URL}/communities/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
