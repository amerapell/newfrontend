import type { DropSettings } from "./types";

/** First run closes this long after go-live (no end time in the contract — see README). */
export const FIRST_RUN_HOURS = 48;

export type DropPhase = "none" | "upcoming" | "live" | "ended";

export function dropPhase(drop: DropSettings | null, now = Date.now()): { phase: DropPhase; target: number | null } {
  if (!drop?.goLiveAt) return { phase: "none", target: null };
  const live = new Date(drop.goLiveAt).getTime();
  if (live > now) return { phase: "upcoming", target: live };
  const close = live + FIRST_RUN_HOURS * 3600_000;
  if (close > now) return { phase: "live", target: close };
  return { phase: "ended", target: null };
}

/**
 * The drop's own name ("The Night Edit") from settings.drop.title, without a repeated collection label —
 * admins sometimes enter the full "Drop 04 — The Night Edit", which would otherwise read "Drop 04 — Drop 04 — …".
 */
export function dropTitle(label: string, title: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = title.replace(new RegExp(`^${escaped}\\s*[—/:–-]\\s*`, "i"), "").trim();
  return stripped || title;
}
