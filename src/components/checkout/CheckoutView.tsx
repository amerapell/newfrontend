"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check } from "@/components/cart/Check";
import { CreditToggle, useCreditSource } from "@/components/cart/CreditToggle";
import { FieldBox, SelectBox, TextAreaBox } from "@/components/ui/Field";
import { RadioRow } from "@/components/ui/RadioRow";
import { ProductImage } from "@/components/product/ProductImage";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { accountApi, checkoutApi } from "@/lib/api";
import { apiMessage, arrivalFromEta, localPhoneDisplay, naira, toE164NG } from "@/lib/format";
import { useNgStates } from "@/lib/useNgStates";
import { iconKind } from "@/lib/product";
import type { Address, CheckoutQuote, DeliveryZone, PaymentProviderCode, ZoneCode } from "@/lib/types";

const PROVIDERS: { code: PaymentProviderCode; name: string; desc: string }[] = [
  { code: "PAYSTACK", name: "Paystack", desc: "Cards, transfer, USSD in naira" },
  { code: "BACHS", name: "Bachs", desc: "International cards, transfer, USDT/USDC" },
];

type Errors = Partial<Record<"email" | "phone" | "fullName" | "state" | "lga" | "area" | "street" | "landmark" | "provider" | "zone", string>>;

const emptyAddress: Address = { fullName: "", phone: "", state: "Lagos", lga: "", area: "", street: "", landmark: "", note: "" };

