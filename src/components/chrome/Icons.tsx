import type { SVGProps } from "react";

/** Thin line icons, 18px, 1.25px stroke (design v3 §4). */
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, "aria-hidden": true, focusable: false } as const;
type P = SVGProps<SVGSVGElement>;

export const SearchIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><circle cx="7.75" cy="7.75" r="5.75" /><path d="M12 12l4.5 4.5" /></svg>
);
export const AccountIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><circle cx="9" cy="5.75" r="3.5" /><path d="M2.5 16.5c.8-3.3 3.4-5 6.5-5s5.7 1.7 6.5 5" /></svg>
);
export const BagIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><path d="M2.75 5.75h12.5l-1 10.75H3.75z" /><path d="M6 7.5V4.5a3 3 0 0 1 6 0v3" /></svg>
);
export const BookmarkIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} fill={filled ? "currentColor" : "none"} {...p}><path d="M4 1.75h10v14.5l-5-3.75-5 3.75z" strokeLinejoin="round" /></svg>
);
export const MenuIcon = (p: P) => (
  <svg width="20" height="18" viewBox="0 0 20 18" {...base} {...p}><path d="M1 5h18M1 13h18" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...base} {...p}><path d="M2 2l12 12M14 2L2 14" /></svg>
);
export const ShareIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><path d="M9 11.5V1.75M5.5 5L9 1.5 12.5 5" /><path d="M3.5 8v8.25h11V8" /></svg>
);
export const PauseIcon = (p: P) => (
  <svg width="14" height="14" viewBox="0 0 14 14" {...base} {...p}><path d="M4.5 2v10M9.5 2v10" /></svg>
);
export const PlayIcon = (p: P) => (
  <svg width="14" height="14" viewBox="0 0 14 14" {...base} {...p}><path d="M3.5 2l8 5-8 5z" /></svg>
);
export const InstagramIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><rect x="2" y="2" width="14" height="14" /><circle cx="9" cy="9" r="3.25" /><path d="M13 4.75h.5" /></svg>
);
export const TikTokIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><path d="M10.5 2v9.5a3 3 0 1 1-3-3" /><path d="M10.5 2c.3 2.3 1.9 3.8 4.25 4" /></svg>
);
export const WhatsAppIcon = (p: P) => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...base} {...p}><path d="M16 9A7 7 0 0 1 5.6 15.1L2 16l1-3.5A7 7 0 1 1 16 9z" /><path d="M6.5 6.25c.3 2.6 2.1 4.6 5 5.25l.75-1.25-1.5-.75-.75.75c-.9-.4-1.6-1.1-2-2l.75-.75-.75-1.5z" /></svg>
);
/** Long thin arrow "⟵ / ⟶" (carousels, rails, back rows). */
export const ArrowIcon = ({ dir = "right", ...p }: P & { dir?: "left" | "right" }) => (
  <svg width="28" height="10" viewBox="0 0 28 10" {...base} strokeWidth={1} {...p} style={{ transform: dir === "left" ? "scaleX(-1)" : undefined, ...p.style }}>
    <path d="M0 5h27M23 1l4 4-4 4" />
  </svg>
);
/** Thin chevron "⌄" (sort, selects, qty). */
export const ChevronDown = (p: P) => (
  <svg width="10" height="6" viewBox="0 0 10 6" {...base} strokeWidth={1} {...p}><path d="M1 1l4 4 4-4" /></svg>
);
/** Thin chevron "›". */
export const ChevronRight = (p: P) => (
  <svg width="6" height="10" viewBox="0 0 6 10" {...base} strokeWidth={1} {...p}><path d="M1 1l4 4-4 4" /></svg>
);
