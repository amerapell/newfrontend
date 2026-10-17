import { catalogApi } from "@/lib/api";
import type { Product } from "@/lib/types";

const cache = new Map<string, Promise<Product>>();

/** Fetch (once) the full product for bag variant editing / save for later. */
export function loadProduct(slug: string): Promise<Product> {
  let p = cache.get(slug);
  if (!p) {
    p = catalogApi.product(slug);
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}
