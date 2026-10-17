"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ProductCard } from "@/components/product/ProductCard";
import { useSettings } from "@/context/SettingsContext";
import { useUI } from "@/context/UIContext";
import { catalogApi } from "@/lib/api";
import type { ProductCard as Card, SearchSuggest } from "@/lib/types";
import { SearchIcon } from "./Icons";

const POPULAR = ["Leather jacket", "Silk", "Tote", "Blazer", "Mule"];

/**
 * Search drawer (§5): input with a single bottom ink rule + search icon, "Suggestions" (13px grey label +
 * text links) and "Products" (2-column grid of compact cards). Debounced instant results (CAT-4).
 */
export function SearchDrawer() {
  const { searchOpen, setSearchOpen } = useUI();
  const { collections } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchSuggest | null>(null);
  const [fresh, setFresh] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const close = () => setSearchOpen(false);

  useEffect(() => setSearchOpen(false), [pathname, setSearchOpen]);

  // default products: the newest pieces
  useEffect(() => {
    if (!searchOpen || fresh.length) return;
    catalogApi
      .products({ pageSize: 4, sort: "newest", inStock: true })
      .then((r) => setFresh(r.items))
      .catch(() => {});
  }, [searchOpen, fresh.length]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      return;
    }
    const t = window.setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      try {
        setRes(await catalogApi.suggest(term, ctrl.current.signal));
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(t);
  }, [q]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    close();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const products = res ? res.products.slice(0, 6) : fresh;
  const suggestions = res
    ? res.collections.map((c) => ({ label: c.name, href: `/c/${c.slug}` }))
    : POPULAR.map((t) => ({ label: t, href: `/search?q=${encodeURIComponent(t)}` })).concat(
        collections.filter((c) => c.slug === "new-in").map((c) => ({ label: c.name, href: `/c/${c.slug}` })),
      );
  const empty = res && !res.products.length && !res.collections.length;

  return (
    <Drawer open={searchOpen} onClose={close} title="Search" hideTitle className="search-drawer" closeLabel="Close search">
      <form role="search" className="search-drawer__form" onSubmit={submit}>
        <label htmlFor="search-q" className="sr-only">Search</label>
        <input
          id="search-q"
          data-autofocus
          type="search"
          autoComplete="off"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-controls="search-results"
        />
        <button type="submit" className="search-drawer__go" aria-label="Search">
          <SearchIcon />
        </button>
      </form>

      <div id="search-results" className="search-drawer__results" aria-busy={loading} aria-live="polite">
        {empty && <p>Nothing for “{q.trim()}”. Try “leather”, “silk” or “tote”.</p>}
        {suggestions.length > 0 && (
          <section className="search-drawer__group" aria-label="Suggestions">
            <h3 className="search-drawer__label">Suggestions</h3>
            <ul className="search-drawer__sugg">
              {suggestions.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} onClick={close}>{s.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {products.length > 0 && (
          <section className="search-drawer__group" aria-label="Products">
            <h3 className="search-drawer__label">Products</h3>
            <ul className="search-drawer__grid">
              {products.map((p) => (
                <li key={p.id} onClick={close}>
                  <ProductCard product={p} variant="compact" sizes="(max-width: 767px) 50vw, 15vw" />
                </li>
              ))}
            </ul>
            {res && (
              <button type="button" className="u-link search-drawer__all" onClick={() => submit()}>
                See all results for “{q.trim()}”
              </button>
            )}
          </section>
        )}
      </div>
    </Drawer>
  );
}
