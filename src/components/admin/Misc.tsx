"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckRow, FieldBox, SelectBox, TextAreaBox } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { adminApi, backgroundRemovalAvailable, uploadCutout, uploadImage } from "@/lib/api";
import { EXCHANGE_STATUS_LABEL, apiMessage, longDate, naira, slugify } from "@/lib/format";
import type { AdminCollection, ContentPage, DeliveryZone, Discount, DiscountType, ExchangeStatus, FaqItemAdmin, HomeImageFocus, HomeMedia, HomePanel, StoreSettings } from "@/lib/types";
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
      <AdminHead title={`Exchanges${data ? ` (${data.length})` : ""}`} />
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
  return <ImageField label="Hero image · home panel and menu feature (landscape, at least 1600 × 1000)" empty="No image — the home panel shows a plain ground" value={value} onChange={onChange} allowCutout />;
}

/** One landscape photo slot. `allowCutout` offers background removal (subject placed on the stage ground, 3:2). */
function ImageField({ label, empty, value, onChange, allowCutout = false }: { label: string; empty: string; value: string | null | undefined; onChange: (url: string | null) => void; allowCutout?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [canCutout, setCanCutout] = useState(false);
  const [cutout, setCutout] = useState(false);
  useEffect(() => {
    if (!allowCutout) return;
    let live = true;
    void backgroundRemovalAvailable().then((ok) => live && setCanCutout(ok));
    return () => {
      live = false;
    };
  }, [allowCutout]);
  return (
    <div className="hero-field">
      <span className="hero-field__label">{label}</span>
      <div className="hero-field__img">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" />
        ) : (
          <span className="t-small t-grey">{empty}</span>
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
                onChange(canCutout && cutout ? (await uploadCutout(f, { layout: "landscape" })).url : await uploadImage(f));
              } catch (x) {
                toast.show({ message: apiMessage(x, `Couldn't upload ${f.name}`), tone: "error" });
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
          {busy ? (canCutout && cutout ? "Removing background…" : "Uploading…") : value ? "Replace image" : "Upload image"}
        </label>
        {value && <button type="button" className="u-link" onClick={() => onChange(null)}>Remove</button>}
      </div>
      {canCutout && (
        <label className="row gap-8 t-small">
          <input type="checkbox" checked={cutout} onChange={(e) => setCutout(e.target.checked)} />
          Remove background (puts the subject on the plain ground)
        </label>
      )}
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
      <AdminHead title="Collections" actions={<button className="btn btn--primary" onClick={() => setEditing({ name: "", slug: "", description: "", isDrop: false, goLiveAt: null, heroImageUrl: null, homeOrder: null, tagline: null })}>New collection</button>} />
      {editing && (
        <section className="admin-card">
          <div className="field-grid field-grid--200">
            <FieldBox label="Name" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <FieldBox label="Slug" value={editing.slug ?? ""} placeholder={slugify(editing.name ?? "")} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
            <FieldBox
              label="Home page position · empty = hidden"
              inputMode="numeric"
              value={editing.homeOrder != null ? String(editing.homeOrder) : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setEditing({ ...editing, homeOrder: v === "" ? null : Number(v) });
              }}
            />
            <FieldBox label="Banner link text · default “Discover the collection”" value={editing.tagline ?? ""} maxLength={80} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} />
            <TextAreaBox full label="Description" rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <HeroImageField value={editing.heroImageUrl} onChange={(url) => setEditing({ ...editing, heroImageUrl: url })} />
          <div className="row gap-16"><button className="btn btn--primary" onClick={save}>Save</button><button className="u-link" onClick={() => setEditing(null)}>Cancel</button></div>
        </section>
      )}
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Slug</th><th className="num">Pieces</th><th className="num">Home</th><th /></tr></thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="t-grey">/c/{c.slug}</td>
                <td className="num tnum">{c.productCount ?? c.count}</td>
                <td className="num tnum">{c.homeOrder ?? "—"}</td>
                <td className="num">
                  <button className="u-link" onClick={() => setEditing(c)}>Edit</button>{" "}
                  <button className="u-link t-grey" onClick={async () => { if (confirm(`Delete ${c.name}? Products stay.`) && (await mutate(() => adminApi.deleteCollection(c.id), "Deleted.")) !== null) setData(data.filter((x) => x.id !== c.id)); }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Discounts ---------------- */

export function DiscountsAdmin() {
  const { data, setData } = useAsync(() => adminApi.discounts(), []);
  const mutate = useMutate();
  const blank = { code: "", type: "PERCENT" as DiscountType, value: 10, maxUses: null, minSubtotalKobo: null, startsAt: null, endsAt: null };
  const [d, setD] = useState<Omit<Discount, "id">>(blank);
  // PATCH /admin/discounts/:id — the same form edits an existing code.
  const [editing, setEditing] = useState<string | null>(null);
  const startEdit = (x: Discount) => {
    setEditing(x.id);
    setD({ code: x.code, type: x.type, value: x.value, maxUses: x.maxUses ?? null, minSubtotalKobo: x.minSubtotalKobo ?? null, startsAt: x.startsAt ?? null, endsAt: x.endsAt ?? null });
  };
  const cancelEdit = () => {
    setEditing(null);
    setD(blank);
  };
  return (
    <>
      <AdminHead title="Promo codes" />
      <section className="admin-card">
        <div className="mono-label admin-card__head">{editing ? `Edit ${d.code || "code"}` : "New code"}</div>
        <form
          className="field-grid field-grid--200"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!d.code.trim()) return;
            const body = { ...d, code: d.code.trim().toUpperCase() };
            if (editing) {
              const r = await mutate(() => adminApi.updateDiscount(editing, body), "Code updated.");
              if (r && data) {
                setData(data.map((x) => (x.id === r.id ? r : x)));
                cancelEdit();
              }
              return;
            }
            const r = await mutate(() => adminApi.createDiscount(body), "Code created.");
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
          <div className="field-wrap row gap-12">
            <button className="btn btn--short">{editing ? "Save code" : "Create code"}</button>
            {editing && <button type="button" className="ap-link small-link" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </section>
      <table className="admin-table admin-table--cards">
        <thead><tr><th>Code</th><th>Type</th><th className="num">Value</th><th className="num">Min</th><th className="num">Uses</th><th>Window</th><th /></tr></thead>
        <tbody>
          {data?.map((x) => (
            <tr key={x.id}>
              <td className="mono admin-table__key">{x.code}</td>
              <td className="mono-xs" data-label="Type">{x.type.replace("_", " ")}</td>
              <td className="num tnum" data-label="Value">{x.type === "PERCENT" ? `${x.value}%` : x.type === "FIXED" ? naira(x.value) : "—"}</td>
              <td className="num tnum" data-label="Min spend">{x.minSubtotalKobo ? naira(x.minSubtotalKobo) : "—"}</td>
              <td className="num tnum" data-label="Uses">{x.uses ?? 0}{x.maxUses ? ` / ${x.maxUses}` : ""}</td>
              <td className="mono-xs" data-label="Runs">{x.startsAt ? longDate(x.startsAt) : "Now"} → {x.endsAt ? longDate(x.endsAt) : "∞"}</td>
              <td className="num">
                <div className="row gap-12">
                  <button className="ap-link small-link" onClick={() => startEdit(x)}>Edit</button>
                  <button className="ap-link small-link muted" onClick={async () => { if ((await mutate(() => adminApi.deleteDiscount(x.id), "Deleted.")) !== null) { setData(data.filter((y) => y.id !== x.id)); if (editing === x.id) cancelEdit(); } }}>Delete</button>
                </div>
              </td>
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
      <AdminHead title="Delivery zones" />
      <table className="admin-table admin-table--cards">
        <thead><tr><th>Zone</th><th>Name</th><th>Delivery time</th><th className="num">Fee ₦</th><th>Active</th><th /></tr></thead>
        <tbody>
          {data?.map((z) => {
            const d = { ...z, ...draft[z.id] };
            const upd = (p: Partial<DeliveryZone>) => setDraft({ ...draft, [z.id]: { ...draft[z.id], ...p } });
            return (
              <tr key={z.id}>
                <td className="mono-xs admin-table__key">{z.code.replace(/_/g, " ")}</td>
                <td data-label="Name"><input className="admin-input" value={d.name} onChange={(e) => upd({ name: e.target.value })} aria-label={`${z.code} name`} /></td>
                <td data-label="Delivery time"><input className="admin-input" value={d.etaText} onChange={(e) => upd({ etaText: e.target.value })} aria-label={`${z.code} ETA`} /></td>
                <td className="num" data-label="Fee ₦"><input className="admin-input admin-input--num" inputMode="numeric" value={nairaIn(d.feeKobo) || "0"} onChange={(e) => upd({ feeKobo: koboIn(e.target.value) })} aria-label={`${z.code} fee`} /></td>
                <td data-label="Active"><input type="checkbox" checked={d.active} onChange={(e) => upd({ active: e.target.checked })} aria-label={`${z.code} active`} /></td>
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

const EMPTY_PANEL: HomePanel = { images: [], title: "", linkLabel: "", href: "/" };
const HOME_PANELS: { key: keyof HomeMedia; title: string; hint: string; max: number }[] = [
  { key: "hero", title: "Opening photo", hint: "First thing visitors see, full screen, slowly zooming in and out.", max: 1 },
  { key: "slides", title: "Slideshow", hint: "Up to 6 photos, changing every 5 seconds. Shown after the introduction.", max: 6 },
  { key: "still", title: "Still photo", hint: "Shown after New In.", max: 1 },
];

/** Admin → Settings → Home page: the three full-screen photo panels (wide landscape photos, 16:9 works best). */
function HomePhotosCard({ media, onChange }: { media: HomeMedia | undefined; onChange: (m: HomeMedia) => void }) {
  const m: HomeMedia = { hero: media?.hero ?? EMPTY_PANEL, slides: media?.slides ?? EMPTY_PANEL, still: media?.still ?? EMPTY_PANEL };
  const setPanel = (key: keyof HomeMedia, p: Partial<HomePanel>) => onChange({ ...m, [key]: { ...m[key], ...p } });
  return (
    <section className="admin-card">
      <div className="mono-label admin-card__head">Home page photos</div>
      <p className="t-small t-grey">Wide photos with real surroundings, at least 1600px wide. &ldquo;On phones, keep&rdquo; picks the side of the photo that stays in view on a narrow screen. A panel with no photo is hidden.</p>
      {HOME_PANELS.map(({ key, title, hint, max }) => {
        const panel = m[key];
        const images = panel.images.length < max ? [...panel.images, null] : panel.images;
        return (
          <div key={key} className="home-photos">
            <h3 className="home-photos__title">{title}</h3>
            <p className="t-small t-grey">{hint}</p>
            <div className="field-grid field-grid--200">
              {images.map((img, i) => (
                <div key={img?.url ?? `new-${i}`} className="home-photos__item">
                  <ImageField
                    label={max > 1 ? `Photo ${i + 1}` : "Photo"}
                    empty={img ? "" : max > 1 && i > 0 ? "Add another photo" : "No photo — panel hidden"}
                    value={img?.url ?? null}
                    onChange={(url) => {
                      const next = [...panel.images];
                      if (!url) next.splice(i, 1);
                      else next[i] = { url, focus: img?.focus ?? "center" };
                      setPanel(key, { images: next });
                    }}
                  />
                  {img && (
                    <SelectBox
                      label="On phones, keep"
                      value={img.focus}
                      onChange={(e) => setPanel(key, { images: panel.images.map((x, j) => (j === i ? { ...x, focus: e.target.value as HomeImageFocus } : x)) })}
                    >
                      <option value="left">Left side</option>
                      <option value="center">Centre</option>
                      <option value="right">Right side</option>
                    </SelectBox>
                  )}
                </div>
              ))}
            </div>
            <div className="field-grid field-grid--200">
              <FieldBox label="Title on the photo" maxLength={80} value={panel.title} onChange={(e) => setPanel(key, { title: e.target.value })} />
              <FieldBox label="Link text" maxLength={60} value={panel.linkLabel} onChange={(e) => setPanel(key, { linkLabel: e.target.value })} />
              <FieldBox label="Link to · e.g. /c/women" maxLength={200} value={panel.href} onChange={(e) => setPanel(key, { href: e.target.value.trim() })} />
            </div>
          </div>
        );
      })}
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
  const welcome = s.welcomePopup ?? { enabled: true, title: "Welcome to Amerapelle", text: "", imageUrl: null };
  return (
    <>
      <AdminHead title="Settings" actions={<button className="btn btn--short" onClick={() => mutate(() => adminApi.updateSettings(s), "Settings saved.")}>Save settings</button>} />
      <div className="admin-form">
        <TotpSetupCard />
        <section className="admin-card">
          <div className="mono-label admin-card__head">Payments</div>
          <CheckRow checked={s.paystackEnabled} onChange={(v) => set("paystackEnabled", v)} id="ps" sub="Cards, transfer, USSD">Paystack</CheckRow>
          <CheckRow checked={s.bachsEnabled} onChange={(v) => set("bachsEnabled", v)} id="bx" sub="Foreign cards, crypto">Bachs</CheckRow>
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
        <HomePhotosCard media={s.homeMedia} onChange={(m) => set("homeMedia", m)} />
        <section className="admin-card">
          <div className="mono-label admin-card__head">Home · &ldquo;Amerapelle at your service&rdquo; photos</div>
          <p className="t-small t-grey">Landscape photos. A card without a photo shows text only.</p>
          <div className="field-grid field-grid--200">
            {([
              ["stylist", "Style advice on WhatsApp"],
              ["store", "Visit the store"],
              ["exchange", "Exchange, never a refund"],
            ] as const).map(([key, title]) => (
              <ImageField
                key={key}
                label={title}
                empty="No photo — icon only"
                value={s.serviceImages?.[key] ?? null}
                onChange={(url) => set("serviceImages", { stylist: null, store: null, exchange: null, ...s.serviceImages, [key]: url })}
              />
            ))}
          </div>
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Welcome pop-up</div>
          <CheckRow checked={s.welcomePopup?.enabled ?? false} onChange={(v) => set("welcomePopup", { ...welcome, enabled: v })} id="welcome-on" sub="Shown to new visitors a second after the cookie notice, until they close it. Never during checkout.">Show the welcome pop-up</CheckRow>
          <FieldBox full label="Title" maxLength={80} value={welcome.title} onChange={(e) => set("welcomePopup", { ...welcome, title: e.target.value })} />
          <TextAreaBox full label="Text" rows={3} maxLength={300} value={welcome.text} onChange={(e) => set("welcomePopup", { ...welcome, text: e.target.value })} />
          <ImageField label="Picture · landscape" empty="No picture — text and sign-up only" value={welcome.imageUrl} onChange={(url) => set("welcomePopup", { ...welcome, imageUrl: url })} allowCutout />
        </section>
        <section className="admin-card">
          <div className="mono-label admin-card__head">Top bar</div>
          <FieldBox full label="Message · empty = no top bar" maxLength={80} value={s.tickerText[0] ?? ""} onChange={(e) => set("tickerText", e.target.value ? [e.target.value] : [])} />
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
      <AdminHead title="FAQ" actions={<button className="btn btn--short" onClick={() => setEdit({ group: "Orders", question: "", answer: "" })}>Add question +</button>} />
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

const PAGE_SLUGS = ["home", "about", "delivery", "exchanges", "privacy", "terms"];

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
      <AdminHead title="Pages" actions={p && <button className="btn btn--short" onClick={async () => { const r = await mutate(() => adminApi.updatePage(slug, { title: p.title, bodyMarkdown: p.bodyMarkdown }), "Page saved."); if (r) setP(r); }}>Save page</button>} />
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
