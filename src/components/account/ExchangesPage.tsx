"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "./AccountShell";
import { canExchange } from "./AccountPages";
import { ExchangeHistory, ExchangeRequestForm } from "./ExchangeRequest";
import { useSettings } from "@/context/SettingsContext";
import { creditReasonLabel, longDate, naira } from "@/lib/format";

export function ExchangesPage() {
  const { orders, exchanges, credit, reload, setPendingCredit } = useAccount();
  const { settings } = useSettings();
  const params = useSearchParams();
  const router = useRouter();
  if (!orders) return <p className="cm-soft">Loading…</p>;
  const eligible = orders.filter(canExchange);
  const wanted = params.get("order");
  const order = eligible.find((o) => o.number === wanted) ?? orders.find((o) => o.number === wanted) ?? eligible[0];

  return (
    <div className="stack gap-40">
      {order ? (
        <ExchangeRequestForm
          order={order}
          orders={eligible.length > 1 ? eligible : undefined}
          onPickOrder={(n) => router.replace(`/account/exchanges?order=${n}`, { scroll: false })}
          onCreated={(ex) => {
            setPendingCredit({ amountKobo: ex.creditKobo, ref: ex.number });
            void reload();
          }}
        />
      ) : (
        <div className="exchange__head">
          <h2 className="cm-h2">Request an exchange</h2>
          <p className="body-copy exchange__lede">
            None of your orders are within the {settings.exchangeWindowDays}-day exchange window right now. Exchanges open when an order is delivered. We don&apos;t offer refunds — exchanged pieces become credit to spend on anything in the store.
          </p>
          <Link href="/account/orders" className="u-link">View your orders</Link>
        </div>
      )}
      <ExchangeHistory exchanges={exchanges ?? []} />
      {credit && credit.entries.length > 0 && (
        <div className="exchange__block">
          <div className="section-head section-head--ink">
            <h2 className="cm-h2">Credit history</h2>
            <span className="tnum">{naira(credit.balanceKobo)}</span>
          </div>
          <ul className="credit-history">
            {[...credit.entries].reverse().map((e) => (
              <li key={e.id}>
                <span>{creditReasonLabel(e.reason)}</span>
                <span className="cm-soft">
                  {longDate(e.createdAt)}
                  {e.expiresAt && e.amountKobo > 0 ? ` · expires ${longDate(e.expiresAt)}` : ""}
                </span>
                <span className={`tnum${e.amountKobo < 0 ? " cm-soft" : ""}`}>{e.amountKobo < 0 ? "−" : "+"}{naira(Math.abs(e.amountKobo))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
