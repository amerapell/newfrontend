"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkIcon, ChevronRight } from "@/components/chrome/Icons";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { useWishlist } from "@/context/WishlistContext";
import { arrivalFromEta, naira } from "@/lib/format";
import { availableFor, colourAvailable, fabricOf, iconKind, productUrl, variantFor, whatsappLink } from "@/lib/product";
import type { DeliveryZone, Product } from "@/lib/types";
import { cardLabel } from "./ProductCard";
import { Gallery } from "./Gallery";
import { ProductImage } from "./ProductImage";
import { SizeDrawer, type SizeDrawerMode, type SizeRow } from "./SizeDrawer";

const LOW_AT = 3;

/**
 * Product page top (§7 Product): the stage (gallery) with the info panel at the right gutter, the size
 * drawer, and the sticky bottom bar that appears once the info panel's button scrolls out of view.
 */
export function ProductView({ product: p, zones }: { product: Product; zones: DeliveryZone[] }) {
  const { settings } = useSettings();
  const { add, busy } = useCart();
  const { has, toggle } = useWishlist();
  const hasColours = p.options.colours.length > 0;
  const hasSizes = p.options.sizes.length > 0;
  const firstColour = p.options.colours.find((c) => colourAvailable(p, c))?.name ?? p.options.colours[0]?.name ?? null;
  const [colour, setColour] = useState<string | null>(firstColour);
  const [size, setSize] = useState<string | null>(hasSizes && p.options.sizes.length === 1 ? p.options.sizes[0] : null);
  const [drawer, setDrawer] = useState(false);
  const [mode, setMode] = useState<SizeDrawerMode>("sizes");
  const [more, setMore] = useState(false);
  const [stuck, setStuck] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  const variant = variantFor(p, colour, size);
  const ready = (!hasColours || !!colour) && (!hasSizes || !!size);
  const soldOut = ready ? !variant || variant.available <= 0 : !p.inStock;
  const price = variant?.priceKobo ?? p.priceKobo;
  const compareAt = variant?.compareAtKobo ?? p.compareAtKobo;
  const sale = compareAt != null && compareAt > price;
  const label = cardLabel({ badge: p.badge, inStock: p.inStock });
  const kind = iconKind(p);
  const saved = has(p.id);

  const images = useMemo(() => {
    const v = p.variants.find((x) => x.colour === colour && x.imageUrls.length);
    const scaleOf = (url: string) => p.images.find((x) => x.url === url)?.scale;
    if (v) return v.imageUrls.map((url, i) => ({ url, alt: i === 0 ? `${p.name} in ${colour}` : `${p.name} — view ${i + 1}`, scale: scaleOf(url) }));
    return p.images;
  }, [p, colour]);

  const sizeRows: SizeRow[] = p.options.sizes.map((s) => ({
    label: s,
    available: availableFor(p, colour, s),
    variantId: variantFor(p, colour, s)?.id ?? null,
  }));
  const zone = zones.find((z) => z.code === "LAGOS_ISLAND") ?? zones.find((z) => z.code !== "PICKUP");
  const arrival = zone ? arrivalFromEta(zone.etaText) : null;

  // sticky bottom bar once the main button has scrolled away
  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
      // extend the root far below the viewport so the state flips exactly when the button crosses the top
      // edge — even when a jump (restored scroll, anchor) skips over the viewport in one frame
      rootMargin: "0px 0px 100000px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pickColour = (name: string) => {
    if (name === colour) return;
    setColour(name);
    if (size && availableFor(p, name, size) <= 0) setSize(null);
  };

  const openSizes = () => {
    setMode("sizes");
    setDrawer(true);
  };

  const onPrimary = async () => {
    if (hasColours && !colour) return;
    if (hasSizes && !size) return openSizes();
    if (soldOut) {
      setMode("notify");
      setDrawer(true);
      return;
    }
    if (!variant || busy) return;
    await add(variant.id, 1, { label: p.name });
  };

  const primaryLabel = hasSizes && !size ? "Select a size" : soldOut ? "Notify me when available" : "Add to bag";
  const waText = `Hi Amerapelle, I'd like styling advice on the ${p.name}${colour ? ` (${colour}${size ? `, ${size}` : ""})` : ""}: ${productUrl(p.slug)}`;
  const colourThumbs = p.options.colours.map((c) => ({ c, img: p.variants.find((v) => v.colour === c.name && v.imageUrls.length)?.imageUrls[0] ?? null }));
  const withImages = colourThumbs.some((x) => x.img);
  const notifyLabel = `${p.name}${colour && p.options.colours.length > 1 ? ` in ${colour}` : ""}${size ? `, size ${size}` : ""}`;

  return (
    <div className="pdp">
      <div className="pdp__top">
        <div className="pdp__gallery">
          <Gallery name={p.name} images={images} kind={kind} fadeKey={colour ?? "default"} />
        </div>

        <aside className="pdp__info" aria-label="Product information">
          {label && <p className="pdp__label">{label}</p>}
          <div className="pdp__name-row">
            <h1 className="pdp__name">{p.name}</h1>
            <button type="button" className={`wish-btn wish-btn--inline${saved ? " is-on" : ""}`} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved} onClick={() => toggle(p)}>
              <BookmarkIcon filled={saved} />
            </button>
          </div>
          {p.material && <p className="t-grey">{fabricOf(p.material)}</p>}
          <p className="pdp__price tnum">
            {sale && <span className="sr-only">Sale price </span>}
            {naira(price)}
            {sale && (
              <>
                {" "}
                <s className="price-line__was">
                  <span className="sr-only">was </span>
                  {naira(compareAt)}
                </s>
              </>
            )}
          </p>
          <p className="t-small t-grey">Price includes VAT</p>

          <hr className="pdp__rule" />

          {hasColours && (
            <div className="pdp__colour">
              <p>Colour: {colour}</p>
              <div className={`pdp__swatches${withImages ? " pdp__swatches--img" : ""}`} role="radiogroup" aria-label="Colour">
                {colourThumbs.map(({ c, img }) => {
                  const on = c.name === colour;
                  const avail = colourAvailable(p, c);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${c.name}${avail ? "" : ", sold out"}`}
                      title={c.name}
                      className={`pdp__swatch${on ? " is-on" : ""}${avail ? "" : " is-out"}`}
                      onClick={() => pickColour(c.name)}
                    >
                      {withImages ? (
                        <span className="pdp__swatch-img"><ProductImage src={img} alt="" kind={kind} sizes="40px" iconSize={12} /></span>
                      ) : (
                        <span className="pdp__swatch-bar" style={{ background: c.hex }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(hasSizes || p.sizeGuide !== "NONE") && (
            <div className="pdp__size-row">
              {hasSizes ? (
                <button type="button" className="pdp__size" onClick={openSizes} aria-haspopup="dialog">
                  {size ? `Size: ${size}` : "Select size"} <ChevronRight />
                </button>
              ) : (
                <span />
              )}
              {p.sizeGuide !== "NONE" && (
                <button type="button" className="u-link" onClick={() => { setMode("guide"); setDrawer(true); }}>
                  Size guide
                </button>
              )}
            </div>
          )}

          <div ref={buyRef} className="pdp__buy">
            <button type="button" className="btn btn--primary btn--block" onClick={onPrimary} disabled={busy}>
              {busy ? "Adding…" : primaryLabel}
            </button>
          </div>

          {ready && !soldOut && arrival && zone && (
            <p className="t-small">Estimated delivery to {zone.name}: {arrival}</p>
          )}

          <div className="pdp__desc">
            <p className={more ? "" : "clamp-4"}>{p.description}</p>
            {p.description.length > 180 && (
              <button type="button" className="u-link" onClick={() => setMore((v) => !v)} aria-expanded={more}>
                {more ? "Read less" : "Read more"}
              </button>
            )}
          </div>

          <div className="pdp__links">
            <a href={whatsappLink(settings.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer">
              Ask a stylist on WhatsApp <ChevronRight />
            </a>
            <Link href="/policies/exchanges">
              Exchanges <ChevronRight />
            </Link>
          </div>
          <p className="t-small t-grey">
            {p.exchangeable
              ? `Unworn pieces can be exchanged for credit within ${settings.exchangeWindowDays} days.`
              : "Final sale — this piece can't be exchanged or refunded."}
          </p>
        </aside>
      </div>

      <div className={`buybar${stuck ? " is-on" : ""}`} aria-hidden={!stuck}>
        <p className="buybar__name hide-mobile">
          <span>{p.name}</span>
          <span className="tnum">{naira(price)}</span>
        </p>
        <div className="buybar__actions">
          {hasSizes && (
            <button type="button" className="buybar__size hide-mobile" onClick={openSizes} tabIndex={stuck ? 0 : -1}>
              {size ? `Size: ${size}` : "Select size"} <ChevronRight />
            </button>
          )}
          <button type="button" className="btn btn--primary buybar__btn" onClick={onPrimary} disabled={busy} tabIndex={stuck ? 0 : -1}>
            {primaryLabel}
          </button>
        </div>
      </div>

      <SizeDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        mode={mode}
        setMode={setMode}
        slug={p.slug}
        sizes={sizeRows}
        value={size}
        guide={p.sizeGuide}
        lowAt={LOW_AT}
        notifyVariantId={variant?.id ?? (!hasSizes ? p.variants.find((v) => !hasColours || v.colour === colour)?.id ?? null : null)}
        notifyLabel={notifyLabel}
        onPick={(s, out) => {
          setSize(s);
          if (out) setMode("notify");
          else setDrawer(false);
        }}
      />
    </div>
  );
}
