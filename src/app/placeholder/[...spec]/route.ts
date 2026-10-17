import { ICON_PATHS } from "@/lib/product";

/**
 * GET /placeholder/{w}x{h}/{bg}/{kind}/{label}.svg — a quiet SVG stand-in for product and editorial photos
 * (mock mode). Monochrome only: the ground colour, a thin silhouette and a 13px Georgia caption.
 */
export const dynamic = "force-static";

const FIGURE = "M12 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM9 8h6l1.5 6.5-1.8.5L13.5 11v10.5h-1.6l-.4-7h-1l-.4 7H8.5V11L7.3 15l-1.8-.5z";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(_req: Request, { params }: { params: Promise<{ spec: string[] }> }) {
  const { spec } = await params;
  const [size = "800x1000", bgRaw = "edece8", kind = "none", ...rest] = spec;
  const [w, h] = size.split("x").map((n) => Math.min(3200, Math.max(16, Number(n) || 800)));
  const bg = /^[0-9a-f]{6}$/i.test(bgRaw) ? `#${bgRaw}` : "#edece8";
  const label = esc(decodeURIComponent(rest.join("/")).replace(/\.svg$/, "")).slice(0, 80);
  const dark = parseInt(bg.slice(1, 3), 16) < 90;
  const ink = dark ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.28)";
  const path = kind === "figure" ? FIGURE : kind in ICON_PATHS ? ICON_PATHS[kind as keyof typeof ICON_PATHS] : null;
  const s = Math.min(w, h) * (kind === "figure" ? 0.62 : 0.42);
  const icon = path
    ? `<g transform="translate(${(w - s) / 2} ${(h - s) / 2 - h * 0.03}) scale(${s / 24})"><path d="${path}" fill="none" stroke="${ink}" stroke-width="${(24 / s) * 1.25}" stroke-linejoin="round"/></g>`
    : "";
  const text = label
    ? `<text x="${w / 2}" y="${h - Math.max(24, h * 0.06)}" font-family="Georgia, serif" font-size="${Math.max(11, Math.round(Math.min(w, h) / 40))}" fill="${ink}" text-anchor="middle">${label}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/>${icon}${text}</svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
