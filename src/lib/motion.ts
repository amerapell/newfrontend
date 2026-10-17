/** Motion helpers. Design v3 uses quiet fades only (no flying star, no shared-element card → product). */

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
}
