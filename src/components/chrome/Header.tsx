"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { useUI } from "@/context/UIContext";
import { dropPhase } from "@/lib/drop";
import { NAV_CATEGORIES, subcategoryHref } from "@/lib/nav";
import { AccountIcon, BagIcon, BookmarkIcon, MenuIcon, SearchIcon } from "./Icons";
import { MegaFeature } from "./MegaFeature";

/** Main nav (§5): New In · Women · Men · Bags & Accessories · Shoes · Drop 04 (when live) · About. */
export function useNav() {
  const { collection, settings, drop, navCategories } = useSettings();
  const categories = NAV_CATEGORIES.map((n) => ({
    slug: n.slug,
    label: collection(n.slug)?.name ?? n.label,
    href: `/c/${n.slug}`,
    subs: navCategories[n.slug] ?? [],
  }));
  const phase = dropPhase(settings.drop).phase;
  const dropLink =
    settings.drop && (phase === "live" || phase === "upcoming")
      ? { href: `/drop/${settings.drop.collectionSlug}`, label: (drop?.name ?? "Drop").split(/\s+[—/]\s+/)[0], title: settings.drop.title, phase }
      : null;
  return { categories, dropLink };
}

const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;

/**
 * Store header (§5). Desktop 92px: logo left, nav + icons right. Home: transparent over the hero with white
 * text until the page scrolls 40px. Everywhere: hides on scroll down, returns on scroll up. Category links
 * open the mega menu (hover or click; Esc / outside click closes). Mobile 56px: menu · logo · search + bag.
 */
export function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const { categories, dropLink } = useNav();
  const { setSearchOpen, setMenuOpen, menuOpen, searchOpen } = useUI();
  const { count, setDrawerOpen, drawerOpen } = useCart();
  const { collection, drop } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const root = useRef<HTMLElement>(null);

  // scroll: solid after 40px, hide on the way down, show on the way up
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const run = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 160);
        last = y;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(run);
      }
    };
    run();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMega(null), [pathname]);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const openSoon = (slug: string) => {
    clear();
    timer.current = window.setTimeout(() => setMega(slug), mega ? 0 : OPEN_DELAY);
  };
  const closeSoon = useCallback(() => {
    clear();
    timer.current = window.setTimeout(() => setMega(null), CLOSE_DELAY);
  }, []);

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(null);
        root.current?.querySelector<HTMLElement>(`[data-mega="${mega}"]`)?.focus();
      }
    };
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setMega(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [mega]);

  const transparent = home && !scrolled && !mega;
  const pinned = !!mega || menuOpen || searchOpen || drawerOpen;
  const isHidden = hidden && !pinned;

  // sticky bars below the header (listing count bar, PDP info panel) follow its visibility via --hdr-offset
  useEffect(() => {
    document.documentElement.dataset.header = isHidden ? "hidden" : "shown";
  }, [isHidden]);
  const active = categories.find((c) => c.slug === mega);
  const dropCol = drop ?? collection("new-in");
  const bagLabel = `Bag, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <>
      <header
        ref={root}
        className={`site-header${home ? " site-header--home" : ""}${transparent ? " is-transparent on-dark" : ""}${isHidden ? " is-hidden" : ""}${mega ? " has-mega" : ""}`}
        onMouseLeave={closeSoon}
        onMouseEnter={clear}
      >
        <div className="site-header__bar">
          {/* mobile: menu */}
          <button type="button" className="hdr-icon show-mobile" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <MenuIcon />
          </button>

          <Link href="/" className="site-header__logo" aria-label="Amerapelle — home">
            <Logo size={40} tone={transparent ? "light" : "color"} className="hide-mobile" />
            <Logo size={28} tone={transparent ? "light" : "color"} className="show-mobile" />
          </Link>

          <nav aria-label="Main" className="site-nav hide-mobile">
            <ul className="site-nav__list">
              <li>
                <Link href="/c/new-in" className={pathname === "/c/new-in" ? "is-active" : undefined} onMouseEnter={closeSoon}>
                  New In
                </Link>
              </li>
              {categories.map((c) => {
                const on = mega === c.slug || pathname === c.href;
                return (
                  <li key={c.slug} onMouseEnter={() => openSoon(c.slug)}>
                    <button
                      type="button"
                      data-mega={c.slug}
                      className={on ? "is-active" : undefined}
                      aria-expanded={mega === c.slug}
                      aria-controls="mega-panel"
                      onClick={() => setMega((m) => (m === c.slug ? null : c.slug))}
                    >
                      {c.label}
                    </button>
                  </li>
                );
              })}
              {dropLink && (
                <li>
                  <Link href={dropLink.href} className={pathname.startsWith("/drop/") ? "is-active" : undefined} onMouseEnter={closeSoon}>
                    {dropLink.label}
                  </Link>
                </li>
              )}
              <li>
                <Link href="/about" className={pathname === "/about" ? "is-active" : undefined} onMouseEnter={closeSoon}>
                  About
                </Link>
              </li>
            </ul>
          </nav>

          <div className="site-header__icons">
            <button type="button" className="hdr-icon" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
            </button>
            <Link href="/account" className="hdr-icon hide-mobile" aria-label="Account">
              <AccountIcon />
            </Link>
            <Link href="/account/wishlist" className="hdr-icon hide-mobile" aria-label="Wishlist">
              <BookmarkIcon />
            </Link>
            <button type="button" className="hdr-icon hdr-bag" aria-label={bagLabel} onClick={() => setDrawerOpen(true)}>
              <BagIcon />
              {count > 0 && <span className="hdr-bag__count tnum" aria-hidden>{count}</span>}
            </button>
          </div>
        </div>

        {/* Mega menu (§5): two link columns + two 16:10 feature images */}
        <div id="mega-panel" className={`mega${active ? " is-open" : ""}`} hidden={!active} onMouseEnter={clear}>
          {active && (
            <div className="mega__inner">
              <ul className="mega__col">
                <li><Link href={active.href}>All {active.label}</Link></li>
                {active.subs.map((s) => (
                  <li key={s}><Link href={subcategoryHref(active.slug, s)}>{s}</Link></li>
                ))}
              </ul>
              <ul className="mega__col">
                <li><Link href="/c/new-in">New In</Link></li>
                {dropLink && <li><Link href={dropLink.href}>{dropLink.label} — {dropLink.title}</Link></li>}
                <li><Link href="/c/sale">Last pieces</Link></li>
                <li><Link href="/reel">Shop the reel</Link></li>
                <li><Link href="/contact">Style advice</Link></li>
              </ul>
              <div className="mega__features">
                <MegaFeature href={active.href} image={collection(active.slug)?.heroImageUrl} caption={`Discover ${active.label}`} />
                {dropCol && (
                  <MegaFeature
                    href={dropLink && dropCol.slug === drop?.slug ? dropLink.href : `/c/${dropCol.slug}`}
                    image={dropCol.heroImageUrl}
                    caption={dropLink && dropCol.slug === drop?.slug ? `${dropLink.label} — ${dropLink.title}` : dropCol.name}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </header>
      <div className={`page-dim${mega ? " is-on" : ""}`} aria-hidden onClick={() => setMega(null)} />
    </>
  );
}
