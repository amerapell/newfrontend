"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Facets, ProductCard as Card } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { ProductGrid } from "./ProductGrid";

/**
 * Listing body (§6/§7): sticky count + Filter | Sort bar → edge-to-edge grid with featured pieces →
 * "Load more" (secondary, centred) + "Showing 24 of 61". The URL keeps ?page=.
 */
export function ShopView({ slug, facets, products, total, page, featured = true }: { slug?: string; facets: Facets; products: Card[]; total: number; page: number; featured?: boolean }) {
  const shown = products.length;
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0, rootMargin: "-120px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div ref={sentinel} aria-hidden />
      <div className={`shop-bar${stuck ? " is-stuck" : ""}`}>
        <FilterBar facets={facets} slug={slug} total={total} />
      </div>
      <section className="shop-grid" aria-label="Products">
        {products.length ? (
          <ProductGrid products={products} featured={featured} />
        ) : (
          <div className="shop-empty container">
            <p>Nothing here yet.</p>
            <Link href="/c/new-in" className="u-link">Discover New In</Link>
          </div>
        )}
        {total > 0 && (
          <div className="load-more">
            {shown < total && <LoadMoreLink page={page} />}
            <span className="t-small t-grey">Showing {shown} of {total}</span>
          </div>
        )}
      </section>
    </>
  );
}

function LoadMoreLink({ page }: { page: number }) {
  const params = useSearchParams();
  const next = new URLSearchParams(params.toString());
  next.set("page", String(page + 1));
  return (
    <Link href={`?${next.toString()}`} scroll={false} className="btn btn--secondary btn--center load-more__btn" prefetch={false}>
      Load more
    </Link>
  );
}
