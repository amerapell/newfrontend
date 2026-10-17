import { SmartImage } from "./SmartImage";

/**
 * Editorial / collection photo, `fill` + object-fit cover inside a positioned parent. Without an image it
 * renders the --placeholder ground (design v3 §8 "Missing image → placeholder ground").
 */
export function Photo({ src, alt, sizes = "100vw", priority, fit = "cover", className = "" }: { src: string | null | undefined; alt: string; sizes?: string; priority?: boolean; fit?: "cover" | "contain"; className?: string }) {
  if (!src) return <span className={`photo photo--empty ${className}`} aria-hidden />;
  return (
    <span className={`photo ${className}`}>
      <SmartImage src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: fit }} />
    </span>
  );
}

/** A photo we can actually show: not empty and not a grey placehold.co stand-in (those are hidden, not rendered). */
export function realImage(src: string | null | undefined): string | null {
  if (!src || !src.trim()) return null;
  return /(^|\/\/)placehold\.co\//i.test(src) ? null : src;
}
