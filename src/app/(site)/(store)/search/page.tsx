import type { Metadata } from "next";
import { CategoryHeader } from "@/components/shop/CategoryHeader";
import { ShopView } from "@/components/shop/ShopView";
import { catalogApi, safe } from "@/lib/api";
import { parseFilters, type SearchParams } from "@/lib/filters";
import type { Facets } from "@/lib/types";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { filters, page } = parseFilters(sp);
  const q = filters.q ?? "";
  const res = q ? await safe(catalogApi.products(filters), null) : null;
  const items = res?.items ?? [];
  const facets: Facets = {
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: Array.from(new Map(items.flatMap((p) => p.colours).map((c) => [c.name, c])).values()),
    priceRangeKobo: [0, 500_000_00],
  };

  return (
    <>
      <CategoryHeader title={q ? <>Results for “{q}”</> : "Search"} intro={q ? undefined : "Search pieces, materials or collections."} />
      {q ? (
        <ShopView facets={facets} products={items} total={res?.total ?? 0} page={page} featured={false} />
      ) : (
        <form action="/search" role="search" className="container search-page__form">
          <div className="line-field">
            <label htmlFor="q" className="sr-only">Search</label>
            <input id="q" name="q" placeholder="Search" />
            <button type="submit">Search</button>
          </div>
        </form>
      )}
    </>
  );
}
