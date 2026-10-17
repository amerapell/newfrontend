import Image from "next/image";

/** next/image is used for our own media, Cloudinary and placeholders; anything else is passed through. */
export function canOptimise(src: string) {
  if (src.startsWith("/placeholder/") || src.startsWith("data:") || src.startsWith("blob:")) return false;
  return src.startsWith("/") || src.includes("res.cloudinary.com") || src.includes("placehold.co");
}

/**
 * Editorial / collection photo, `fill` + object-fit cover inside a positioned parent. Without an image it
 * renders the --placeholder ground (design v3 §8 "Missing image → placeholder ground").
 */
export function Photo({ src, alt, sizes = "100vw", priority, fit = "cover", className = "" }: { src: string | null | undefined; alt: string; sizes?: string; priority?: boolean; fit?: "cover" | "contain"; className?: string }) {
  if (!src) return <span className={`photo photo--empty ${className}`} aria-hidden />;
  return (
    <span className={`photo ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!canOptimise(src)} style={{ objectFit: fit }} />
    </span>
  );
}
