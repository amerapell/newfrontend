"use client";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { naira } from "@/lib/format";
import { AdminHead, useAsync } from "./AdminShell";

/** ADM-5: today's sales, orders to fulfil, best sellers, low stock, orders by source (UTM). */
export function Dashboard() {
  const { data, error, loading } = useAsync(() => adminApi.dashboard(), []);
  const maxSource = Math.max(1, ...(data?.ordersBySource.map((s) => s.count) ?? [1]));
  const maxBest = Math.max(1, ...(data?.bestSellers.map((s) => s.units) ?? [1]));
  return (
    <>
      <AdminHead index="Dashboard" title={<>Today at <em>Amerapelle</em></>} />
      {error && <p className="form-error">{error}</p>}
      {loading && !data && <p className="mono-label">Loading…</p>}
      {data && (
        <>
          <div className="kpis">
            <div className="kpi">
              <span className="mono-label">Today&apos;s sales</span>
              <span className="serif tnum kpi__value">{naira(data.todaySalesKobo)}</span>
            </div>
            <Link href="/admin/orders?status=PAID" className="kpi">
              <span className="mono-label">Orders to fulfil</span>
              <span className="serif tnum kpi__value">{data.ordersToFulfil}</span>
              <span className="ap-link small-link">Open orders →</span>
            </Link>
            <Link href="/admin/exchanges?status=REQUESTED" className="kpi">
              <span className="mono-label">Exchanges to review</span>
              <span className="serif tnum kpi__value">{data.pendingExchanges}</span>
              <span className="ap-link small-link">Review →</span>
            </Link>
          </div>
          <div className="admin-grid">
            <section className="admin-card">
              <div className="mono-label admin-card__head">Best sellers · 30 days</div>
              <ul className="bars">
                {data.bestSellers.map((b) => (
                  <li key={b.name}>
                    <span className="bars__label">{b.name}</span>
                    <span className="bars__track"><span style={{ width: `${(b.units / maxBest) * 100}%` }} /></span>
                    <span className="tnum mono-xs">{b.units}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="admin-card">
              <div className="mono-label admin-card__head">Orders by source · UTM</div>
              <ul className="bars">
                {data.ordersBySource.map((s) => (
                  <li key={s.source}>
                    <span className="bars__label">{s.source}</span>
                    <span className="bars__track bars__track--navy"><span style={{ width: `${(s.count / maxSource) * 100}%` }} /></span>
                    <span className="tnum mono-xs">{s.count}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="admin-card admin-card--wide">
              <div className="mono-label admin-card__head row between">
                <span>Low stock</span>
                <Link href="/admin/products" className="ap-link small-link">Products →</Link>
              </div>
              <table className="admin-table">
                <thead><tr><th>SKU</th><th>Piece</th><th className="num">Available</th></tr></thead>
                <tbody>
                  {data.lowStock.map((l) => (
                    <tr key={l.sku}>
                      <td className="mono-xs">{l.sku}</td>
                      <td>{l.name}</td>
                      <td className={`num tnum${l.available === 0 ? " red" : ""}`}>{l.available}</td>
                    </tr>
                  ))}
                  {!data.lowStock.length && <tr><td colSpan={3} className="muted">Nothing running low.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </>
  );
}
