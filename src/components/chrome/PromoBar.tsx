"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { CloseIcon } from "./Icons";

const KEY = "ap_promo_dismissed";

/**
 * Promo bar (§5): one 32px line above the header, left-aligned link text, "×" on the right.
 * Text = first `settings.tickerText` message (no marquee); dismissal is remembered per message.
 */
export function PromoBar() {
  const { settings } = useSettings();
  const text = settings.tickerText.find((t) => t.trim())?.trim() ?? "";
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (text && window.localStorage.getItem(KEY) === text) setHidden(true);
    } catch {
      /* storage unavailable */
    }
  }, [text]);
  if (!text || hidden) return null;
  const href = settings.drop ? `/drop/${settings.drop.collectionSlug}` : "/c/new-in";
  const close = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(KEY, text);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="promo" role="region" aria-label="Announcement">
      <Link href={href} className="promo__link">{text}</Link>
      <button type="button" className="promo__close" aria-label="Dismiss announcement" onClick={close}>
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  );
}
