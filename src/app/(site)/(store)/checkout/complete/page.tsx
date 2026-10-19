import type { Metadata } from "next";
import { CheckoutComplete } from "@/components/checkout/OrderConfirmed";
import { catalogApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };
export const dynamic = "force-dynamic";

type Param = string | string[] | undefined;
/** A provider may add its own `reference` to our return URL, so it can arrive twice (→ an array). */
const first = (v: Param) => (Array.isArray(v) ? v[0] : v)?.split(",")[0] || null;

export default async function CompletePage({ searchParams }: { searchParams: Promise<{ reference?: Param; trxref?: Param }> }) {
  const sp = await searchParams;
  const zones = await safe(catalogApi.zones(), []);
  return <CheckoutComplete reference={first(sp.reference) ?? first(sp.trxref)} zones={zones} />;
}
