"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ap_cookie_consent";
/** Fired once the visitor picks an option, so the welcome pop-up can follow the cookie notice. */
export const COOKIE_DECIDED_EVENT = "ap:cookie-decided";
export type CookieConsent = "all" | "essential";

export function readCookieConsent(): CookieConsent | null {
  try {
    return (window.localStorage.getItem(KEY) as CookieConsent | null) ?? null;
  } catch {
    return null;
  }
}

/** NDPA 2023 cookie notice — essential cookies only unless the visitor accepts. */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!readCookieConsent()) setShow(true);
  }, []);
  if (!show) return null;
  const decide = (v: CookieConsent) => {
    try {
      window.localStorage.setItem(KEY, v);
      document.cookie = `${KEY}=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    } catch {
      /* ignore */
    }
    setShow(false);
    window.dispatchEvent(new Event(COOKIE_DECIDED_EVENT));
  };
  return (
    <div className="cookie" role="region" aria-label="Cookie notice">
      <p>
        We use essential cookies to keep your bag and sign-in working. With your OK we&apos;ll also use analytics cookies to improve the store.{" "}
        <Link href="/policies/privacy" className="u-link">Privacy</Link>
      </p>
      <div className="cookie__actions">
        <button type="button" className="btn btn--secondary" onClick={() => decide("essential")}>Essential only</button>
        <button type="button" className="btn btn--primary" onClick={() => decide("all")}>Accept all</button>
      </div>
    </div>
  );
}
