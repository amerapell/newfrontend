import { ProductCard } from "@/components/product/ProductCard";
import type { ProductCard as Card } from "@/lib/types";

const EVERY = 8;

export type GridCell = { product: Card; featured: boolean };

const eligible = (p: Card) => p.images.filter((i) => i.url).length >= 2 && p.inStock;

/**
 * §6 featured piece: after every 8 products (two desktop rows) one product is shown large. It is taken from
 * the products still to come: the next one the admin flagged `featured` (with a worn image, in stock),
 * else the next one with ≥ 2 images that is not sold out. No candidate → the grid simply continues.
 */
export function layoutWithFeatured(products: Card[], withFeatured = true): GridCell[] {
  if (!withFeatured) return products.map((product) => ({ product, featured: false }));
  const rest = products.slice();
  const out: GridCell[] = [];
  let run = 0;
  while (rest.length) {
    if (run === EVERY) {
      run = 0;
      let i = rest.findIndex((p) => p.featured && eligible(p));
      if (i < 0) i = rest.findIndex(eligible);
      if (i >= 0) {
        out.push({ product: rest.splice(i, 1)[0], featured: true });
        continue;
      }
    }
    out.push({ product: rest.shift()!, featured: false });
    run++;
  }
  return out;
}

/** Edge-to-edge listing grid (§6): 4 columns ≥1024px, 2 below, no gaps; featured rows centred at 50%. */
export function ProductGrid({ products, featured = true, className = "", stagger }: { products: Card[]; featured?: boolean; className?: string; stagger?: boolean }) {
  const cells = layoutWithFeatured(products, featured);
  return (
    <ul className={`pgrid${stagger ? " pgrid--stagger" : ""} ${className}`}>
      {cells.map(({ product, featured: big }, i) => (
        <li key={product.id} className={`pgrid__cell${big ? " pgrid__cell--featured" : ""}`} style={stagger ? { animationDelay: `${Math.min(i, 12) * 60}ms` } : undefined}>
          <ProductCard product={product} priority={i < 4} variant={big ? "featured" : "default"} />
        </li>
      ))}
    </ul>
  );
}
