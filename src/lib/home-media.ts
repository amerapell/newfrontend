import { realImage } from "@/components/ui/Photo";
import type { HomeImage, HomePanel } from "./types";

/** The panel's photos that can actually be shown (no empty or placeholder URLs). Safe on server and client. */
export function usableImages(panel: HomePanel | undefined): HomeImage[] {
  return (panel?.images ?? []).filter((i) => realImage(i.url));
}
