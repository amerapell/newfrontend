import { realImage } from "@/components/ui/Photo";
import type { CSSProperties } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
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
  scale,
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
  /** Below 100: the photo sits that much smaller, centred on the stage, its white ground blended away. */
  scale?: number;
}) {
  if (!realImage(src)) return <ImagePlaceholder kind={kind} size={iconSize} className={className} style={style} />;
  src = src!;
  if (scale && scale < 100) {
    const gap = `${(100 - scale) / 2}%`;
    return (
      <div className={`img-fill img-fill--inset ${className}`} style={style}>
        <div className="img-fill__inner" style={{ inset: gap }}>
          <SmartImage src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "contain" }} />
        </div>
      </div>
    );
  }
  return (
    <div className={`img-fill ${className}`} style={style}>
      <SmartImage src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: fit }} />
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
