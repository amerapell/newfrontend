import type { Collection, ProductCard } from "./types";
import { categoryOf } from "./product";

/** Main navigation (design v3 §5): categories with a mega menu, in this order. */
export const NAV_CATEGORIES = [
  { slug: "women", label: "Women" },
  { slug: "men", label: "Men" },
  { slug: "bags-accessories", label: "Bags & Accessories" },
  { slug: "shoes", label: "Shoes" },
] as const;

/** Sub-categories per collection slug, derived from the product type after "·" in `material`. */
export type NavCategories = Record<string, string[]>;

/** Distinct product types of a list, most frequent first ("Outerwear", "Dresses" …). */
export function subcategoriesOf(products: Pick<ProductCard, "material">[], max = 8): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const c = categoryOf(p.material);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([c]) => c);
}

/** Listing URL for a sub-category (the API's `q` search narrows the collection). */
export function subcategoryHref(slug: string, category: string) {
  return `/c/${slug}?q=${encodeURIComponent(category)}`;
}

/** Home hero order (§8): drop collection (live or upcoming) first, then `homeOrder` ascending. */
export function homePanels(collections: Collection[], dropSlug: string | null | undefined): Collection[] {
  const drop = collections.find((c) => c.slug === dropSlug) ?? null;
  const rest = collections
    .filter((c) => c.homeOrder != null && c.slug !== drop?.slug && !c.isDrop)
    .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0));
  return drop ? [drop, ...rest] : rest;
}
