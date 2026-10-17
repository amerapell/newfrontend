"use client";
import Link from "next/link";
import { BookmarkIcon } from "@/components/chrome/Icons";
import { useWishlist } from "@/context/WishlistContext";
import { naira } from "@/lib/format";
import { iconKind } from "@/lib/product";
import type { ProductCard as Card } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export const CARD_SIZES = "(max-width: 1023px) 50vw, 25vw";
const FEATURED_SIZES = "(max-width: 1023px) 100vw, 50vw";
const MAX_BARS = 5;

/** One 13px label, top-left of the image (§6): New · Notify me (sold out) · Last pieces · Drop. Sale has none. */
export function cardLabel(p: Pick<Card, "badge" | "inStock">): string | null {
  if (!p.inStock || p.badge === "SOLD_OUT") return "Notify me";
  switch (p.badge) {
    case "LOW_STOCK":
      return "Last pieces";
    case "DROP":
      return "Drop";
    case "NEW":
      return "New";
    default:
      return null;
  }
}

/** Bookmark (ACC-3 wishlist), filled when saved. Guests save locally, customers to their account. */
export function WishlistButton({ product, className = "" }: { product: Pick<Card, "id" | "name">; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  return (
    <button
      type="button"
      className={`wish-btn${saved ? " is-on" : ""} ${className}`}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      aria-pressed={saved}
      onClick={() => void toggle(product)}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

/** "₦ 62,500 ₦ 78,000" — sale price in ink, the compare-at struck in grey after it (§6). */
export function PriceLine({ priceKobo, compareAtKobo, className = "" }: { priceKobo: number; compareAtKobo: number | null | undefined; className?: string }) {
  const sale = compareAtKobo != null && compareAtKobo > priceKobo;
  return (
    <span className={`price-line tnum ${className}`}>
      {sale && <span className="sr-only">Sale price </span>}
      {naira(priceKobo)}
      {sale && (
        <>
          {" "}
          <s className="price-line__was">
            <span className="sr-only">was </span>
            {naira(compareAtKobo)}
          </s>
        </>
      )}
    </span>
  );
}

/**
 * Product card (§6): 4:5 image on --stage (cross-fades to the second, worn/detail image on desktop hover),
 * one 13px label top-left, bookmark top-right on hover, caption name / material / price / colour bars.
 *  variant="featured" — the large listing piece: shows the worn image.
 *  variant="compact"  — search drawer.
 */
export function ProductCard({
  product: p,
  priority,
  sizes,
  variant = "default",
  className = "",
}: {
  product: Card;
  priority?: boolean;
  sizes?: string;
  variant?: "default" | "featured" | "compact";
  className?: string;
}) {
  const href = `/p/${p.slug}`;
  const kind = iconKind(p);
  const featured = variant === "featured";
  const label = cardLabel(p);
  const first = p.images[0];
  const second = p.images[1];
  const main = featured && second?.url ? second : first;
  const imgSizes = sizes ?? (featured ? FEATURED_SIZES : CARD_SIZES);
  const bars = p.colours.slice(0, MAX_BARS);
  const more = p.colours.length - bars.length;

  return (
    <article className={`pcard pcard--${variant} ${className}`}>
      <Link href={href} className="pcard__link">
        <span className="pcard__media">
          <ProductImage src={main?.url} alt={main?.alt || p.name} kind={kind} priority={priority} sizes={imgSizes} className="pcard__img" />
          {!featured && second?.url && <ProductImage src={second.url} alt="" kind={kind} sizes={imgSizes} className="pcard__img pcard__img--alt" />}
          {label && <span className="pcard__label">{label}</span>}
        </span>
        <span className="pcard__cap">
          <span className="pcard__name">{p.name}</span>
          <PriceLine priceKobo={p.priceKobo} compareAtKobo={p.compareAtKobo} className="pcard__price" />
          {bars.length > 1 && (
            <span className="pcard__bars">
              <span className="sr-only">{`${p.colours.length} colours: ${p.colours.map((c) => c.name).join(", ")}`}</span>
              {bars.map((c, i) => (
                <span key={c.name} className={`pcard__bar${i === 0 ? " is-on" : ""}`} style={{ background: c.hex }} title={c.name} aria-hidden />
              ))}
              {more > 0 && <span className="pcard__more" aria-hidden>+{more}</span>}
            </span>
          )}
        </span>
      </Link>
      <WishlistButton product={p} className="pcard__wish" />
    </article>
  );
}
