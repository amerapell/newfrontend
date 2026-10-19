import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { catalogApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v)?.split(",")[0] || null;

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: Param; reference?: Param }> }) {
  const sp = await searchParams;
  const zones = await safe(catalogApi.zones(), []);
  // Back from the payment page via "Cancel payment".
  const cancelledRef = first(sp.cancelled) ? first(sp.reference) : null;
  return <CheckoutView zones={zones.filter((z) => z.active)} cancelledRef={cancelledRef} />;
}
