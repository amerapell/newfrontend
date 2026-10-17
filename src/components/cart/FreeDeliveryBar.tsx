import { naira } from "@/lib/format";

/** CRT-6: "₦ 115,000 away from free delivery" (plain text, §7 Bag drawer). */
export function FreeDeliveryBar({ subtotalKobo, thresholdKobo }: { subtotalKobo: number; thresholdKobo: number | null }) {
  if (!thresholdKobo) return null;
  const left = Math.max(0, thresholdKobo - subtotalKobo);
  return <p className="cm-free">{left > 0 ? `${naira(left)} away from free delivery` : "Your order qualifies for free delivery"}</p>;
}