function Section({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
  return (
    <section className="cm-co__section" aria-labelledby={id}>
      <h2 id={id} className="cm-co__h">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

/** Guest vs returning customer, inline at the top of checkout (§7 Checkout). */
function CheckoutLogin({ onGuest }: { onGuest: (email: string) => void }) {
  const { login } = useAuth();
  const [mode, setMode] = useState<"guest" | "signin">("guest");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="cm-co__login" aria-label="Guest checkout or sign in">
      <div className="cm-co__modes" role="radiogroup" aria-label="How would you like to check out?">
        <RadioRow name="co-mode" value="guest" checked={mode === "guest"} onChange={() => setMode("guest")} title="Checkout as guest" meta="You can create an account after your order." />
        <RadioRow name="co-mode" value="signin" checked={mode === "signin"} onChange={() => setMode("signin")} title="Sign in" meta="For saved addresses and exchange credit." />
      </div>
      {mode === "signin" && (
        <div className="cm-form">
          <FieldBox label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FieldBox label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="cm-error" role="alert">{err}</p>}
          <button
            type="button"
            className="btn btn--secondary btn--block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await login(email.trim(), password);
                onGuest(email.trim());
              } catch (x) {
                setErr(apiMessage(x, "That email and password don't match."));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <Link href="/account?view=forgot" className="u-link cm-small">Forgot password?</Link>
        </div>
      )}
    </section>
  );
}

export function CheckoutView({ zones, cancelledRef = null }: { zones: DeliveryZone[]; cancelledRef?: string | null }) {
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  useEffect(() => {
    if (!cancelledRef) return;
    let alive = true;
    checkoutApi
      .cancel(cancelledRef)
      .then(({ order }) => {
        if (!alive) return;
        // The provider may have taken the money just before the customer pressed cancel.
        if (order.status !== "CANCELLED" && order.status !== "PENDING_PAYMENT") {
          window.location.replace(`/checkout/complete?reference=${encodeURIComponent(cancelledRef)}`);
          return;
        }
        setCancelNote(`Payment cancelled — nothing was charged for order ${order.number}. Your bag is saved, so you can try again.`);
      })
      .catch(() => alive && setCancelNote("Payment cancelled. Your bag is saved, so you can try again."));
    window.history.replaceState(null, "", "/checkout");
    return () => {
      alive = false;
    };
  }, [cancelledRef]);
  const router = useRouter();
  const { settings } = useSettings();
  const { user, status } = useAuth();
  const { cart, ready, useCredit, setUseCredit } = useCart();
  const source = useCreditSource();
  const enabled = PROVIDERS.filter((p) => (p.code === "PAYSTACK" ? settings.paystackEnabled : settings.bachsEnabled));

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState<ZoneCode | null>(null);
  const [addr, setAddr] = useState<Address>(emptyAddress);
  const [saved, setSaved] = useState<Address[]>([]);
  const [savedId, setSavedId] = useState<string | "new">("new");
  const [saveAddress, setSaveAddress] = useState(true);
  const [provider, setProvider] = useState<PaymentProviderCode | null>(enabled[0]?.code ?? null);
  const [consent, setConsent] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // default zone: Lekki–Ajah if present, else first
  useEffect(() => {
    if (zone || !zones.length) return;
    setZone((zones.find((z) => z.code === "LEKKI_AJAH") ?? zones[0]).code);
  }, [zones, zone]);

  // prefill for signed-in customers + saved addresses (CHK-3)
  useEffect(() => {
    if (status !== "authed" || !user) return;
    setEmail((e) => e || user.email);
    setPhone((p) => p || localPhoneDisplay(user.phone));
    accountApi
      .addresses()
      .then((list) => {
        setSaved(list);
        if (list[0]?.id) {
          setSavedId(list[0].id);
          setAddr({ ...emptyAddress, ...list[0] });
        }
      })
      .catch(() => {});
  }, [status, user]);

  const chosenZone = zones.find((z) => z.code === zone);
  const pickup = zone === "PICKUP";
  const lines = cart?.lines ?? [];

  // live quote (delivery fee, credit, problems)
  useEffect(() => {
    if (!zone || !lines.length) return;
    let alive = true;
    checkoutApi
      .quote(zone, useCredit)
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, useCredit, cart?.subtotalKobo, cart?.discountKobo, cart?.itemCount, status]);

  const ng = useNgStates();
  const lgas = useMemo(() => ng.lgasFor(addr.state), [ng, addr.state]);
  const set = (k: keyof Address, v: string) => {
    setAddr((a) => ({ ...a, [k]: v, ...(k === "state" ? { lga: "" } : {}) }));
    setSavedId("new");
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email address.";
    if (!toE164NG(phone)) e.phone = "Enter a Nigerian number, e.g. 0803 000 0000 or +234 803 000 0000.";
    if (!zone) e.zone = "Choose a delivery method.";
    if (!pickup) {
      if (!addr.fullName.trim()) e.fullName = "Enter the recipient's full name.";
      if (!addr.state) e.state = "Choose a state.";
      if (!addr.lga) e.lga = "Choose an LGA.";
      if (!addr.area.trim()) e.area = "Enter the city or area.";
      if (!addr.street.trim()) e.street = "Enter the street address.";
      if (!addr.landmark.trim()) e.landmark = "A nearby landmark helps the rider find you.";
    }
    if (!provider && (quote?.amountDueKobo ?? 1) > 0) e.provider = "Choose how you'd like to pay.";
    return e;
  };

  const problems = quote?.problems ?? lines.filter((l) => l.problem);
  const blocked = problems.some((p) => p.problem === "SOLD_OUT");
  const sub = quote?.subtotalKobo ?? cart?.subtotalKobo ?? 0;
  const discount = quote?.discountKobo ?? cart?.discountKobo ?? 0;
  const delivery = quote?.deliveryKobo ?? chosenZone?.feeKobo ?? 0;
  const creditAvail = quote?.creditAvailableKobo ?? user?.creditBalanceKobo ?? 0;
  const creditApplied = quote?.creditAppliedKobo ?? 0;
  const due = quote?.amountDueKobo ?? Math.max(0, sub - discount + delivery);
  const creditOnly = due === 0 && lines.length > 0;
  const payLabel = submitting ? "Opening secure payment…" : creditOnly ? "Place order — paid with credit" : `Pay ${naira(due)}`;
  const n = cart?.itemCount ?? 0;
  const arrival = chosenZone && !pickup ? arrivalFromEta(chosenZone.etaText) : null;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (blocked) {
      setFormError("Some pieces in your bag have sold out. Remove them from your bag to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const e164 = toE164NG(phone)!;
      const address: Address | null = pickup
        ? null
        : { ...addr, phone: toE164NG(addr.phone || phone) ?? e164, note: addr.note?.trim() || null, id: savedId !== "new" ? savedId : undefined };
      const res = await checkoutApi.create({
        email: email.trim(),
        phone: e164,
        zoneCode: zone!,
        address,
        provider: provider ?? "PAYSTACK",
        useCredit: useCredit && creditAvail > 0,
        marketingConsent: consent,
        saveAddress: status === "authed" && !pickup && savedId === "new" ? saveAddress : undefined,
      });
      if (res.payment.authorizationUrl) {
        // hosted page (Paystack / Bachs); confirmation happens on /checkout/complete via server verification
        window.location.assign(res.payment.authorizationUrl);
      } else {
        router.push(`/checkout/complete?reference=${encodeURIComponent(res.payment.reference)}`);
      }
    } catch (err) {
      setFormError(apiMessage(err, "We couldn't start your payment. Please try again."));
      setSubmitting(false);
    }
  };

  if (ready && !lines.length && !submitting) {
    return (
      <div className="cm cm-page">
        <h1 className="cm-title">Checkout</h1>
        <div className="cm-empty">
          <p>Your bag is empty.</p>
          <Link href="/c/new-in" className="u-link">Continue shopping</Link>
        </div>
      </div>
    );
  }

  const summary = (
    <>
      <ul className="cm-sumlines">
        {lines.map((l) => (
          <li key={l.id} className="cm-sumline">
            <span className="cm-sumline__img">
              <ProductImage src={l.imageUrl} alt="" kind={iconKind({ material: l.material, name: l.name })} iconSize={20} sizes="56px" />
              {l.quantity > 1 && <span className="cm-sumline__qty" aria-label={`Quantity ${l.quantity}`}>{l.quantity}</span>}
            </span>
            <span className="cm-sumline__info">
              <span>{l.name}</span>
              <span className="cm-soft">{[l.colour, l.size].filter(Boolean).join(" / ")}{l.quantity > 1 ? ` · Qty ${l.quantity}` : ""}</span>
              {l.problem && <span className="cm-alert">{l.problem === "SOLD_OUT" ? "Sold out" : `Only ${l.available} left`}</span>}
            </span>
            <span className="tnum">{naira(l.lineKobo)}</span>
          </li>
        ))}
      </ul>
      {problems.length > 0 && (
        <p className="cm-alert" role="alert">
          {blocked ? "Some pieces sold out while you were shopping." : "Stock changed on some pieces."} <Link href="/bag" className="u-link">Review your bag</Link>
        </p>
      )}
      <div className="cm-rows">
        <div className="cm-row"><span>Subtotal</span><span className="tnum">{naira(sub)}</span></div>
        {discount > 0 && <div className="cm-row"><span>Promo code {cart?.promoCode}</span><span className="tnum">−{naira(discount)}</span></div>}
        <div className="cm-row">
          <span>Delivery{chosenZone ? ` · ${chosenZone.name}` : ""}</span>
          <span className="tnum">{zone ? (delivery ? naira(delivery) : "Free") : "—"}</span>
        </div>
        {creditApplied > 0 && useCredit && <div className="cm-row"><span>Exchange credit</span><span className="tnum">−{naira(creditApplied)}</span></div>}
        <div className="cm-row cm-row--total"><span>Total</span><span className="tnum">{naira(due)}</span></div>
        {arrival && <p className="cm-small cm-soft">Arrives {arrival}</p>}
      </div>
    </>
  );

  return (
    <form ref={formRef} className="cm cm-co" onSubmit={submit} noValidate>

      <aside className={`cm-co__summary${summaryOpen ? " is-open" : ""}`} aria-label="Order summary">
        <button type="button" className="cm-co__sumbar" aria-expanded={summaryOpen} aria-controls="co-summary" onClick={() => setSummaryOpen((v) => !v)}>
          <span>{summaryOpen ? "Hide" : "Show"} order summary <span className="cm-chev" aria-hidden>⌄</span></span>
          <span className="tnum">{naira(due)}</span>
        </button>
        <div id="co-summary" className="cm-co__sumbody">
          <h2 className="cm-co__sumtitle">Order summary <span className="cm-soft">({n} {n === 1 ? "item" : "items"})</span></h2>
          {summary}
        </div>
      </aside>

      <div className="cm-co__main">
        <h1 className="cm-title">Checkout</h1>
        {cancelNote && <p className="cm-alert" role="status">{cancelNote}</p>}
        {status === "guest" && <CheckoutLogin onGuest={(e) => setEmail((x) => x || e)} />}
        <Section n={1} id="co-contact" title="Contact">
          <div className="cm-fields">
            <FieldBox label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} error={errors.email} required />
            <FieldBox label="Phone (+234)" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="803 000 0000" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: undefined })); }} error={errors.phone} required />
          </div>
          <Check id="consent" checked={consent} onChange={setConsent}>
            Email me about new pieces
          </Check>
        </Section>

        <Section n={2} id="co-delivery" title="Delivery">
          <div role="radiogroup" aria-labelledby="co-delivery" aria-invalid={!!errors.zone} aria-describedby={errors.zone ? "co-zone-err" : undefined} className="cm-radios">
            {zones.map((z) => (
              <RadioRow
                key={z.id}
                name="zone"
                value={z.code}
                checked={zone === z.code}
                onChange={(v) => { setZone(v as ZoneCode); setErrors((x) => ({ ...x, zone: undefined })); }}
                title={z.name}
                meta={z.code === "PICKUP" ? settings.pickupAddress || undefined : undefined}
                aside={
                  <>
                    <span>{z.feeKobo ? naira(z.feeKobo) : "Free"}</span>
                    <span className="cm-soft">{z.etaText}</span>
                  </>
                }
              />
            ))}
          </div>
          {errors.zone && <span id="co-zone-err" className="cm-error" role="alert">{errors.zone}</span>}
          {!zones.length && <p className="cm-error">Delivery options are unavailable right now. Please refresh.</p>}

          {!pickup && (
            <div className="cm-co__address">
              <h3 className="cm-co__h3" id="co-address">Delivery address</h3>
              {saved.length > 0 && (
                <div role="radiogroup" aria-label="Saved addresses" className="cm-radios">
                  {saved.map((a) => (
                    <RadioRow
                      key={a.id}
                      name="saved-address"
                      value={a.id!}
                      checked={savedId === a.id}
                      onChange={() => { setSavedId(a.id!); setAddr({ ...emptyAddress, ...a }); setErrors({}); }}
                      title={`${a.fullName} — ${a.street}, ${a.area}`}
                      meta={`${a.lga}, ${a.state}`}
                    />
                  ))}
                  <RadioRow name="saved-address" value="new" checked={savedId === "new"} onChange={() => { setSavedId("new"); setAddr({ ...emptyAddress, fullName: addr.fullName }); }} title="Use a new address" />
                </div>
              )}
              <div className="cm-fields">
                <FieldBox full label="Full name" autoComplete="name" value={addr.fullName} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} />
                <SelectBox label="State" autoComplete="address-level1" value={addr.state} onChange={(e) => set("state", e.target.value)} error={errors.state}>
                  {ng.names.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </SelectBox>
                <SelectBox label="LGA" value={addr.lga} onChange={(e) => set("lga", e.target.value)} error={errors.lga}>
                  <option value="">Choose an LGA</option>
                  {lgas.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </SelectBox>
                <FieldBox full label="City / area" autoComplete="address-level2" value={addr.area} onChange={(e) => set("area", e.target.value)} error={errors.area} placeholder="Lekki Phase 1" />
                <FieldBox full label="Street address" autoComplete="street-address" value={addr.street} onChange={(e) => set("street", e.target.value)} error={errors.street} />
                <FieldBox full label="Nearest landmark" value={addr.landmark} onChange={(e) => set("landmark", e.target.value)} error={errors.landmark} placeholder="Opposite the filling station" hint="Helps the rider find you." />
                <TextAreaBox full label="Delivery note (optional)" rows={2} value={addr.note ?? ""} onChange={(e) => set("note", e.target.value)} placeholder="Gate code, best time to call…" />
              </div>
              {status === "authed" && savedId === "new" && (
                <Check id="save-addr" checked={saveAddress} onChange={setSaveAddress}>Save this address to my account</Check>
              )}
            </div>
          )}
        </Section>

        <Section n={3} id="co-pay" title="Payment">
          {enabled.length ? (
            <div className="cm-radios" role="radiogroup" aria-labelledby="co-pay" aria-describedby={errors.provider ? "co-pay-err" : undefined}>
              {enabled.map((p) => (
                <RadioRow
                  key={p.code}
                  name="provider"
                  value={p.code}
                  checked={provider === p.code}
                  onChange={() => { setProvider(p.code); setErrors((x) => ({ ...x, provider: undefined })); }}
                  title={p.name}
                  meta={p.desc}
                />
              ))}
            </div>
          ) : (
            <p className="cm-error">Online payment is paused right now. Message us on WhatsApp to order.</p>
          )}
          {errors.provider && <span id="co-pay-err" className="cm-error" role="alert">{errors.provider}</span>}
          {creditAvail > 0 && (
            <CreditToggle amountKobo={useCredit && creditApplied ? creditApplied : Math.min(creditAvail, sub - discount + delivery)} on={useCredit} onChange={setUseCredit} source={source} />
          )}
        </Section>

        <Section n={4} id="co-review" title="Review">
          {formError && <p className="cm-error" role="alert">{formError}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting || !lines.length || blocked || (!enabled.length && due > 0)}>
            {payLabel}
          </button>
          {creditOnly && <p className="cm-small cm-soft">Your exchange credit covers this order — no payment needed.</p>}
          <p className="cm-small cm-soft">
            Exchange within {settings.exchangeWindowDays} days, no refunds. <Link href="/policies/exchanges" className="u-link">Exchange policy</Link>
          </p>
        </Section>
      </div>
    </form>
  );
}
