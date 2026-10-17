"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { adminApi } from "@/lib/api";
import { ORDER_STATUS_LABEL, apiMessage, longDate, naira } from "@/lib/format";
import type { AdminOrderDetail, OrderStatus } from "@/lib/types";
import { AdminHead, useAdmin, useAsync } from "./AdminShell";
import { Logo } from "@/components/brand/Logo";
import { customerHref } from "./Customers";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export function OrdersAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "";
  const provider = params.get("provider") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const page = Number(params.get("page") || 1);
  const { data, loading } = useAsync(() => adminApi.orders({ status: status || undefined, provider: provider || undefined, q: q || undefined, page }), [status, provider, q, page]);
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.delete("page");
    router.replace(`/admin/orders?${p}`);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <AdminHead title={`Orders${data ? ` (${data.total})` : ""}`} />
      <div className="admin-filters">
        <input className="admin-input" placeholder="Search number, email, name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        <select className="admin-input" value={status} onChange={(e) => setParam("status", e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <select className="admin-input" value={provider} onChange={(e) => setParam("provider", e.target.value)} aria-label="Provider">
          <option value="">All providers</option>
          <option value="PAYSTACK">Paystack</option>
          <option value="BACHS">Bachs</option>
          <option value="CREDIT">Credit</option>
        </select>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Status</th><th>Provider</th><th>Delivery</th><th>Source</th><th className="num">Total</th></tr></thead>
          <tbody>
            {loading && !data && <tr><td colSpan={8} className="mono-label">Loading…</td></tr>}
            {data?.items.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="ap-link">{o.number}</Link></td>
                <td className="mono-xs">{longDate(o.createdAt)}</td>
                <td>{o.delivery.address?.fullName ?? o.email}<div className="mono-xs">{o.delivery.address?.fullName ? o.email : o.phone}</div></td>
                <td><span className={`status-pill status-pill--${o.status.toLowerCase()}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td className="mono-xs">{o.payment?.provider ?? "—"}</td>
                <td>{o.delivery.name}</td>
                <td className="mono-xs">{o.utmSource ?? "direct"}</td>
                <td className="num tnum">{naira(o.totalKobo)}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={8} className="muted">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="row gap-16 admin-pager">
          <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>← Prev</button>
          <span className="mono-xs">Page {page} / {pages}</span>
          <button className="btn btn--ghost" disabled={page >= pages} onClick={() => setParam("page", String(page + 1))}>Next →</button>
        </div>
      )}
    </>
  );
}

export function OrderAdminDetail({ id }: { id: string }) {
  const { data: o, setData, error } = useAsync(() => adminApi.order(id), [id]);
  const toast = useToast();
  const { onError } = useAdmin();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (o) setStatus(o.status);
  }, [o]);
  if (error) return <p className="form-error">{error}</p>;
  if (!o) return <p className="mono-label">Loading…</p>;
  const patch = async (b: { status?: OrderStatus; note?: string }) => {
    setBusy(true);
    try {
      const u = await adminApi.updateOrder(o.id, b);
      setData(u);
      toast.show({ message: b.status ? `Status → ${ORDER_STATUS_LABEL[b.status]} · customer emailed` : "Note added." });
      if (b.note) setNote("");
    } catch (e) {
      onError(e);
      toast.show({ message: apiMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const a = o.delivery.address;
  return (
    <>
      <AdminHead
        index={`Orders / ${o.number} · ${longDate(o.createdAt)}`}
        title={<>{o.number}</>}
        actions={
          <>
            <Link href={`/admin/orders/${o.id}/slip`} target="_blank" className="btn btn--ghost">Packing slip ↗</Link>
            <Link href="/admin/orders" className="btn btn--ghost">← All orders</Link>
          </>
        }
      />
      <div className="admin-grid">
        <section className="admin-card">
          <div className="mono-label admin-card__head">Status</div>
          <div className="row gap-12 wrap">
            <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} aria-label="Order status">
              {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
            </select>
            <button className="btn btn--short" disabled={busy || status === o.status || !status} onClick={() => {
                if (status === "CANCELLED" && o.status !== "PENDING_PAYMENT" && !confirm(`Cancel ${o.number}? The customer gets ${naira(o.amountDueKobo + o.creditAppliedKobo)} as store credit to choose another piece (no cash refunds), and an email.`)) return;
                void patch({ status: status as OrderStatus });
              }}>Update status</button>
          </div>
          <p className="mono-xs">Every status change emails the customer; the store gets a copy.</p>
          <dl className="order-meta">
            <div><dt className="mono-xs">Payment</dt><dd>{o.payment?.provider ?? "—"} · {o.payment?.status ?? "—"}{o.payment?.reference ? ` · ${o.payment.reference}` : ""}</dd></div>
            {o.discountCode && <div><dt className="mono-xs">Promo</dt><dd className="mono">{o.discountCode}</dd></div>}
            <div><dt className="mono-xs">Customer</dt><dd>{o.userId ? "Account holder" : "Guest checkout"} · {o.marketingConsent ? "opted in to marketing" : "no marketing consent"}</dd></div>
            <div><dt className="mono-xs">Contact</dt><dd><Link href={customerHref(o.email)} className="ap-link">{o.email}</Link><br />{o.phone}</dd></div>
            <div>
              <dt className="mono-xs">Delivery · {o.delivery.name}</dt>
              <dd>
                {a ? (
                  <>
                    {a.fullName}<br />{a.street}, {a.area}<br />{a.lga}, {a.state}<br /><span className="muted">Landmark: {a.landmark}</span>
                    {a.note && <><br /><span className="muted">Note: {a.note}</span></>}
                  </>
                ) : "Pickup from store"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Items</div>
          <table className="admin-table">
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td className="mono-xs">{i.number}</td>
                  <td>{i.name}<div className="mono-xs">{[i.colour, i.size].filter(Boolean).join(" · ")}</div></td>
                  <td className="num">× {i.quantity}</td>
                  <td className="num tnum">{naira(i.unitKobo * i.quantity)}</td>
                </tr>
              ))}
              <tr><td colSpan={3}>Subtotal</td><td className="num tnum">{naira(o.subtotalKobo)}</td></tr>
              {o.discountKobo > 0 && <tr><td colSpan={3}>Discount</td><td className="num tnum">−{naira(o.discountKobo)}</td></tr>}
              <tr><td colSpan={3}>Delivery</td><td className="num tnum">{naira(o.deliveryKobo)}</td></tr>
              {o.creditAppliedKobo > 0 && <tr><td colSpan={3}>Exchange credit</td><td className="num tnum">−{naira(o.creditAppliedKobo)}</td></tr>}
              <tr><td colSpan={3}><b>Amount paid</b></td><td className="num tnum"><b>{naira(o.amountDueKobo)}</b></td></tr>
            </tbody>
          </table>
        </section>
        <section className="admin-card admin-card--wide">
          <div className="mono-label admin-card__head">Notes · internal</div>
          <ul className="notes">
            {(o.notes ?? []).map((n, k) => (
              <li key={n.id ?? k}><span className="mono-xs">{longDate(n.createdAt)}{n.author ? ` · ${n.author}` : ""}</span> {n.body}</li>
            ))}
            {!o.notes?.length && <li className="muted">No notes yet.</li>}
          </ul>
          <form className="row gap-12" onSubmit={(e) => { e.preventDefault(); if (note.trim()) void patch({ note: note.trim() }); }}>
            <input className="admin-input admin-input--grow" placeholder="Add a note (rider called, customer asked for…)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
            <button className="btn btn--ghost" disabled={busy || !note.trim()}>Add note</button>
          </form>
        </section>
      </div>
    </>
  );
}

/** ADM-3 packing slip — print view. */
export function PackingSlip({ id }: { id: string }) {
  const { data: o } = useAsync<AdminOrderDetail>(() => adminApi.order(id), [id]);
  useEffect(() => {
    if (o) window.setTimeout(() => window.print(), 400);
  }, [o]);
  if (!o) return <p className="mono-label">Loading…</p>;
  const a = o.delivery.address;
  return (
    <div className="slip">
      <div className="slip__head">
        <span className="slip__mark"><Logo size={34} /></span>
        <span className="mono-label">Packing slip · {o.number}</span>
      </div>
      <div className="slip__grid">
        <div>
          <div className="mono-xs">Ship to</div>
          {a ? (
            <p>{a.fullName}<br />{a.street}<br />{a.area}, {a.lga}<br />{a.state}<br />Landmark: {a.landmark}<br />{a.phone || o.phone}</p>
          ) : (
            <p>Pickup from store<br />{o.email}<br />{o.phone}</p>
          )}
        </div>
        <div>
          <div className="mono-xs">Order</div>
          <p>{o.number}<br />{longDate(o.createdAt)}<br />{o.delivery.name}<br />{o.payment?.provider} · {o.payment?.reference}</p>
        </div>
      </div>
      <table className="admin-table slip__table">
        <thead><tr><th>✓</th><th>No.</th><th>Piece</th><th>Colour</th><th>Size</th><th className="num">Qty</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id}><td>☐</td><td>{i.number}</td><td>{i.name}</td><td>{i.colour ?? "—"}</td><td>{i.size ?? "—"}</td><td className="num">{i.quantity}</td></tr>
          ))}
        </tbody>
      </table>
      {a?.note && <p><b>Delivery note:</b> {a.note}</p>}
      {o.notes.length > 0 && (
        <div>
          <div className="mono-xs">Notes</div>
          <ul className="notes">{o.notes.map((n) => <li key={n.id}>{n.body}</li>)}</ul>
        </div>
      )}
      <p className="mono-xs slip__foot">Exchange, not refund · unworn with tags within the exchange window · Amerapelle, Lagos</p>
      <button className="btn btn--short slip__print" onClick={() => window.print()}>Print</button>
    </div>
  );
}
