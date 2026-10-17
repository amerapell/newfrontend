"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check } from "@/components/cart/Check";
import { ProductCard } from "@/components/product/ProductCard";
import { Drawer } from "@/components/ui/Drawer";
import { FieldBox, SelectBox, TextAreaBox } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useWishlist } from "@/context/WishlistContext";
import { accountApi, ApiError } from "@/lib/api";
import { ORDER_STATUS_LABEL, apiMessage, localPhoneDisplay, longDate, naira, toE164NG } from "@/lib/format";
import { useNgStates } from "@/lib/useNgStates";
import type { Address, Order } from "@/lib/types";
import { useAccount } from "./AccountShell";
import { CreditLocked } from "./EmailVerification";
import { OrderItems, OrderMeta, OrderTotals, Progress } from "./OrderParts";

export function canExchange(o: Order) {
  return o.status === "DELIVERED" && !!o.exchangeableUntil && new Date(o.exchangeableUntil).getTime() > Date.now() && o.items.some((i) => i.exchangeable);
}

const pieces = (o: Order) => o.items.reduce((s, i) => s + i.quantity, 0);

/* ---------------- Orders ---------------- */

export function OrdersList({ compact }: { compact?: boolean }) {
  const { orders } = useAccount();
  if (!orders) return <p className="cm-soft" aria-busy="true">Loading orders…</p>;
  if (!orders.length)
    return (
      <div className="cm-empty cm-empty--inline">
        <p>You haven&apos;t placed any orders yet.</p>
        <Link href="/c/new-in" className="u-link">Continue shopping</Link>
      </div>
    );
  return (
    <table className="cm-table">
      <caption className="sr-only">{compact ? "Recent orders" : "Your orders"}</caption>
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Date</th>
          <th scope="col">Items</th>
          <th scope="col">Status</th>
          <th scope="col" className="cm-num">Total</th>
        </tr>
      </thead>
      <tbody>
        {(compact ? orders.slice(0, 3) : orders).map((o) => (
          <tr key={o.id}>
            <th scope="row">
              <Link href={`/account/orders/${o.number}`} className="u-link">{o.number}</Link>
            </th>
            <td data-label="Date">{longDate(o.createdAt)}</td>
            <td data-label="Items">{pieces(o)}</td>
            <td data-label="Status">{ORDER_STATUS_LABEL[o.status]}</td>
            <td data-label="Total" className="cm-num tnum">{naira(o.totalKobo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** PATCH /me — name, phone, marketing consent. */
function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: localPhoneDisplay(user?.phone) });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="cm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const phone = f.phone.trim() ? toE164NG(f.phone) : null;
        if (f.phone.trim() && !phone) return setErr("Enter a Nigerian phone number, e.g. 0803 000 0000.");
        setBusy(true);
        setErr(null);
        try {
          await accountApi.updateMe({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone, marketingConsent: consent });
          await refreshUser();
          toast.show({ message: "Profile saved." });
        } catch (x) {
          setErr(apiMessage(x));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="cm-fields">
        <FieldBox label="First name" autoComplete="given-name" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
        <FieldBox label="Last name" autoComplete="family-name" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        <FieldBox full label="Phone (+234)" type="tel" autoComplete="tel-national" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <Check id="me-consent" checked={consent} onChange={setConsent} sub="Optional. Unsubscribe any time.">Email me about new drops and private sales</Check>
      {err && <p className="cm-error" role="alert">{err}</p>}
      <button className="btn btn--secondary cm-btn-auto" disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
    </form>
  );
}

export function AccountOverview() {
  const { user } = useAuth();
  const { orders, credit } = useAccount();
  const eligible = orders?.filter(canExchange) ?? [];
  const balance = credit?.balanceKobo ?? user?.creditBalanceKobo ?? 0;
  return (
    <div className="cm-stack-lg">
      <p>
        Hello{user?.firstName ? `, ${user.firstName}` : ""}. <span className="cm-soft">Signed in as {user?.email}.</span>
      </p>
      {user?.emailVerified === false ? (
        <CreditLocked />
      ) : (
        <div className="cm-block cm-credit">
          <p className="cm-credit__label">Exchange credit</p>
          <p className="cm-figure tnum">{naira(balance)}</p>
          <Link href="/account/exchanges" className="u-link">Exchanges &amp; credit</Link>
        </div>
      )}
      {eligible.length > 0 && (
        <p className="cm-block">
          {eligible[0].number} can be exchanged until {longDate(eligible[0].exchangeableUntil)}. <Link href={`/account/exchanges?order=${eligible[0].number}`} className="u-link">Request an exchange</Link>
        </p>
      )}
      <section aria-labelledby="recent-h">
        <div className="cm-sechead">
          <h2 id="recent-h" className="cm-h2">Recent orders</h2>
          <Link href="/account/orders" className="u-link">All orders</Link>
        </div>
        <OrdersList compact />
      </section>
      <section aria-labelledby="details-h">
        <div className="cm-sechead">
          <h2 id="details-h" className="cm-h2">Your details</h2>
        </div>
        <ProfileForm />
      </section>
    </div>
  );
}

export function OrdersPage() {
  return <OrdersList />;
}

const ORDER_STEPS = (pickup: boolean) => [
  { label: "Paid", desc: "Payment confirmed", s: ["PAID"] },
  { label: "Processing", desc: "Packed in Lagos", s: ["PROCESSING"] },
  pickup ? { label: "Ready", desc: "Collect from the store", s: ["READY_FOR_PICKUP"] } : { label: "Dispatched", desc: "Rider on the way", s: ["DISPATCHED"] },
  { label: pickup ? "Collected" : "Delivered", desc: "Enjoy it", s: ["DELIVERED", "EXCHANGE_REQUESTED", "EXCHANGED"] },
];

export function OrderDetail({ order, headingLevel = 2 }: { order: Order; headingLevel?: 1 | 2 }) {
  const pickup = order.delivery.zone === "PICKUP";
  const steps = ORDER_STEPS(pickup);
  const reached = order.status === "PENDING_PAYMENT" || order.status === "CANCELLED" ? 0 : steps.findIndex((s) => s.s.includes(order.status)) + 1;
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="cm-stack-lg">
      <div className="cm-stack">
        <H className={headingLevel === 1 ? "cm-title" : "cm-h2"}>Order {order.number}</H>
        <p className="cm-soft">
          {ORDER_STATUS_LABEL[order.status]} · Placed {longDate(order.createdAt)}
          {order.deliveredAt ? ` · Delivered ${longDate(order.deliveredAt)}` : ""}
        </p>
      </div>
      {order.status === "CANCELLED" ? <p className="cm-alert">This order was cancelled.</p> : <Progress label="Order progress" steps={steps} reached={reached} />}
      {canExchange(order) && (
        <p className="cm-block">
          Exchangeable until {longDate(order.exchangeableUntil)}. <Link href={`/account/exchanges?order=${order.number}`} className="u-link">Request an exchange</Link>
        </p>
      )}
      <div className="cm-split cm-split--inner">
        <div className="cm-split__main">
          <OrderItems order={order} />
        </div>
        <aside className="cm-split__aside" aria-label="Order details">
          <OrderTotals order={order} />
          <OrderMeta order={order} />
        </aside>
      </div>
    </div>
  );
}

export function AccountOrderDetail({ number }: { number: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    accountApi
      .order(number)
      .then(setOrder)
      .catch((e) => setErr(e instanceof ApiError && e.status === 404 ? "We couldn't find that order on your account." : apiMessage(e)));
  }, [number]);
  return (
    <div className="cm-stack-lg">
      <Link href="/account/orders" className="u-link cm-self-start">‹ All orders</Link>
      {err ? <p role="alert">{err}</p> : order ? <OrderDetail order={order} /> : <p className="cm-soft" aria-busy="true">Loading order…</p>}
    </div>
  );
}

/* ---------------- Addresses ---------------- */

const blank: Address = { fullName: "", phone: "", state: "Lagos", lga: "", area: "", street: "", landmark: "", note: "" };

function AddressForm({ id, initial, onSave, onBusy }: { id: string; initial: Address; onSave: (a: Address) => Promise<void>; onBusy: (b: boolean) => void }) {
  const ng = useNgStates();
  const [a, setA] = useState<Address>({ ...initial, phone: localPhoneDisplay(initial.phone) || initial.phone });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof Address, v: string) => setA((x) => ({ ...x, [k]: v, ...(k === "state" ? { lga: "" } : {}) }));
  return (
    <form
      id={id}
      className="cm-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const phone = toE164NG(a.phone);
        if (!a.fullName || !phone || !a.lga || !a.area || !a.street || !a.landmark) return setErr("Fill in every field (the note is optional). The phone number must be Nigerian.");
        setErr(null);
        onBusy(true);
        try {
          await onSave({ ...a, phone });
        } catch (x) {
          setErr(apiMessage(x));
        } finally {
          onBusy(false);
        }
      }}
    >
      <div className="cm-fields">
        <FieldBox full label="Full name" value={a.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" required />
        <FieldBox full label="Phone (+234)" type="tel" value={a.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel-national" required />
        <SelectBox label="State" value={a.state} onChange={(e) => set("state", e.target.value)}>
          {ng.names.map((s) => <option key={s}>{s}</option>)}
        </SelectBox>
        <SelectBox label="LGA" value={a.lga} onChange={(e) => set("lga", e.target.value)}>
          <option value="">Choose an LGA</option>
          {ng.lgasFor(a.state).map((l) => <option key={l}>{l}</option>)}
        </SelectBox>
        <FieldBox full label="City / area" value={a.area} onChange={(e) => set("area", e.target.value)} required />
        <FieldBox full label="Street address" value={a.street} onChange={(e) => set("street", e.target.value)} autoComplete="street-address" required />
        <FieldBox full label="Nearest landmark" value={a.landmark} onChange={(e) => set("landmark", e.target.value)} required hint="Helps the rider find you." />
        <TextAreaBox full label="Delivery note (optional)" rows={2} value={a.note ?? ""} onChange={(e) => set("note", e.target.value)} />
      </div>
      {err && <p className="cm-error" role="alert">{err}</p>}
    </form>
  );
}

export function AddressesPage() {
  const { addresses, setAddresses } = useAccount();
  const toast = useToast();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = addresses ?? [];
  const current = editing === "new" ? blank : list.find((a) => a.id === editing) ?? null;

  const save = async (a: Address) => {
    if (editing === "new") {
      const created = await accountApi.addAddress(a);
      setAddresses([...list, created]);
      toast.show({ message: "Address saved." });
    } else if (editing) {
      const updated = await accountApi.updateAddress(editing, a);
      setAddresses(list.map((y) => (y.id === editing ? updated : y)));
      toast.show({ message: "Address updated." });
    }
    setEditing(null);
  };

  return (
    <div className="cm-stack-lg">
      <p className="cm-soft">Saved addresses fill checkout faster. No postcode needed — a landmark helps the rider.</p>
      {addresses === null ? (
        <p className="cm-soft" aria-busy="true">Loading addresses…</p>
      ) : list.length ? (
        <ul className="cm-addresses">
          {list.map((a) => (
            <li key={a.id} className="cm-address">
              <p>{a.fullName}</p>
              <p>{a.street}, {a.area}</p>
              <p>{a.lga}, {a.state}</p>
              <p className="cm-soft">Near {a.landmark}</p>
              <p className="cm-soft">{localPhoneDisplay(a.phone) ? `+234 ${localPhoneDisplay(a.phone)}` : a.phone}</p>
              <div className="cm-links">
                <button type="button" className="cm-textbtn cm-textbtn--ink" onClick={() => setEditing(a.id!)}>
                  Edit<span className="sr-only"> address for {a.fullName}, {a.street}</span>
                </button>
                <button
                  type="button"
                  className="cm-textbtn cm-textbtn--ink"
                  onClick={async () => {
                    setErr(null);
                    try {
                      await accountApi.deleteAddress(a.id!);
                      setAddresses(list.filter((y) => y.id !== a.id));
                      toast.show({ message: "Address deleted." });
                    } catch (x) {
                      setErr(apiMessage(x));
                    }
                  }}
                >
                  Delete<span className="sr-only"> address for {a.fullName}, {a.street}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no saved addresses yet.</p>
      )}
      {err && <p className="cm-error" role="alert">{err}</p>}
      <button type="button" className="btn btn--secondary cm-btn-auto" onClick={() => setEditing("new")}>Add an address</button>

      <Drawer
        open={current !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add an address" : "Edit address"}
        footer={
          <div className="cm-drawer-foot">
            <button type="submit" form="address-form" className="btn btn--primary btn--block" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        }
      >
        {current && <AddressForm key={editing ?? "x"} id="address-form" initial={current} onSave={save} onBusy={setBusy} />}
      </Drawer>
    </div>
  );
}

/* ---------------- Wishlist ---------------- */

export function WishlistPage() {
  const { items, reload } = useWishlist();
  useEffect(() => {
    void reload();
  }, [reload]);
  return items.length ? (
    <div className="cm-grid">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} sizes="(max-width: 767px) 50vw, 25vw" />
      ))}
    </div>
  ) : (
    <div className="cm-empty cm-empty--inline">
      <p>Your wishlist is empty.</p>
      <p className="cm-soft">Save any piece with the bookmark icon to keep it here.</p>
      <Link href="/c/new-in" className="u-link">Continue shopping</Link>
    </div>
  );
}

/* ---------------- Privacy (NDPA) ---------------- */

export function PrivacyPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const exportData = async () => {
    setBusy("export");
    setErr(null);
    try {
      const data = await accountApi.dataExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `amerapelle-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const del = async () => {
    setBusy("delete");
    setErr(null);
    try {
      await accountApi.deleteAccount();
      await logout();
      router.push("/");
    } catch (e) {
      setErr(apiMessage(e));
      setBusy(null);
    }
  };
  return (
    <div className="cm-stack-lg">
      <p className="cm-soft">Under the Nigeria Data Protection Act 2023 you can download everything we hold about you, or delete your account. Order records we must keep for tax are anonymised.</p>
      <section className="cm-block cm-stack" aria-labelledby="export-h">
        <h2 id="export-h" className="cm-h2">Download your data</h2>
        <p>A JSON file with your profile, addresses, orders, exchanges, credit and wishlist.</p>
        <button type="button" className="btn btn--secondary cm-btn-auto" onClick={exportData} disabled={busy !== null}>{busy === "export" ? "Preparing…" : "Download my data"}</button>
      </section>
      <section className="cm-block cm-stack" aria-labelledby="delete-h">
        <h2 id="delete-h" className="cm-h2">Delete your account</h2>
        <p>This signs you out everywhere and anonymises your personal data. Unspent exchange credit is forfeited. This can&apos;t be undone.</p>
        <FieldBox label='Type "DELETE" to confirm' value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        <button type="button" className="btn btn--secondary cm-btn-auto" disabled={confirm !== "DELETE" || busy !== null} onClick={del}>{busy === "delete" ? "Deleting…" : "Delete my account"}</button>
      </section>
      {err && <p className="cm-error" role="alert">{err}</p>}
      <p className="cm-small cm-soft">
        See our <Link href="/policies/privacy" className="u-link">Privacy Policy</Link> for how we use your data.
      </p>
    </div>
  );
}

export function useEligibleOrders(orders: Order[] | null) {
  return useMemo(() => (orders ?? []).filter(canExchange), [orders]);
}
