import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000"}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/conditions`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const supabase = createAdminClient();

    const { data: routes } = await supabase
      .from("popular_routes")
      .select("slug, updated_at")
      .eq("published", true);

    const routeIds = (routes ?? []).map((r) => r.slug as string);

    let briefingDates = new Map<string, string>();
    if (routeIds.length > 0) {
      const { data: briefings } = await supabase
        .from("route_briefings")
        .select("popular_route_id, generated_at")
        .in(
          "popular_route_id",
          (
            await supabase
              .from("popular_routes")
              .select("id, slug")
              .eq("published", true)
          ).data?.map((r) => r.id) ?? [],
        );

      const { data: routeIdMap } = await supabase
        .from("popular_routes")
        .select("id, slug")
        .eq("published", true);

      const idToSlug = new Map<string, string>();
      for (const r of routeIdMap ?? []) {
        idToSlug.set(r.id as string, r.slug as string);
      }

      briefingDates = new Map<string, string>();
      for (const b of briefings ?? []) {
        const slug = idToSlug.get(b.popular_route_id as string);
        if (slug) {
          briefingDates.set(slug, b.generated_at as string);
        }
      }
    }

    const conditionPages: MetadataRoute.Sitemap = (routes ?? []).map((r) => {
      const slug = r.slug as string;
      const briefingDate = briefingDates.get(slug);

      return {
        url: `${baseUrl}/conditions/${slug}`,
        lastModified: briefingDate
          ? new Date(briefingDate)
          : new Date(r.updated_at as string),
        changeFrequency: "daily" as const,
        priority: 0.8,
      };
    });

    return [...staticPages, ...conditionPages];
  } catch {
    return staticPages;
  }
}
