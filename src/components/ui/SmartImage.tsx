"use client";
import Image, { type ImageLoader, type ImageProps } from "next/image";

/** Path every built-in media URL carries (`${PUBLIC_API_URL}/api/v1/media/:id`, backend storage/database-image.storage.ts). */
const MEDIA_PATH = "/api/v1/media/";

export function isBuiltInMedia(src: string) {
  try {
    return new URL(src, "http://local").pathname.startsWith(MEDIA_PATH);
  } catch {
    return false;
  }
}

/** next/image is used for our own media, Cloudinary and placeholders; anything else is passed through. */
export function canOptimise(src: string) {
  if (src.startsWith("/placeholder/") || src.startsWith("data:") || src.startsWith("blob:")) return false;
  return src.startsWith("/") || src.includes("res.cloudinary.com") || src.includes("placehold.co");
}

/** The API already stores WebP variants (480 / 960 / 1600) and serves the smallest one ≥ `?w=`. */
const mediaLoader: ImageLoader = ({ src, width }) => `${src}${src.includes("?") ? "&" : "?"}w=${width}`;

/**
 * next/image with the right delivery per source: built-in media → srcset of `?w=` variants straight from the API
 * (no second optimisation pass); Cloudinary / placeholders → the configured optimiser; anything else unoptimised.
 * A client component so the loader function never crosses the server → client boundary.
 */
export function SmartImage({ src, alt, ...rest }: ImageProps & { src: string }) {
  if (isBuiltInMedia(src)) return <Image src={src} alt={alt} loader={mediaLoader} {...rest} />;
  return <Image src={src} alt={alt} unoptimized={!canOptimise(src)} {...rest} />;
}
