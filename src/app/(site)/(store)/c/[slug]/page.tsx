import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryHeader, type RailLink } from "@/components/shop/CategoryHeader";
import { ShopView } from "@/components/shop/ShopView";
import { catalogApi, safe, ApiError } from "@/lib/api";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { SITE_URL } from "@/lib/env";
import { subcategoriesOf, subcategoryHref } from "@/lib/nav";
import type { CollectionPage } from "@/lib/types";

// Filters live in the query string, so this route renders per request;
// the underlying API fetches are still cached (revalidate 60s, tagged).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await safe(catalogApi.collection(slug, { pageSize: 1 }), null);
  if (!data) return { title: "Shop" };
  const c = data.collection;
  const description = c.description ?? `${c.name} at Amerapelle — limited runs, delivered across Nigeria.`;
  return {
    title: c.name,
    description,
    alternates: { canonical: `${SITE_URL}/c/${slug}` },
    openGraph: { title: `${c.name} — Amerapelle`, description, url: `${SITE_URL}/c/${slug}`, images: c.heroImageUrl ? [c.heroImageUrl] : undefined },
  };
}

export default async function CollectionPageRoute({ params, searchParams }: Props) {
  const { slug } = await params;
  const { filters, page } = parseFilters(await searchParams);
  let data: CollectionPage | null = null;
  try {
    data = await catalogApi.collection(slug, filters);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
  }
  if (!data) {
    return (
      <div className="container page-msg">
        <h1 className="t-display">The shop is resting.</h1>
        <p>We couldn&apos;t load this collection right now. Please try again in a moment.</p>
        <Link href="/" className="u-link">Back to the home page</Link>
      </div>
    );
  }
  const { collection: c, products, facets } = data;
  const all = await safe(catalogApi.collection(slug, { pageSize: 96 }), null);
  const subs = subcategoriesOf(all?.products.items ?? products.items);
  const q = filters.q?.toLowerCase();
  const rail: RailLink[] = [
    { label: `All ${c.name}`, href: `/c/${slug}`, active: !q },
    ...subs.map((s) => ({ label: s, href: subcategoryHref(slug, s), active: q === s.toLowerCase() })),
  ];

  return (
    <>
      <CategoryHeader title={c.name} intro={c.description} rail={rail} />
      <ShopView slug={slug} facets={facets} products={products.items} total={products.total} page={page} featured={!c.isDrop} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: c.name,
            url: `${SITE_URL}/c/${slug}`,
            breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: c.name }] },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
