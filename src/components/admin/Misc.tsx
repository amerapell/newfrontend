"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckRow, FieldBox, SelectBox, TextAreaBox } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { adminApi, uploadImage } from "@/lib/api";
import { EXCHANGE_STATUS_LABEL, apiMessage, longDate, naira, slugify } from "@/lib/format";
import type { AdminCollection, ContentPage, DeliveryZone, Discount, DiscountType, ExchangeStatus, FaqItemAdmin, StoreSettings } from "@/lib/types";
import { AdminHead, setAdminTotpFlag, useAdmin, useAsync } from "./AdminShell";

function useMutate() {
  const toast = useToast();
  const { onError } = useAdmin();
  return async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | null> => {
    try {
      const r = await fn();
      if (ok) toast.show({ message: ok });
      return r;
    } catch (e) {
      onError(e);
      toast.show({ message: apiMessage(e), tone: "error" });
      return null;
    }
  };
}

const koboIn = (v: string) => (v ? Math.round(Number(v.replace(/[^\d.]/g, "")) * 100) : 0);
const nairaIn = (k: number | null | undefined) => (k ? String(k / 100) : "");

/* ---------------- Exchanges ---------------- */

const EX_STATUSES: ExchangeStatus[] = ["REQUESTED", "APPROVED", "ITEM_RECEIVED", "CREDIT_ISSUED", "COMPLETED", "DECLINED"];

export function ExchangesAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "";
  const { data, setData, loading } = useAsync(() => adminApi.exchanges(status || undefined), [status]);
  const mutate = useMutate();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const act = async (id: string, action: "approve" | "decline" | "receive" | "complete") => {
    const msg = { approve: "Approved · return instructions emailed", decline: "Declined · customer emailed", receive: "Received · credit issued and stock restored", complete: "Completed" }[action];
    const r = await mutate(() => adminApi.exchangeAction(id, action, notes[id] || undefined), msg);
    if (r && data) setData(data.map((x) => (x.id === id ? r : x)));
  };
  return (
    <>
      <AdminHead index={`Exchanges · ${data?.length ?? "…"}`} title={<>Exchange <em>requests</em></>} />
      <div className="admin-filters">
        <select className="admin-input" value={status} onChange={(e) => router.replace(`/admin/exchanges${e.target.value ? `?status=${e.target.value}` : ""}`)} aria-label="Status">
          <option value="">All statuses</option>
          {EX_STATUSES.map((s) => <option key={s} value={s}>{EXCHANGE_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {loading && !data && <p className="mono-label">Loading…</p>}
      <ul className="admin-list">
        {data?.map((e) => (
          <li key={e.id} className="admin-card">
            <div className="row between wrap gap-12">
              <div className="stack">
                <Link href={`/admin/exchanges/${e.id}`} className="serif admin-list__title">{e.number}</Link>
                <span className="mono-xs">Order {e.orderNumber} · {longDate(e.createdAt)}{e.email ? ` · ${e.email}` : ""}</span>
              </div>
              <span className="row gap-12">
                <span className={`status-pill status-pill--${e.status.toLowerCase()}`}>{EXCHANGE_STATUS_LABEL[e.status]}</span>
                <span className="tnum">{naira(e.creditKobo)}</span>
                <Link href={`/admin/exchanges/${e.id}`} className="ap-link small-link">View →</Link>
              </span>
            </div>
            <p><b>{e.reason}</b>{e.note ? ` — ${e.note}` : ""}</p>
            <p className="mono-xs">{e.items.map((i) => `${i.name} × ${i.quantity} (${naira(i.valueKobo)})`).join(" · ")}</p>
            {e.photoUrls.length > 0 && (
              <div className="row gap-8">
                {e.photoUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="photos__thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="Customer photo" />
                  </a>
                ))}
              </div>
            )}
            <ol className="ex-timeline">
              {e.history.map((h, k) => (
                <li key={k}><span className="mono-xs">{longDate(h.at)}</span> {EXCHANGE_STATUS_LABEL[h.status]}{h.note ? ` — ${h.note}` : ""}</li>
              ))}
            </ol>
            {!["COMPLETED", "DECLINED"].includes(e.status) && (
              <div className="row gap-12 wrap">
                <input className="admin-input admin-input--grow" placeholder="Note to customer (optional)" value={notes[e.id] ?? ""} onChange={(x) => setNotes({ ...notes, [e.id]: x.target.value })} aria-label="Note" />
                {e.status === "REQUESTED" && (
                  <>
                    <button className="btn btn--short" onClick={() => act(e.id, "approve")}>Approve</button>
                    <button className="btn btn--ghost" onClick={() => act(e.id, "decline")}>Decline</button>
                  </>
                )}
                {e.status === "APPROVED" && <button className="btn btn--short" onClick={() => act(e.id, "receive")}>Mark received · issue {naira(e.creditKobo)}</button>}
                {(e.status === "CREDIT_ISSUED" || e.status === "ITEM_RECEIVED") && <button className="btn btn--short" onClick={() => act(e.id, "complete")}>Complete</button>}
              </div>
            )}
          </li>
        ))}
        {data && !data.length && <li className="muted">No exchanges.</li>}
      </ul>
    </>
  );
}

