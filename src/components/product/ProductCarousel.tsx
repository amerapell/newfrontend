"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowIcon } from "@/components/chrome/Icons";
import type { ProductCard as Card } from "@/lib/types";
import { ProductCard } from "./ProductCard";

/**
 * Product carousel (§6): 20px title + optional 14px subtitle at the gutter, "⟵ ⟶" arrows right-aligned on
 * the same row; a row of 4 cards (2 on mobile, swipe), edge-to-edge, scroll-snap.
 */
export function ProductCarousel({ title, subtitle, products, className = "" }: { title: string; subtitle?: string; products: Card[]; className?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const id = useId();
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  if (!products.length) return null;
  const go = (d: 1 | -1) => track.current?.scrollBy({ left: d * track.current.clientWidth, behavior: "smooth" });
  return (
    <section className={`carousel ${className}`} aria-labelledby={id}>
      <div className="carousel__head container">
        <div>
          <h2 id={id} className="t-title">{title}</h2>
          {subtitle && <p className="carousel__sub">{subtitle}</p>}
        </div>
        <div className="carousel__arrows">
          <button type="button" aria-label="Previous" disabled={edge.start} onClick={() => go(-1)}><ArrowIcon dir="left" /></button>
          <button type="button" aria-label="Next" disabled={edge.end} onClick={() => go(1)}><ArrowIcon /></button>
        </div>
      </div>
      <ul ref={track} className="carousel__track" onScroll={update}>
        {products.map((p) => (
          <li key={p.id} className="carousel__cell">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
