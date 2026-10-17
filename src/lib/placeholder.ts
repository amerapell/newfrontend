/**
 * Neutral placeholder images served by this app (src/app/placeholder/[...spec]/route.ts) — used by the mock
 * dataset so every page renders without network access. Never brand photography.
 *
 *   placeholderUrl(800, 1000, "edece8", "Cropped leather jacket", "garment")
 *   → /placeholder/800x1000/edece8/garment/Cropped%20leather%20jacket.svg
 */
export type PlaceholderKind = "garment" | "bag" | "shoe" | "figure" | "none";

export function placeholderUrl(w: number, h: number, bg: string, label: string, kind: PlaceholderKind = "none") {
  return `/placeholder/${w}x${h}/${bg.replace(/^#/, "")}/${kind}/${encodeURIComponent(label)}.svg`;
}
