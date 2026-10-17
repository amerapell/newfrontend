"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon } from "@/components/chrome/Icons";

export type RailLink = { label: string; href: string; active: boolean };

/**
 * Category header (§6): 80px / 60px padding at the gutter, 26px H1, 14px intro (max 450px); below, a
 * full-width sub-category rail between 1px --hair rules (60px, links 20px apart, active underlined) that
 * scrolls horizontally with a "⟶" button at the right edge when it overflows.
 */
export function CategoryHeader({ title, intro, rail }: { title: React.ReactNode; intro?: string | null; rail?: RailLink[] }) {
  return (
    <>
      <header className="cat-head container">
        <h1 className="t-display">{title}</h1>
        {intro && <p className="cat-head__intro">{intro}</p>}
      </header>
      {rail && rail.length > 1 && <Rail links={rail} />}
    </>
  );
}

function Rail({ links }: { links: RailLink[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return (
    <nav className="rail" aria-label="Categories">
      <ul ref={ref} className="rail__list">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={l.active ? "is-active" : undefined} aria-current={l.active ? "page" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      {more && (
        <button type="button" className="rail__more" aria-label="More categories" onClick={() => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.6, behavior: "smooth" })}>
          <ArrowIcon />
        </button>
      )}
    </nav>
  );
}
