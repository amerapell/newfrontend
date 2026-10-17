import type { MetadataRoute } from "next";
import { catalogApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

/** Built resiliently: if the API is down the static routes are still listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = ["", "/about", "/contact", "/faq", "/links", "/policies/delivery", "/policies/exchanges", "/policies/privacy", "/policies/terms"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "daily" : "monthly",
    priority: p === "" ? 1 : 0.4,
  }));
  const [collections, products] = await Promise.all([safe(catalogApi.collections(), []), safe(catalogApi.products({ pageSize: 96 }), null)]);
  let items = products?.items ?? [];
  if (products && products.total > items.length) {
    const pages = Math.min(20, Math.ceil(products.total / 96));
    for (let p = 2; p <= pages; p++) {
      const more = await safe(catalogApi.products({ page: p, pageSize: 96 }), null);
      if (more) items = items.concat(more.items);
    }
  }
  return [
    ...fixed,
    ...collections.map((c) => ({ url: `${SITE_URL}/${c.isDrop ? "drop" : "c"}/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...items.map((p) => ({ url: `${SITE_URL}/p/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7, images: p.images.map((i) => i.url).filter(Boolean) })),
  ];
}
