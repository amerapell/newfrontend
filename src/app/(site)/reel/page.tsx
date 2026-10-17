import type { Metadata } from "next";
import { ShopTheReel } from "@/components/motion/ShopTheReel";
import { catalogApi, safe } from "@/lib/api";
import { getSettings } from "@/lib/server-data";
import type { Product } from "@/lib/types";

export const revalidate = 60;
export const metadata: Metadata = { title: "Shop the reel", description: "Swipe through this week's looks and add straight to your bag." };

export default async function ReelPage() {
  const settings = await getSettings();
  const source = settings.drop?.collectionSlug ?? "new-in";
  const list =
    (await safe(catalogApi.collection(source, { pageSize: 6, inStock: true }).then((r) => r.products.items), [])) ||
    [];
  const fallback = list.length ? list : await safe(catalogApi.products({ pageSize: 6, sort: "newest", inStock: true }).then((r) => r.items), []);
  const looks = (await Promise.all(fallback.slice(0, 6).map((p) => safe(catalogApi.product(p.slug), null)))).filter(Boolean) as Product[];
  return (
    <main id="main" tabIndex={-1}>
      <ShopTheReel looks={looks} />
    </main>
  );
}
