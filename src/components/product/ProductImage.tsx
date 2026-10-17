import Image from "next/image";
import type { CSSProperties } from "react";
import { canOptimise } from "@/components/ui/Photo";
import { ICON_PATHS, iconKind, type IconKind } from "@/lib/product";
import type { ProductCard } from "@/lib/types";

/** Missing photo: --placeholder ground with a thin line icon. */
export function ImagePlaceholder({ kind = "garment", size = 48, className = "", style }: { kind?: IconKind; size?: number; stroke?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={`img-ph ${className}`} style={style}>
      <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.75}>
        <path d={ICON_PATHS[kind]} />
      </svg>
    </div>
  );
}

/**
 * next/image (fill) when we have a URL; placeholder otherwise. `fit`: "contain" for packshots on the
 * stage (PDP), "cover" for grid tiles and worn shots.
 */
export function ProductImage({
  src,
  alt,
  kind = "garment",
  sizes = "(max-width: 1023px) 50vw, 25vw",
  priority,
  iconSize = 48,
  className = "",
  style,
  fit = "cover",
}: {
  src: string | null | undefined;
  alt: string;
  kind?: IconKind;
  sizes?: string;
  priority?: boolean;
  iconSize?: number;
  iconStroke?: number;
  className?: string;
  style?: CSSProperties;
  fit?: "cover" | "contain";
}) {
  if (!src) return <ImagePlaceholder kind={kind} size={iconSize} className={className} style={style} />;
  return (
    <div className={`img-fill ${className}`} style={style}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!canOptimise(src)} style={{ objectFit: fit }} />
    </div>
  );
}

export function ProductThumb({ product, className = "" }: { product: Pick<ProductCard, "images" | "name" | "material" | "number">; className?: string }) {
  return (
    <div className={`thumb ${className}`}>
      <ProductImage src={product.images[0]?.url} alt={product.images[0]?.alt || product.name} kind={iconKind(product)} sizes="80px" iconSize={24} />
    </div>
  );
}
