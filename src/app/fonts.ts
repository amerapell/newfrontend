import type { CSSProperties } from "react";
import localFont from "next/font/local";

/*
 * Self-hosted fonts (fonts.googleapis.com is not reachable at build time). Files are copied from
 * @fontsource/newsreader and @fontsource/montserrat into ./fonts.
 *
 * docs/design-v3.md §2: Newsreader 400 (normal + italic) is the ONLY typeface of the storefront and admin.
 * It is split into a latin face and a latin-ext face (latin-ext carries ₦, U+20A6); both are chained in
 * --font-serif so the naira sign renders in Newsreader.
 *
 * Montserrat is used only inside the logo wordmark (700) and its stacked tagline (600 italic).
 */
export const serifLatin = localFont({
  src: [
    { path: "./fonts/newsreader-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/newsreader-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
  preload: true,
});
export const serifExt = localFont({
  src: [
    { path: "./fonts/newsreader-latin-ext-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/newsreader-latin-ext-400-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});
/** Logo only: Montserrat 700 (wordmark) + 600 italic (stacked tagline). */
export const logoFont = localFont({
  src: [
    { path: "./fonts/montserrat-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/montserrat-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

/** CSS custom properties exposed on <html>. */
export const fontVars = {
  "--font-serif": `${serifLatin.style.fontFamily}, ${serifExt.style.fontFamily}`,
  "--font-logo": logoFont.style.fontFamily,
} as CSSProperties;
