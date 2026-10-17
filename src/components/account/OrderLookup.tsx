"use client";
import { useState } from "react";
import { FieldBox } from "@/components/ui/Field";
import { accountApi } from "@/lib/api";
import { apiMessage } from "@/lib/format";
import type { Order } from "@/lib/types";
import { OrderDetail, canExchange } from "./AccountPages";
import { ExchangeRequestForm } from "./ExchangeRequest";

/** ACC-4 guest order lookup by number + email; guests can request exchanges from here (EXC-1). */
export function OrderLookup() {
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  if (order) {
    return (
      <div className="cm cm-page cm-narrow">
        <button className="u-link" onClick={() => { setOrder(null); setExchanging(false); }}>Look up another order</button>
        {exchanging ? <ExchangeRequestForm order={order} email={email.trim()} /> : <OrderDetail order={order} />}
        {!exchanging && canExchange(order) && (
          <button className="btn btn--primary" onClick={() => setExchanging(true)}>Request an exchange</button>
        )}
      </div>
    );
  }

  return (
    <div className="cm cm-page cm-narrow">
      <h1 className="cm-title">Track an order</h1>
      <p>Use the order number from your receipt (it starts with AP-) and the email you checked out with.</p>
      <form
        className="cm-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            setOrder(await accountApi.lookupOrder(number.trim().toUpperCase(), email.trim()));
          } catch (x) {
            setErr(apiMessage(x, "We couldn't find an order with those details."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldBox label="Order number" placeholder="AP-10511" value={number} onChange={(e) => setNumber(e.target.value)} required autoCapitalize="characters" />
        <FieldBox label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {err && <p className="cm-error" role="alert">{err}</p>}
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? "Looking…" : "Find order"}</button>
      </form>
    </div>
  );
}
