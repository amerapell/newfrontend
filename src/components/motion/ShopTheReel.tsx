"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { BagIcon, BookmarkIcon, CloseIcon, ShareIcon } from "@/components/chrome/Icons";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { naira } from "@/lib/format";
import { productUrl } from "@/lib/product";
import type { Product } from "@/lib/types";

const isVideo = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

/**
 * Shop the reel (§7, restyled): black, full-screen vertical looks; thin white progress bars on top; thin white
 * side actions (bookmark, share); the product panel is a --bg bottom sheet with name / price / size row and the
 * primary "Add to bag". Swipe, wheel and arrow keys move between looks.
 */
export function ShopTheReel({ looks }: { looks: Product[] }) {
  const router = useRouter();
  const { add, count, busy } = useCart();
  const { has, toggle } = useWishlist();
  const [i, setI] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [shared, setShared] = useState(false);
  const lastWheel = useRef(0);
  const touchY = useRef<number | null>(null);
  const n = looks.length;

  const go = useCallback(
    (d: number) => {
      setI((cur) => {
        const next = Math.max(0, Math.min(n - 1, cur + d));
        if (next !== cur) {
          setSize(null);
          setAdded(null);
          setShared(false);
        }
        return next;
      });
    },
    [n],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) { e.preventDefault(); go(1); }
      if (["ArrowUp", "PageUp", "k"].includes(e.key)) { e.preventDefault(); go(-1); }
      if (e.key === "Escape") router.push("/");
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, router]);

  if (!n) {
    return (
      <div className="reel reel--empty on-dark">
        <p className="t-display">No looks yet.</p>
        <Link href="/" className="u-link">Back to the store</Link>
      </div>
    );
  }

  const cur = looks[i];
  const sizes = cur.options.sizes;
  const needsSize = sizes.length > 0;
  const variant = cur.variants.find((v) => (needsSize ? v.size === size : true) && v.available > 0);
  const ready = (!needsSize || !!size) && !!variant;
  const saved = has(cur.id);

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheel.current < 800 || Math.abs(e.deltaY) < 20) return;
    lastWheel.current = now;
    go(e.deltaY > 0 ? 1 : -1);
  };

  const onAdd = async () => {
    if (!ready || busy) return;
    const ok = await add(variant!.id, 1, { silent: true, label: cur.name });
    if (ok) setAdded(`Added to your bag${needsSize ? ` · ${size}` : ""}`);
  };

  const share = async () => {
    const url = productUrl(cur.slug);
    try {
      if (navigator.share) await navigator.share({ title: cur.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div
      className="reel on-dark"
      onWheel={onWheel}
      onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (touchY.current == null) return;
        const dy = touchY.current - e.changedTouches[0].clientY;
        touchY.current = null;
        if (Math.abs(dy) > 50) go(dy > 0 ? 1 : -1);
      }}
      aria-roledescription="carousel"
      aria-label="Shop the reel"
    >
      <div className="reel__track" style={{ transform: `translateY(${-i * 100}%)` }}>
        {looks.map((p, k) => {
          const media = p.images[1]?.url || p.images[0]?.url;
          return (
            <div key={p.id} className="reel__look" aria-hidden={k !== i} role="group" aria-roledescription="slide" aria-label={`Look ${k + 1} of ${n}: ${p.name}`}>
              {media &&
                (isVideo(media) ? (
                  <video src={media} autoPlay={k === i} muted loop playsInline className="reel__media" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media} alt={p.images[0]?.alt || p.name} className="reel__media" loading={k === 0 ? "eager" : "lazy"} />
                ))}
            </div>
          );
        })}
      </div>

      <div className="reel__bars" aria-hidden>
        {looks.map((p, k) => (
          <div key={p.id} className="reel__bar">
            <div
              key={`${k}-${i}`}
              className={k === i && !paused && !size ? "reel__fill is-running" : "reel__fill"}
              style={{ transform: `scaleX(${k < i ? 1 : 0})` }}
              onAnimationEnd={() => k === i && i < n - 1 && !size && go(1)}
            />
          </div>
        ))}
      </div>

      <div className="reel__top">
        <Link href="/" className="reel__logo" aria-label="Amerapelle — home"><Logo size={26} tone="light" /></Link>
        <span className="reel__top-actions">
          <Link href="/bag" className="reel__icon" aria-label={`Bag, ${count} items`}>
            <BagIcon />
            {count > 0 && <span className="t-small tnum">{count}</span>}
          </Link>
          <button type="button" className="reel__icon" aria-label="Close" onClick={() => router.push("/")}>
            <CloseIcon />
          </button>
        </span>
      </div>

      <div className="reel__side">
        <button type="button" className="reel__icon" aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved} onClick={() => toggle(cur)}>
          <BookmarkIcon filled={saved} />
        </button>
        <button type="button" className="reel__icon" aria-label="Share" onClick={share}>
          <ShareIcon />
        </button>
        {shared && <span className="t-small reel__shared" role="status">Link copied</span>}
      </div>

      <div className="reel__sheet" onFocus={() => setPaused(true)} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="reel__row">
          <Link href={`/p/${cur.slug}`} className="reel__name">{cur.name}</Link>
          <span className="tnum">{naira(cur.priceKobo)}</span>
        </div>
        {needsSize && (
          <div className="reel__sizes" role="radiogroup" aria-label="Size">
            {sizes.map((s) => {
              const out = !cur.variants.some((v) => v.size === s && v.available > 0);
              return (
                <button key={s} type="button" role="radio" aria-checked={size === s} disabled={out} aria-label={out ? `${s}, sold out` : s} className={`reel__size${size === s ? " is-on" : ""}`} onClick={() => { setSize(s); setAdded(null); }}>
                  {s}
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="btn btn--primary btn--block" disabled={!ready || busy} onClick={onAdd}>
          {ready ? "Add to bag" : needsSize && !size ? "Select a size" : "Sold out"}
        </button>
        <p className="t-small reel__note" role="status">
          {added ? (
            <>
              {added} · <Link href="/bag" className="u-link">View bag</Link>
            </>
          ) : (
            <span className="t-grey">Look {i + 1} of {n} · swipe for the next look</span>
          )}
        </p>
      </div>
    </div>
  );
}
