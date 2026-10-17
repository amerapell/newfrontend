import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product/ProductView";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductImage } from "@/components/product/ProductImage";
import { ServiceBand } from "@/components/product/ServiceBand";
import { catalogApi, safe, ApiError } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { getSettings } from "@/lib/server-data";
import type { Product, ProductCard as Card } from "@/lib/types";

export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<Product | null> {
  try {
    return await catalogApi.product(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await safe(load(slug), null);
  if (!p) return { title: "Product" };
  const price = `₦${Math.round(p.priceKobo / 100).toLocaleString("en-NG")}`;
  const description = p.seo.description || `${p.name} — ${price}. ${p.description}`.slice(0, 160);
  const image = p.seo.ogImage ?? p.images.find((i) => i.url)?.url;
  return {
    title: p.seo.title || p.name,
    description,
    alternates: { canonical: `${SITE_URL}/p/${p.slug}` },
    openGraph: {
      type: "website",
      title: `${p.name} — ${price}`,
      description,
      url: `${SITE_URL}/p/${p.slug}`,
      images: image ? [{ url: image, alt: p.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: `${p.name} — ${price}`, description, images: image ? [image] : undefined },
    other: {
      "product:price:amount": String(Math.round(p.priceKobo / 100)),
      "product:price:currency": "NGN",
      "og:price:amount": String(Math.round(p.priceKobo / 100)),
      "og:price:currency": "NGN",
    },
  };
}

function jsonLd(p: Product) {
  const offers = p.variants.length
    ? p.variants.map((v) => ({
        "@type": "Offer",
        sku: v.sku,
        price: (v.priceKobo / 100).toFixed(2),
        priceCurrency: "NGN",
        availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: `${SITE_URL}/p/${p.slug}`,
        itemCondition: "https://schema.org/NewCondition",
      }))
    : [{ "@type": "Offer", price: (p.priceKobo / 100).toFixed(2), priceCurrency: "NGN", availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${SITE_URL}/p/${p.slug}` }];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.variants[0]?.sku ?? p.number,
    mpn: p.number,
    brand: { "@type": "Brand", name: "Amerapelle" },
    image: p.images.map((i) => i.url).filter(Boolean),
    material: p.material ?? undefined,
    color: p.options.colours.map((c) => c.name).join(", ") || undefined,
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", priceCurrency: "NGN", lowPrice: Math.min(...p.variants.map((v) => v.priceKobo)) / 100, highPrice: Math.max(...p.variants.map((v) => v.priceKobo)) / 100, offerCount: offers.length, offers },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let p: Product | null = null;
  try {
    p = await load(slug);
  } catch {
    // API unreachable — don't cache a 404 for a real product
    return (
      <div className="container page-msg">
        <h1 className="t-display">One moment.</h1>
        <p>We couldn&apos;t load this piece right now. Please refresh in a moment.</p>
        <Link href="/" className="u-link">Back to the home page</Link>
      </div>
    );
  }
  if (!p) notFound();

  const [zones, settings, alsoLike] = await Promise.all([
    safe(catalogApi.zones(), []),
    getSettings(),
    (async (): Promise<Card[]> => {
      const col = p!.collections.find((c) => !["new-in", "sale"].includes(c.slug)) ?? p!.collections[0];
      if (!col) return [];
      const r = await safe(catalogApi.collection(col.slug, { pageSize: 16 }), null);
      const exclude = new Set([p!.id, ...p!.related.map((x) => x.id)]);
      return (r?.products.items ?? []).filter((x) => !exclude.has(x.id)).slice(0, 8);
    })(),
  ]);
  const activeZones = zones.filter((z) => z.active);
  const details = p.images.slice(2, 4).filter((i) => i.url);

  return (
    <>
      <ProductView product={p} zones={activeZones} />
      <ProductTabs product={p} zones={activeZones} />
      {details.length > 0 && (
        <section className="pdp-details" aria-labelledby="details-title">
          <h2 id="details-title" className="t-title container">Details</h2>
          <div className={`pdp-details__imgs pdp-details__imgs--${details.length}`}>
            {details.map((img) => (
              <div key={img.url} className="pdp-details__img">
                <ProductImage src={img.url} alt={img.alt || p!.name} sizes="(max-width: 1023px) 100vw, 50vw" />
              </div>
            ))}
          </div>
        </section>
      )}
      <ServiceBand exchangeDays={settings.exchangeWindowDays} />
      <ProductCarousel title="Complete the look" products={p.related.slice(0, 8)} />
      <ProductCarousel title="You may also like" products={alsoLike} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p)).replace(/</g, "\\u003c") }} />
    </>
  );
}
