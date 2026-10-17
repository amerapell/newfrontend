"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { subcategoryHref } from "@/lib/nav";
import { useNav } from "./Header";
import { ArrowIcon, ChevronRight, CloseIcon } from "./Icons";
import { useDialog } from "./useDialog";

/**
 * Mobile menu (§5): full-screen --bg panel, 20px links stacked between 1px --hair rules; categories open a
 * sub-level that slides in from the right with a "⟵ Back" row; account / wishlist / contact at the bottom.
 */
export function MobileMenu() {
  const { menuOpen, setMenuOpen } = useUI();
  const { categories, dropLink } = useNav();
  const { user } = useAuth();
  const pathname = usePathname();
  const [level, setLevel] = useState<string | null>(null);
  const close = () => setMenuOpen(false);
  const ref = useDialog(menuOpen, close);
  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);
  useEffect(() => {
    if (!menuOpen) setLevel(null);
  }, [menuOpen]);
  if (!menuOpen) return null;
  const sub = categories.find((c) => c.slug === level);

  return (
    <div ref={ref} className="mmenu" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="mmenu__head">
        <button type="button" className="hdr-icon" aria-label="Close menu" onClick={close}>
          <CloseIcon />
        </button>
        <Link href="/" className="mmenu__logo" aria-label="Amerapelle — home" onClick={close}>
          <Logo size={28} />
        </Link>
        <span className="hdr-icon" aria-hidden />
      </div>

      <div className={`mmenu__levels${sub ? " is-sub" : ""}`}>
        <nav aria-label="Mobile" className="mmenu__level" aria-hidden={!!sub} inert={sub ? true : undefined}>
          <ul className="mmenu__list">
            <li><Link href="/c/new-in" className="mmenu__link">New In</Link></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <button type="button" className="mmenu__link" onClick={() => setLevel(c.slug)} aria-expanded={level === c.slug}>
                  <span>{c.label}</span>
                  <ChevronRight />
                </button>
              </li>
            ))}
            {dropLink && <li><Link href={dropLink.href} className="mmenu__link">{dropLink.label} — {dropLink.title}</Link></li>}
            <li><Link href="/reel" className="mmenu__link">Shop the reel</Link></li>
            <li><Link href="/about" className="mmenu__link">About</Link></li>
          </ul>
          <ul className="mmenu__foot">
            <li><Link href="/account">{user ? `Account · ${user.firstName}` : "Sign in"}</Link></li>
            <li><Link href="/account/wishlist">Wishlist</Link></li>
            <li><Link href="/orders/lookup">Track an order</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>

        <div className="mmenu__level mmenu__level--sub" aria-hidden={!sub} inert={sub ? undefined : true}>
          {sub && (
            <>
              <button type="button" className="mmenu__back" onClick={() => setLevel(null)}>
                <ArrowIcon dir="left" /> <span>Back</span>
              </button>
              <ul className="mmenu__list">
                <li><Link href={sub.href} className="mmenu__link">All {sub.label}</Link></li>
                {sub.subs.map((s) => (
                  <li key={s}><Link href={subcategoryHref(sub.slug, s)} className="mmenu__link">{s}</Link></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
