"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { StepTracker } from "@/components/ui/StepTracker";
import { TextAreaBox } from "@/components/ui/Field";
import { useSettings } from "@/context/SettingsContext";
import { exchangesApi } from "@/lib/api";
import { EXCHANGE_STATUS_LABEL, apiMessage, longDate, naira, shortDay } from "@/lib/format";
import { iconKind } from "@/lib/product";
import type { Exchange, ExchangeStatus, Order, OrderStatus } from "@/lib/types";

const REASONS = ["Wrong size", "Changed my mind", "Not as pictured", "Other"];
/** Same as the API (exchanges.service EXCHANGEABLE_ORDER_STATUSES): another piece of the order can still be sent back. */
export const EXCHANGEABLE_STATUSES: OrderStatus[] = ["DELIVERED", "EXCHANGE_REQUESTED", "EXCHANGED"];

export const EXCHANGE_STEPS = [
  { label: "Requested", desc: "We have your request" },
  { label: "Approved", desc: "Return details emailed" },
  { label: "Received", desc: "We check the piece" },
  { label: "Credit issued", desc: "Full value added" },
  { label: "Spent", desc: "On something new" },
];

const REACHED: Record<ExchangeStatus, number> = { REQUESTED: 1, APPROVED: 2, ITEM_RECEIVED: 3, CREDIT_ISSUED: 4, COMPLETED: 5, DECLINED: 1 };

export function ExchangeTracker({ ex }: { ex: Exchange | null }) {
  return <StepTracker steps={EXCHANGE_STEPS} reached={ex ? REACHED[ex.status] : 0} declined={ex?.status === "DECLINED"} />;
}

/**
 * EXC-1 request flow (ExchangeV2): pick piece(s), reason chips, optional photos, window check,
 * then a 5-step tracker. Works for signed-in customers and for guests (with email).
 */
