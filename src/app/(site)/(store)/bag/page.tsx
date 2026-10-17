import type { Metadata } from "next";
import { BagView } from "@/components/cart/BagView";
import { catalogApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default async function BagPage() {
  const alsoLike = await safe(catalogApi.collection("new-in", { pageSize: 8, sort: "newest", inStock: true }).then((r) => r.products.items), []);
  return <BagView alsoLike={alsoLike} />;
}