/* ---------------- Collections ---------------- */

function HeroImageField({ value, onChange }: { value: string | null | undefined; onChange: (url: string | null) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="hero-field">
      <span className="hero-field__label">Hero image · home panel and menu feature (landscape, at least 1600 × 1000)</span>
      <div className="hero-field__img">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" />
        ) : (
          <span className="t-small t-grey">No image — the home panel shows a plain ground</span>
        )}
      </div>
      <div className="row gap-16">
        <label className="u-link">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                onChange(await uploadImage(f));
              } catch (x) {
                toast.show({ message: apiMessage(x, `Couldn't upload ${f.name}`), tone: "error" });
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
          {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </label>
        {value && <button type="button" className="u-link" onClick={() => onChange(null)}>Remove</button>}
      </div>
    </div>
  );
}

export function CollectionsAdmin() {
  const { data, setData } = useAsync(() => adminApi.collections(), []);
  const mutate = useMutate();
  const [editing, setEditing] = useState<Partial<AdminCollection> | null>(null);
  const save = async () => {
    if (!editing?.name) return;
    const body: Partial<AdminCollection> = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      description: editing.description ?? null,
      isDrop: !!editing.isDrop,
      goLiveAt: editing.goLiveAt ?? null,
      heroImageUrl: editing.heroImageUrl ?? null,
      homeOrder: editing.homeOrder ?? null,
      tagline: editing.tagline?.trim() || null,
    };
    const r = editing.id ? await mutate(() => adminApi.updateCollection(editing.id!, body), "Saved.") : await mutate(() => adminApi.createCollection(body), "Created.");
    if (r && data) {
      setData(editing.id ? data.map((c) => (c.id === r.id ? { ...c, ...r } : c)) : [...data, r]);
      setEditing(null);
    }
  };
  return (
    <>
      <AdminHead index="Collections" title="Collections & drops" actions={<button className="btn btn--primary" onClick={() => setEditing({ name: "", slug: "", description: "", isDrop: false, goLiveAt: null, heroImageUrl: null, homeOrder: null, tagline: null })}>New collection</button>} />
      {editing && (
        <section className="admin-card">
          <div className="field-grid field-grid--200">
            <FieldBox label="Name" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <FieldBox label="Slug" value={editing.slug ?? ""} placeholder={slugify(editing.name ?? "")} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
            <FieldBox
              label="Home order · empty = not on the home page"
              inputMode="numeric"
              value={editing.homeOrder != null ? String(editing.homeOrder) : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setEditing({ ...editing, homeOrder: v === "" ? null : Number(v) });
              }}
            />
            <FieldBox label="Hero link label · default “Discover the collection”" value={editing.tagline ?? ""} maxLength={80} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} />
            <FieldBox label="Go live at · drops" type="datetime-local" value={editing.goLiveAt ? editing.goLiveAt.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, goLiveAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            <TextAreaBox full label="Description" rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <HeroImageField value={editing.heroImageUrl} onChange={(url) => setEditing({ ...editing, heroImageUrl: url })} />
          <CheckRow checked={!!editing.isDrop} onChange={(v) => setEditing({ ...editing, isDrop: v })} id="isdrop" sub="Scheduled; goes live at the time above, with a countdown. A live or upcoming drop is always the first home panel.">This is a drop</CheckRow>
          <div className="row gap-16"><button className="btn btn--primary" onClick={save}>Save</button><button className="u-link" onClick={() => setEditing(null)}>Cancel</button></div>
        </section>
      )}
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Slug</th><th className="num">Pieces</th><th className="num">Home</th><th>Drop</th><th /></tr></thead>
        <tbody>
          {data?.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="t-grey">/c/{c.slug}</td>
              <td className="num tnum">{c.productCount ?? c.count}</td>
              <td className="num tnum">{c.homeOrder ?? "—"}</td>
              <td className="t-grey">{c.isDrop ? `Live ${c.goLiveAt ? longDate(c.goLiveAt) : "—"}` : ""}</td>
              <td className="num">
                <button className="u-link" onClick={() => setEditing(c)}>Edit</button>{" "}
                <button className="u-link t-grey" onClick={async () => { if (confirm(`Delete ${c.name}? Products stay.`) && (await mutate(() => adminApi.deleteCollection(c.id), "Deleted.")) !== null) setData(data.filter((x) => x.id !== c.id)); }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---------------- Discounts ---------------- */

export function DiscountsAdmin() {
  const { data, setData } = useAsync(() => adminApi.discounts(), []);
  const mutate = useMutate();
  const blank = { code: "", type: "PERCENT" as DiscountType, value: 10, maxUses: null, minSubtotalKobo: null, startsAt: null, endsAt: null };
  const [d, setD] = useState<Omit<Discount, "id">>(blank);
  return (
    <>
      <AdminHead index="Discounts" title={<>Promo <em>codes</em></>} />
      <section className="admin-card">
        <div className="mono-label admin-card__head">New code</div>
        <form
          className="field-grid field-grid--200"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!d.code.trim()) return;
            const r = await mutate(() => adminApi.createDiscount({ ...d, code: d.code.trim().toUpperCase() }), "Code created.");
            if (r && data) {
              setData([...data, r]);
              setD(blank);
            }
          }}
        >
          <FieldBox label="Code" value={d.code} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })} />
          <SelectBox label="Type" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as DiscountType })}>
            <option value="PERCENT">Percentage</option>
            <option value="FIXED">Fixed amount (₦)</option>
            <option value="FREE_DELIVERY">Free delivery</option>
          </SelectBox>
          {d.type !== "FREE_DELIVERY" && (
            <FieldBox label={d.type === "PERCENT" ? "Percent off" : "Amount off ₦"} inputMode="numeric" value={d.type === "PERCENT" ? String(d.value) : nairaIn(d.value)} onChange={(e) => setD({ ...d, value: d.type === "PERCENT" ? Math.min(100, Number(e.target.value.replace(/\D/g, ""))) : koboIn(e.target.value) })} />
          )}
          <FieldBox label="Min subtotal ₦ · optional" inputMode="numeric" value={nairaIn(d.minSubtotalKobo)} onChange={(e) => setD({ ...d, minSubtotalKobo: koboIn(e.target.value) || null })} />
          <FieldBox label="Max uses · optional" inputMode="numeric" value={d.maxUses ? String(d.maxUses) : ""} onChange={(e) => setD({ ...d, maxUses: Number(e.target.value.replace(/\D/g, "")) || null })} />
          <FieldBox label="Starts" type="date" value={d.startsAt?.slice(0, 10) ?? ""} onChange={(e) => setD({ ...d, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          <FieldBox label="Ends" type="date" value={d.endsAt?.slice(0, 10) ?? ""} onChange={(e) => setD({ ...d, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          <div className="field-wrap"><button className="btn btn--short">Create code</button></div>
        </form>
      </section>
      <table className="admin-table">
        <thead><tr><th>Code</th><th>Type</th><th className="num">Value</th><th className="num">Min</th><th className="num">Uses</th><th>Window</th><th /></tr></thead>
        <tbody>
          {data?.map((x) => (
            <tr key={x.id}>
              <td className="mono">{x.code}</td>
              <td className="mono-xs">{x.type.replace("_", " ")}</td>
              <td className="num tnum">{x.type === "PERCENT" ? `${x.value}%` : x.type === "FIXED" ? naira(x.value) : "—"}</td>
              <td className="num tnum">{x.minSubtotalKobo ? naira(x.minSubtotalKobo) : "—"}</td>
              <td className="num tnum">{x.uses ?? 0}{x.maxUses ? ` / ${x.maxUses}` : ""}</td>
              <td className="mono-xs">{x.startsAt ? longDate(x.startsAt) : "Now"} → {x.endsAt ? longDate(x.endsAt) : "∞"}</td>
              <td className="num"><button className="ap-link small-link muted" onClick={async () => { if ((await mutate(() => adminApi.deleteDiscount(x.id), "Deleted.")) !== null) setData(data.filter((y) => y.id !== x.id)); }}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---------------- Delivery zones ---------------- */

export function ZonesAdmin() {
  const { data, setData } = useAsync(() => adminApi.zones(), []);
  const mutate = useMutate();
  const [draft, setDraft] = useState<Record<string, Partial<DeliveryZone>>>({});
  return (
    <>
      <AdminHead index="Delivery zones" title={<>Delivery &amp; <em>fees</em></>} />
      <table className="admin-table">
        <thead><tr><th>Zone</th><th>Name</th><th>ETA text</th><th className="num">Fee ₦</th><th>Active</th><th /></tr></thead>
        <tbody>
          {data?.map((z) => {
            const d = { ...z, ...draft[z.id] };
            const upd = (p: Partial<DeliveryZone>) => setDraft({ ...draft, [z.id]: { ...draft[z.id], ...p } });
            return (
              <tr key={z.id}>
                <td className="mono-xs">{z.code}</td>
                <td><input className="admin-input" value={d.name} onChange={(e) => upd({ name: e.target.value })} aria-label={`${z.code} name`} /></td>
                <td><input className="admin-input" value={d.etaText} onChange={(e) => upd({ etaText: e.target.value.toUpperCase() })} aria-label={`${z.code} ETA`} /></td>
                <td className="num"><input className="admin-input admin-input--num" inputMode="numeric" value={nairaIn(d.feeKobo) || "0"} onChange={(e) => upd({ feeKobo: koboIn(e.target.value) })} aria-label={`${z.code} fee`} /></td>
                <td><input type="checkbox" checked={d.active} onChange={(e) => upd({ active: e.target.checked })} aria-label={`${z.code} active`} /></td>
                <td className="num">
                  {draft[z.id] && (
                    <button className="btn btn--ghost" onClick={async () => { const r = await mutate(() => adminApi.updateZone(z.id, draft[z.id]), "Zone saved."); if (r) { setData(data.map((x) => (x.id === z.id ? r : x))); const n = { ...draft }; delete n[z.id]; setDraft(n); } }}>Save</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ---------------- Settings ---------------- */

/** ADM-6 enrolment: POST /admin/auth/totp/setup → scan/enter key → POST /admin/auth/totp/enable {code}. */
function TotpSetupCard() {
  const params = useSearchParams();
  const mutate = useMutate();
  const [setup, setSetup] = useState<{ otpauthUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "done" | "already">("idle");
  const start = async () => {
    try {
      setSetup(await adminApi.totpSetup());
    } catch (e) {
      const msg = apiMessage(e);
      if (/already enabled/i.test(msg)) {
        setState("already");
        setAdminTotpFlag(true);
      } else void mutate(() => Promise.reject(e));
    }
  };
  const enable = async () => {
    const r = await mutate(() => adminApi.totpEnable(code.replace(/\s/g, "")), "Two-step verification is on.");
    if (r) {
      setState("done");
      setAdminTotpFlag(true);
    }
  };
  return (
    <section className={`admin-card${params.get("setup") === "totp" ? " admin-card--focus" : ""}`} id="security">
      <div className="mono-label admin-card__head">Security · two-step verification (TOTP)</div>
      {state === "done" || state === "already" ? (
        <p className="form-ok">Two-step verification is enabled. You&apos;ll be asked for a code at every sign-in.</p>
      ) : !setup ? (
        <div className="row gap-16 wrap">
          <p className="body-copy">Protect the admin with a 6-digit code from Google Authenticator, 1Password or Authy.</p>
          <button className="btn btn--short" onClick={start}>Set up two-step verification</button>
        </div>
      ) : (
        <div className="stack gap-12">
          <div className="totp-setup">
            <span className="mono-xs">1 — Add this key to your authenticator app</span>
            <code className="totp-setup__secret">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
            <a href={setup.otpauthUrl} className="ap-link small-link">Open in authenticator app</a>
          </div>
          <span className="mono-xs">2 — Enter the 6-digit code it shows</span>
          <div className="row gap-12">
            <input className="admin-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Authenticator code" />
            <button className="btn btn--short" disabled={code.replace(/\s/g, "").length !== 6} onClick={enable}>Turn on</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function SettingsAdmin() {
  const { data } = useAsync(() => adminApi.settings(), []);
  const mutate = useMutate();
  const [s, setS] = useState<StoreSettings | null>(null);
  useEffect(() => {
    if (data) setS(data);
  }, [data]);
  if (!s) return <p className="mono-label">Loading…</p>;
  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS({ ...s, [k]: v });
  const drop = s.drop ?? { title: "", collectionSlug: "", goLiveAt: null, firstRunTotal: 0, firstRunLeft: 0 };
  const setDrop = (p: Partial<typeof drop>) => set("drop", { ...drop, ...p });
  return (
    <>
      <AdminHead index="Settings" title={<>Store <em>settings</em></>} actions={<button className="btn btn--short" onClick={() => mutate(() => adminApi.updateSettings(s), "Settings saved.")}>Save settings</button>} />
      <div className="admin-form">
        <TotpSetupCard />
        <section className="admin-card">
          <div className="mono-label admin-card__head">Payments</div>
          <CheckRow checked={s.paystackEnabled} onChange={(v) => set("paystackEnabled", v)} id="ps" sub="Naira card · bank transfer · ussd">Paystack enabled</CheckRow>
          <CheckRow checked={s.bachsEnabled} onChange={(v) => set("bachsEnabled", v)} id="bx" sub="Foreign cards · transfer · USDT/USDC · settles in naira">Bachs enabled</CheckRow>
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Delivery, exchanges &amp; credit</div>
          <div className="field-grid field-grid--200">
            <FieldBox label="Free delivery over ₦ · blank = off" inputMode="numeric" value={nairaIn(s.freeDeliveryThresholdKobo)} onChange={(e) => set("freeDeliveryThresholdKobo", koboIn(e.target.value) || null)} />
            <FieldBox label="Exchange window · days" inputMode="numeric" value={String(s.exchangeWindowDays)} onChange={(e) => set("exchangeWindowDays", Number(e.target.value.replace(/\D/g, "")) || 0)} />
            <FieldBox label="Credit expiry · days · blank = never" inputMode="numeric" value={s.creditExpiryDays ? String(s.creditExpiryDays) : ""} onChange={(e) => set("creditExpiryDays", Number(e.target.value.replace(/\D/g, "")) || null)} />
          </div>
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Store &amp; contact</div>
          <div className="field-grid field-grid--200">
            <FieldBox full label="Pickup address" value={s.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} />
            <FieldBox full label="Opening hours" value={s.openingHours} onChange={(e) => set("openingHours", e.target.value)} />
            <FieldBox label="WhatsApp · 234…" value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value.replace(/[^\d]/g, ""))} />
            <FieldBox label="Phone" value={s.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
            <FieldBox label="Email" type="email" value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            <FieldBox label="Instagram URL" value={s.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} />
            <FieldBox label="TikTok URL" value={s.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} />
          </div>
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Ticker · one message per line</div>
          <TextAreaBox label="Ticker text" rows={5} value={s.tickerText.join("\n")} onChange={(e) => set("tickerText", e.target.value.split("\n").map((x) => x.toUpperCase()))} />
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Drop / banner</div>
          <CheckRow checked={!!s.drop} onChange={(v) => set("drop", v ? drop : null)} id="hasdrop" sub="Shows the home hero countdown and nav link">Feature a drop</CheckRow>
          {s.drop && (
            <div className="field-grid field-grid--200">
              <FieldBox label="Title · e.g. The Night Edit" value={drop.title} onChange={(e) => setDrop({ title: e.target.value })} />
              <FieldBox label="Collection slug" value={drop.collectionSlug} onChange={(e) => setDrop({ collectionSlug: slugify(e.target.value) })} />
              <FieldBox label="Goes live" type="datetime-local" value={drop.goLiveAt ? drop.goLiveAt.slice(0, 16) : ""} onChange={(e) => setDrop({ goLiveAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              <FieldBox label="First run · total" inputMode="numeric" value={String(drop.firstRunTotal)} onChange={(e) => setDrop({ firstRunTotal: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
              <FieldBox label="First run · left" inputMode="numeric" value={String(drop.firstRunLeft)} onChange={(e) => setDrop({ firstRunLeft: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ---------------- FAQ ---------------- */

export function FaqAdmin() {
  const { data, setData } = useAsync(() => adminApi.faq(), []);
  const mutate = useMutate();
  const [edit, setEdit] = useState<Partial<FaqItemAdmin> | null>(null);
  const groups = ["Orders", "Delivery", "Payments", "Exchanges", "Sizing", "Authenticity"];
  const save = async () => {
    if (!edit?.question || !edit.answer || !edit.group) return;
    const r = edit.id ? await mutate(() => adminApi.updateFaq(edit.id!, edit), "Saved.") : await mutate(() => adminApi.createFaq(edit as Omit<FaqItemAdmin, "id">), "Added.");
    if (r && data) {
      setData(edit.id ? data.map((x) => (x.id === r.id ? r : x)) : [...data, r]);
      setEdit(null);
    }
  };
  return (
    <>
      <AdminHead index="FAQ" title={<>Questions, <em>answered</em></>} actions={<button className="btn btn--short" onClick={() => setEdit({ group: "Orders", question: "", answer: "" })}>Add question +</button>} />
      {edit && (
        <section className="admin-card">
          <div className="field-grid field-grid--200">
            <SelectBox label="Group" value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })}>
              {groups.map((g) => <option key={g}>{g}</option>)}
            </SelectBox>
            <FieldBox full label="Question" value={edit.question ?? ""} onChange={(e) => setEdit({ ...edit, question: e.target.value })} />
            <TextAreaBox full label="Answer" rows={4} value={edit.answer ?? ""} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} />
          </div>
          <div className="row gap-12"><button className="btn btn--short" onClick={save}>Save</button><button className="ap-link small-link" onClick={() => setEdit(null)}>Cancel</button></div>
        </section>
      )}
      {groups.map((g) => {
        const items = data?.filter((f) => f.group === g) ?? [];
        if (!items.length) return null;
        return (
          <section key={g} className="admin-card">
            <div className="mono-label admin-card__head">{g.toUpperCase()}</div>
            <ul className="admin-list admin-list--plain">
              {items.map((f) => (
                <li key={f.id} className="row between gap-16">
                  <span><b>{f.question}</b><br /><span className="muted">{f.answer}</span></span>
                  <span className="row gap-12">
                    <button className="ap-link small-link" onClick={() => setEdit(f)}>Edit</button>
                    <button className="ap-link small-link muted" onClick={async () => { if ((await mutate(() => adminApi.deleteFaq(f.id), "Deleted.")) !== null) setData(data!.filter((x) => x.id !== f.id)); }}>Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/* ---------------- Pages ---------------- */

const PAGE_SLUGS = ["about", "delivery", "exchanges", "privacy", "terms"];

export function PagesAdmin() {
  const [slug, setSlug] = useState("about");
  const list = useAsync(() => adminApi.pages(), []);
  const slugs = Array.from(new Set([...PAGE_SLUGS, ...(list.data?.map((x) => x.slug) ?? [])]));
  const { data } = useAsync(() => adminApi.page(slug), [slug]);
  const mutate = useMutate();
  const [p, setP] = useState<ContentPage | null>(null);
  useEffect(() => setP(data), [data]);
  return (
    <>
      <AdminHead index="Pages" title={<>Content <em>pages</em></>} actions={p && <button className="btn btn--short" onClick={async () => { const r = await mutate(() => adminApi.updatePage(slug, { title: p.title, bodyMarkdown: p.bodyMarkdown }), "Page saved."); if (r) setP(r); }}>Save page</button>} />
      <div className="chip-row">
        {slugs.map((s) => (
          <button key={s} className={`chip${s === slug ? " chip--on" : ""}`} onClick={() => setSlug(s)}>{s}</button>
        ))}
      </div>
      {p ? (
        <section className="admin-card">
          <FieldBox label="Title" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
          <TextAreaBox label="Body · Markdown (## headings, - lists, **bold**, | tables |)" rows={18} value={p.bodyMarkdown} onChange={(e) => setP({ ...p, bodyMarkdown: e.target.value })} className="admin-md" />
          <p className="mono-xs">Last updated {longDate(p.updatedAt)} · live at {slug === "about" ? "/about" : PAGE_SLUGS.includes(slug) ? `/policies/${slug}` : `GET /pages/${slug}`}</p>
        </section>
      ) : (
        <p className="mono-label">Loading…</p>
      )}
    </>
  );
}
