"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { ORDER_STATUS_LABEL, creditReasonLabel, longDate, naira } from "@/lib/format";
import type { AdminCustomerSort } from "@/lib/types";
import { AdminHead, useAsync } from "./AdminShell";
import { addressLines } from "@/lib/countries";

const SORTS: { key: AdminCustomerSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "spent", label: "Total spent" },
  { key: "orders", label: "Most orders" },
];

export const customerHref = (email: string) => `/admin/customers/${encodeURIComponent(email)}`;

/** GET /admin/customers: registered accounts + guest checkout emails (paid orders), merged by email. */
export function CustomersAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const sort = (params.get("sort") as AdminCustomerSort | null) ?? "recent";
  const page = Number(params.get("page") || 1);
  const [q, setQ] = useState(params.get("q") ?? "");
  // Debounce the search box so typing doesn't fire a request per keystroke.
  const [query, setQuery] = useState(q);
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  const { data, loading, error } = useAsync(() => adminApi.customers({ q: query || undefined, sort, page }), [query, sort, page]);
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.delete("page");
    router.replace(`/admin/customers?${p}`);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <AdminHead title={`Customers${data ? ` (${data.total})` : ""}`} />
      <div className="admin-filters">
        <input className="admin-input" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
        <select className="admin-input" value={sort} onChange={(e) => setParam("sort", e.target.value === "recent" ? "" : e.target.value)} aria-label="Sort">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Customer</th><th>Account</th><th className="num">Orders</th><th className="num">Total spent</th><th className="num">Credit</th><th>Last order</th></tr></thead>
          <tbody>
            {loading && !data && <tr><td colSpan={6} className="mono-label">Loading…</td></tr>}
            {data?.items.map((c) => (
              <tr key={c.email}>
                <td>
                  <Link href={customerHref(c.email)} className="ap-link">{c.name}</Link>
                  <div className="mono-xs">{c.name !== c.email ? c.email : c.phone ?? ""}</div>
                </td>
                <td className="mono-xs">{c.registered ? (c.verified ? "Account" : "Account · unverified") : "Guest"}</td>
                <td className="num tnum">{c.orders}</td>
                <td className="num tnum">{naira(c.totalSpentKobo)}</td>
                <td className="num tnum">{c.creditBalanceKobo ? naira(c.creditBalanceKobo) : "—"}</td>
                <td className="mono-xs">{c.lastOrderAt ? longDate(c.lastOrderAt) : "—"}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={6} className="muted">No customers match.</td></tr>}
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

/** GET /admin/customers/:email: contact, totals, every order (paid or not), saved addresses and the credit ledger. */
export function CustomerAdminDetail({ email }: { email: string }) {
  const { data: c, error } = useAsync(() => adminApi.customer(email), [email]);
  if (!c) return <p className={error ? "form-error" : "mono-label"}>{error ?? "Loading…"}</p>;
  return (
    <>
      <AdminHead
        index={`Customers / ${c.registered ? "account" : "guest"}`}
        title={c.name}
        actions={<Link href="/admin/customers" className="btn btn--ghost">← All customers</Link>}
      />
      <div className="admin-form">
        <section className="admin-card">
          <div className="mono-label admin-card__head">Contact</div>
          <dl className="order-meta">
            <div><dt className="mono-xs">Email</dt><dd><a href={`mailto:${c.email}`} className="ap-link">{c.email}</a></dd></div>
            <div><dt className="mono-xs">Phone</dt><dd>{c.phone ?? "—"}</dd></div>
            <div><dt className="mono-xs">Account</dt><dd>{c.registered ? `Registered${c.joinedAt ? ` ${longDate(c.joinedAt)}` : ""} · ${c.verified ? "email confirmed" : "email not confirmed"}` : "Guest checkout"}</dd></div>
            <div><dt className="mono-xs">Paid orders</dt><dd className="tnum">{c.orders} · {naira(c.totalSpentKobo)}</dd></div>
            <div><dt className="mono-xs">Exchange credit</dt><dd className="tnum">{naira(c.creditBalanceKobo)}</dd></div>
          </dl>
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Orders · {c.orderList.length}</div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Placed</th><th>Status</th><th>Provider</th><th className="num">Items</th><th className="num">Total</th></tr></thead>
              <tbody>
                {c.orderList.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="ap-link">{o.number}</Link></td>
                    <td className="mono-xs">{longDate(o.createdAt)}</td>
                    <td><span className={`status-pill status-pill--${o.status.toLowerCase()}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                    <td className="mono-xs">{o.provider ?? "—"}</td>
                    <td className="num tnum">{o.itemCount}</td>
                    <td className="num tnum">{naira(o.totalKobo)}</td>
                  </tr>
                ))}
                {!c.orderList.length && <tr><td colSpan={6} className="muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {c.addresses.length > 0 && (
          <section className="admin-card">
            <div className="mono-label admin-card__head">Saved addresses</div>
            <ul className="stack gap-12">
              {c.addresses.map((a) => (
                <li key={a.id}>
                  {a.fullName} · {a.phone}
                  <div className="mono-xs">{addressLines(a).join(", ")}{a.landmark ? ` · ${a.landmark}` : ""}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="admin-card">
          <div className="mono-label admin-card__head">Credit ledger</div>
          {c.credit.length ? (
            <div className="table-scroll">
              <table className="admin-table">
                <thead><tr><th>Date</th><th>Reason</th><th className="num">Amount</th><th>Expires</th></tr></thead>
                <tbody>
                  {c.credit.map((e) => (
                    <tr key={e.id}>
                      <td className="mono-xs">{longDate(e.createdAt)}</td>
                      <td>{creditReasonLabel(e.reason)}</td>
                      <td className="num tnum">{e.amountKobo < 0 ? `−${naira(-e.amountKobo)}` : naira(e.amountKobo)}</td>
                      <td className="mono-xs">{e.expiresAt ? longDate(e.expiresAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No credit activity.</p>
          )}
        </section>
      </div>
    </>
  );
}