export function ExchangeRequestForm({
  order,
  email,
  onCreated,
  orders,
  onPickOrder,
}: {
  order: Order;
  email?: string;
  onCreated?: (ex: Exchange) => void;
  orders?: Order[];
  onPickOrder?: (number: string) => void;
}) {
  const { settings } = useSettings();
  const firstOk = order.items.find((i) => i.exchangeable)?.id;
  const [picked, setPicked] = useState<Set<string>>(new Set(firstOk ? [firstOk] : []));
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState<Exchange | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset only when the customer switches order. The account reloads its orders after a request (the order
  // becomes EXCHANGE_REQUESTED, with new item objects) — that must not wipe the "Request sent" confirmation.
  const firstExchangeable = order.items.find((i) => i.exchangeable)?.id;
  useEffect(() => {
    setPicked(new Set(firstExchangeable ? [firstExchangeable] : []));
    setSent(null);
    setErr(null);
    setPhotos([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.number]);

  const until = order.exchangeableUntil ? new Date(order.exchangeableUntil) : null;
  const windowOpen = !!until && until.getTime() > Date.now() && EXCHANGEABLE_STATUSES.includes(order.status);
  const value = useMemo(() => order.items.filter((i) => picked.has(i.id)).reduce((s, i) => s + i.unitKobo * i.quantity, 0), [order.items, picked]);

  const toggle = (id: string) => {
    if (sent) return;
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setErr(null);
    try {
      const room = 3 - photos.length;
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, room)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 8 * 1024 * 1024) throw new Error("Photos must be under 8 MB.");
        urls.push((await exchangesApi.uploadPhoto(f)).url);
      }
      setPhotos((p) => [...p, ...urls]);
    } catch (e) {
      setErr(apiMessage(e, "Upload failed. Try a smaller photo."));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (sent || busy) return;
    if (!picked.size) return setErr("Choose at least one piece.");
    if (reason === "Other" && !note.trim()) return setErr("Tell us a little about why.");
    setBusy(true);
    setErr(null);
    try {
      const ex = await exchangesApi.create({
        orderNumber: order.number,
        email,
        items: order.items.filter((i) => picked.has(i.id)).map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        reason,
        note: note.trim() || undefined,
        photoUrls: photos.length ? photos : undefined,
      });
      setSent(ex);
      onCreated?.(ex);
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exchange">
      <div className="exchange__head">
        <h2 className="cm-h2">Request an exchange</h2>
        <p className="cm-soft">
          Order {order.number}
          {order.deliveredAt ? ` · delivered ${longDate(order.deliveredAt)}` : ""}
        </p>
        <p className="body-copy exchange__lede">
          We don&apos;t offer refunds. Send back an unworn piece with its tags and we&apos;ll add its full value to your exchange credit, ready to spend on anything in the store.
        </p>
        {orders && orders.length > 1 && onPickOrder && (
          <div className="exchange__orders" role="radiogroup" aria-label="Order">
            {orders.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={o.number === order.number} className={`chip${o.number === order.number ? " chip--on" : ""}`} onClick={() => onPickOrder(o.number)}>
                {o.number}
              </button>
            ))}
          </div>
        )}
      </div>

      {!windowOpen && (
        <div className="notice" role="alert">
          {order.status !== "DELIVERED"
            ? `Exchanges open once an order is delivered. ${order.number} is ${order.status.replace(/_/g, " ").toLowerCase()}.`
            : `The ${settings.exchangeWindowDays}-day exchange window for ${order.number} closed on ${longDate(order.exchangeableUntil)}.`}
        </div>
      )}

      <div className="exchange__block">
        <h3 className="exchange__step">1. Choose a piece</h3>
        {order.items.map((i) => {
          const on = picked.has(i.id);
          const ok = i.exchangeable && windowOpen;
          return (
            <button
              key={i.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={!ok}
              className={`ex-item${on ? " is-on" : ""}${ok ? "" : " is-disabled"}`}
              onClick={() => ok && toggle(i.id)}
            >
              <span className={`check-box check-box--sm${on ? " is-on" : ""}`} aria-hidden />
              <span className="ex-item__img">
                <ProductImage src={i.imageUrl} alt="" kind={iconKind({ material: null, name: i.name })} iconSize={22} sizes="72px" />
              </span>
              <span className="stack gap-4">
                <span className="ex-item__name">{i.name}</span>
                <span className="cm-small cm-soft">
                  {i.exchangeable
                    ? [i.colour, i.size, until ? `Exchangeable until ${shortDay(until).replace(/^\w+ /, "")}` : null].filter(Boolean).join(" · ")
                    : `Not exchangeable${i.number ? ` · ${i.number}` : ""}`}
                </span>
              </span>
              <span className="tnum">{naira(i.unitKobo * i.quantity)}</span>
            </button>
          );
        })}
      </div>

      <div className="exchange__block">
        <h3 className="exchange__step">2. Why</h3>
        <div className="row gap-8 wrap" role="radiogroup" aria-label="Reason">
          {REASONS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={reason === r} className={`reason${reason === r ? " is-on" : ""}`} onClick={() => !sent && setReason(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="exchange__extras">
          <TextAreaBox label={reason === "Other" ? "Tell us more" : "Note (optional)"} rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={!!sent} />
          <div className="photos">
            <span className="cm-small cm-soft">Photos (optional, up to 3)</span>
            <div className="photos__row">
              {photos.map((u, k) => (
                <span key={u} className="photos__thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Exchange photo ${k + 1}`} />
                  {!sent && (
                    <button type="button" aria-label={`Remove photo ${k + 1}`} onClick={() => setPhotos((p) => p.filter((x) => x !== u))}>×</button>
                  )}
                </span>
              ))}
              {photos.length < 3 && !sent && (
                <label className="photos__add">
                  <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
                  <span aria-hidden>+</span>
                  <span className="cm-small">{uploading ? "Uploading…" : "Add"}</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="exchange__submit">
        <span className="muted">
          Return it to the store or book a pickup. Credit is added when we receive it.
          {value > 0 && !sent && (
            // Credit is what was actually paid for the piece (the API's paidUnitKobo), so a promo lowers it.
            order.discountKobo > 0 ? (
              <> Value: <span className="tnum ink">{naira(value)}</span> before your promo — credit is what you paid, after discounts.</>
            ) : (
              <> Value: <span className="tnum ink">{naira(value)}</span>.</>
            )
          )}
        </span>
        <button type="button" className="btn btn--primary exchange__btn" onClick={submit} disabled={busy || (!sent && (!windowOpen || !picked.size))}>
          {sent ? `Request sent · ${sent.number}` : busy ? "Sending…" : "Request exchange"}
        </button>
      </div>
      {err && <p className="form-error" role="alert">{err}</p>}

      <div className="exchange__block">
        <h3 className="exchange__step">{sent ? `3. Track ${sent.number}` : "3. What happens next"}</h3>
        <ExchangeTracker ex={sent} />
      </div>
    </div>
  );
}

export function ExchangeHistory({ exchanges }: { exchanges: Exchange[] }) {
  if (!exchanges.length) return null;
  return (
    <div className="exchange__block">
      <div className="section-head section-head--ink">
        <h2 className="cm-h2">Your exchanges</h2>
      </div>
      <ul className="ex-history">
        {exchanges.map((e) => (
          <li key={e.id} className="ex-history__item">
            <div className="row between wrap gap-12">
              <span className="stack">
                <span className="ex-history__no">{e.number}</span>
                <span className="meta">
                  {e.orderNumber} · {longDate(e.createdAt)} · {e.items.map((i) => i.name).join(", ")}
                </span>
              </span>
              <span className="row gap-16">
                <span className={`status-pill status-pill--${e.status.toLowerCase()}`}>{EXCHANGE_STATUS_LABEL[e.status]}</span>
                <span className="tnum">{naira(e.creditKobo)}</span>
              </span>
            </div>
            <ExchangeTracker ex={e} />
            {e.status === "DECLINED" && e.history.slice(-1)[0]?.note && <p className="notice">{e.history.slice(-1)[0].note}</p>}
          </li>
        ))}
      </ul>
      <p className="cm-small cm-soft">
        Credit is never paid out as cash. <Link href="/policies/exchanges" className="u-link">Exchange policy</Link>
      </p>
    </div>
  );
}
