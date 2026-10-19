"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { checkoutApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { apiMessage, arrivalFromEta } from "@/lib/format";
import type { DeliveryZone, Order } from "@/lib/types";
import { OrderItems, OrderMeta, OrderTotals, Progress } from "@/components/account/OrderParts";

/** While the bank hasn't confirmed: check every 2.5 s for the first ~15 s, then every 6 s, for about 3 minutes. */
const MAX_CHECKS = 32;
const checkDelay = (n: number) => (n < 6 ? 2500 : 6000);

const PROVIDER_NAME: Record<string, string> = { PAYSTACK: "Paystack", BACHS: "Bachs", CREDIT: "exchange credit" };

export function CheckoutComplete({ reference, zones }: { reference: string | null; zones: DeliveryZone[] }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const { reload } = useCart();
  const { status, user } = useAuth();
  const reloaded = useRef(false);

  useEffect(() => {
    if (!reference) {
      setError("We couldn't find a payment reference.");
      return;
    }
    let alive = true;
    checkoutApi
      .verify(reference)
      .then(({ order: o }) => {
        if (!alive) return;
        setOrder(o);
        if (!reloaded.current) {
          reloaded.current = true;
          void reload();
        }
        // webhook is the source of truth — keep checking while the bank confirms (transfers can take a minute or two)
        const failedNow = o.payment?.status === "FAILED" || o.payment?.status === "EXPIRED";
        if (o.status === "PENDING_PAYMENT" && !failedNow && tries < MAX_CHECKS) window.setTimeout(() => alive && setTries((t) => t + 1), checkDelay(tries));
      })
      .catch((e) => alive && setError(apiMessage(e, "We couldn't confirm this payment yet.")));
    return () => {
      alive = false;
    };
  }, [reference, tries, reload]);

  if (error) {
    return (
      <div className="cm cm-page cm-narrow">
        <h1 className="cm-title">We couldn&apos;t confirm your payment yet.</h1>
        <p>{error} If money left your account, don&apos;t pay again — we&apos;ll confirm by email as soon as the payment clears.</p>
        <div className="cm-links">
          <Link href="/bag" className="u-link">Back to your bag</Link>
          <Link href="/orders/lookup" className="u-link">Look up an order</Link>
          <Link href="/contact" className="u-link">Contact us</Link>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="cm cm-page cm-narrow" aria-busy="true">
        <h1 className="cm-title">Confirming your payment…</h1>
        <p className="cm-soft">One moment.</p>
      </div>
    );
  }

  const failed = order.payment?.status === "FAILED" || order.payment?.status === "EXPIRED" || (order.status === "CANCELLED" && !order.paidAt);
  const pending = order.status === "PENDING_PAYMENT" && !failed;
  const stalled = pending && tries >= MAX_CHECKS;
  // Retry: release this unpaid order first so its pieces aren't held, then back to checkout (the bag is unchanged).
  const tryAgain = async () => {
    if (reference) await checkoutApi.cancel(reference).catch(() => undefined);
    window.location.assign("/checkout");
  };
  const pickup = order.delivery.zone === "PICKUP";
  const zone = zones.find((z) => z.code === order.delivery.zone);
  const eta = zone && !pickup ? arrivalFromEta(zone.etaText, new Date(order.paidAt ?? order.createdAt)) : null;
  const firstName = user?.firstName || order.delivery.address?.fullName?.trim().split(/\s+/)[0] || "";
  const paidWith = PROVIDER_NAME[order.payment?.provider ?? ""] ?? "card";

  const title = failed ? "Your payment didn't go through." : pending ? "Waiting for your payment." : firstName ? `Thank you, ${firstName}.` : "Thank you.";
  const statusLine = failed
    ? "Your bag is still saved, so you can try again."
    : stalled
      ? "Your bank hasn't confirmed yet. If money left your account, don't pay again — we'll email you as soon as it clears."
      : pending
      ? "We're waiting for your bank to confirm. This page updates automatically — there's no need to pay again."
      : `Paid with ${paidWith}. A receipt is on its way to ${order.email}.`;

  return (
    <div className="cm cm-page">
      <header className="cm-head">
        <h1 className="cm-title">{title}</h1>
        <p>Order {order.number}</p>
        <p className="cm-soft" aria-live="polite">{statusLine}</p>
        {stalled && (
          <button type="button" className="u-link" onClick={() => setTries(0)}>
            Check again
          </button>
        )}
      </header>

      <div className="cm-split">
        <div className="cm-split__main">
          <h2 className="cm-h2">Summary</h2>
          <OrderItems order={order} />
          {!failed && (
            <section className="cm-block" aria-labelledby="next-steps">
              <h2 id="next-steps" className="cm-h2">Next steps</h2>
              <Progress
                label="Order progress"
                reached={pending ? 0 : 1}
                steps={[
                  { label: "Paid", desc: "Payment confirmed" },
                  { label: "Packing", desc: "Wrapped with care" },
                  { label: pickup ? "Ready" : "Dispatched", desc: pickup ? "Collect from the store" : "Rider on the way" },
                  { label: pickup ? "Collected" : "Delivered", desc: pickup ? "Same day" : eta ? `Arrives ${eta}` : "Enjoy it" },
                ]}
              />
              <p className="cm-soft">
                {pickup
                  ? "We'll email you when your order is ready to collect from the store."
                  : "We'll email you when it's on the way, with your rider's details."}{" "}
                Unworn pieces can be exchanged for store credit — <Link href="/policies/exchanges" className="u-link">exchange policy</Link>.
              </p>
            </section>
          )}
        </div>
        <aside className="cm-split__aside cm-summary">
          <OrderTotals order={order} />
          <OrderMeta order={order} />
          <div className="cm-actions">
            {failed ? (
              <>
                <button type="button" className="btn btn--primary btn--block" onClick={tryAgain}>Try again</button>
                <Link href="/bag" className="btn btn--secondary btn--block">Back to your bag</Link>
              </>
            ) : status === "authed" ? (
              <Link href={`/account/orders/${order.number}`} className="btn btn--primary btn--block">Track order</Link>
            ) : (
              <>
                <Link href="/orders/lookup" className="btn btn--primary btn--block">Track order</Link>
                <Link href={`/account?view=register&email=${encodeURIComponent(order.email)}`} className="btn btn--secondary btn--block">Create an account</Link>
              </>
            )}
            <Link href="/c/new-in" className="u-link">Continue shopping</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
