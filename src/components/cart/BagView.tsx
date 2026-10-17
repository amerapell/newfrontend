"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { loadProduct } from "@/components/product/quickAddCache";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { useWishlist } from "@/context/WishlistContext";
import { naira, plural } from "@/lib/format";
import type { CartLine, Product, ProductCard } from "@/lib/types";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { BagLine } from "./BagLine";
import { CreditToggle, useCreditSource } from "./CreditToggle";
import { PromoForm } from "./PromoForm";

/** Change colour / size of a line in place (underline selects). */
function VariantEditor({ line, onDone }: { line: CartLine; onDone: () => void }) {
  const { update, busy } = useCart();
  const id = useId();
  const [p, setP] = useState<Product | null>(null);
  const [colour, setColour] = useState(line.colour);
  const [size, setSize] = useState(line.size);
  useEffect(() => {
    loadProduct(line.productSlug).then(setP).catch(() => onDone());
  }, [line.productSlug, onDone]);
  if (!p) return <p className="cm-soft" aria-busy="true">Loading options…</p>;
  const pick = p.variants.find((v) => v.colour === colour && v.size === size);
  return (
    <div className="cm-variant">
      {p.options.colours.length > 1 && (
        <div className="cm-select">
          <label htmlFor={`${id}-c`} className="cm-label">Colour</label>
          <select id={`${id}-c`} value={colour ?? ""} onChange={(e) => setColour(e.target.value)}>
            {p.options.colours.map((c) => (
              <option key={c.name} value={c.name} disabled={!p.variants.some((v) => v.colour === c.name && v.available > 0)}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      {p.options.sizes.length > 0 && (
        <div className="cm-select">
          <label htmlFor={`${id}-s`} className="cm-label">Size</label>
          <select id={`${id}-s`} value={size ?? ""} onChange={(e) => setSize(e.target.value)}>
            {p.options.sizes.map((s) => {
              const v = p.variants.find((x) => x.colour === colour && x.size === s);
              return <option key={s} value={s} disabled={!v || v.available <= 0}>{s}{!v || v.available <= 0 ? " — sold out" : ""}</option>;
            })}
          </select>
        </div>
      )}
      <div className="cm-variant__actions">
        <button
          type="button"
          className="u-link"
          disabled={busy || !pick || pick.available <= 0}
          onClick={async () => {
            if (pick && pick.id !== line.variantId) await update(line.id, { variantId: pick.id });
            onDone();
          }}
        >
          Update
        </button>
        <button type="button" className="u-link cm-soft" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

export function BagView({ alsoLike = [] }: { alsoLike?: ProductCard[] }) {
  const { cart, ready, update, remove, busy, useCredit, setUseCredit } = useCart();
  const { user, status } = useAuth();
  const { settings } = useSettings();
  const { toggle, has } = useWishlist();
  const toast = useToast();
  const source = useCreditSource();
  const [editing, setEditing] = useState<string | null>(null);
  const lines = cart?.lines ?? [];
  const n = cart?.itemCount ?? 0;
  const credit = user?.creditBalanceKobo ?? 0;
  const afterDisc = (cart?.subtotalKobo ?? 0) - (cart?.discountKobo ?? 0);
  const applied = useCredit && credit > 0 ? Math.min(credit, afterDisc) : 0;
  const total = Math.max(0, afterDisc - applied);
  const soldOut = lines.filter((l) => l.problem === "SOLD_OUT");
  const threshold = cart?.freeDeliveryThresholdKobo ?? settings.freeDeliveryThresholdKobo;
  const blocked = !lines.length || soldOut.length > 0;

  const saveForLater = async (l: CartLine) => {
    if (status !== "authed") {
      toast.show({ message: "Sign in to save pieces for later.", action: { label: "Sign in", href: "/account?next=/bag" } });
      return;
    }
    const pid = (await loadProduct(l.productSlug).catch(() => null))?.id;
    if (pid && !has(pid)) await toggle({ id: pid, name: l.name });
    await remove(l.id);
  };

  return (
    <>
      <div className="cm cm-page">
        <header className="cm-head cm-head--row">
          <h1 className="cm-title">
            Your bag{ready && lines.length > 0 && <span className="cm-title__meta">{plural(n, "item", "items")}</span>}
          </h1>
          {threshold ? (
            <Link href="/policies/delivery" className="u-link">Free delivery over {naira(threshold)}</Link>
          ) : null}
        </header>

        {ready && !lines.length ? (
          <div className="cm-empty">
            <p>Your bag is empty.</p>
            <Link href="/c/new-in" className="u-link">Continue shopping</Link>
          </div>
        ) : (
          <div className="cm-split">
            <section className="cm-split__main" aria-label="Items">
              {soldOut.length > 0 && (
                <p className="cm-alert cm-note" role="alert">
                  {soldOut.length === 1 ? `${soldOut[0].name} has sold out.` : `${soldOut.length} pieces have sold out.`} Remove {soldOut.length === 1 ? "it" : "them"} to continue to checkout.
                </p>
              )}
              {!ready && <p className="cm-soft" aria-busy="true">Loading your bag…</p>}
              <ul className="cm-lines">
                {lines.map((l) => (
                  <BagLine
                    key={l.id}
                    line={l}
                    large
                    busy={busy}
                    onQty={(q) => update(l.id, { quantity: q })}
                    onRemove={() => remove(l.id)}
                    editor={editing === l.id ? <VariantEditor line={l} onDone={() => setEditing(null)} /> : undefined}
                    actions={
                      <>
                        {(l.colour || l.size) && l.problem !== "SOLD_OUT" && (
                          <button type="button" className="u-link" onClick={() => setEditing(l.id)}>
                            Change<span className="sr-only"> colour or size of {l.name}</span>
                          </button>
                        )}
                        <button type="button" className="u-link hide-mobile" onClick={() => saveForLater(l)}>
                          Save for later<span className="sr-only">: {l.name}</span>
                        </button>
                      </>
                    }
                  />
                ))}
              </ul>
            </section>

            <aside className="cm-split__aside cm-summary" aria-label="Summary">
              <div className="cm-rows">
                <div className="cm-row"><span>Subtotal</span><span className="tnum">{naira(cart?.subtotalKobo ?? 0)}</span></div>
                {!!cart?.discountKobo && <div className="cm-row"><span>Promo code {cart.promoCode}</span><span className="tnum">−{naira(cart.discountKobo)}</span></div>}
                <div className="cm-row"><span>Delivery</span><span className="cm-soft">Calculated at checkout</span></div>
                {applied > 0 && <div className="cm-row"><span>Exchange credit</span><span className="tnum">−{naira(applied)}</span></div>}
              </div>
              <PromoForm />
              {credit > 0 && <CreditToggle amountKobo={Math.min(credit, afterDisc || credit)} on={useCredit} onChange={setUseCredit} source={source} />}
              <div className="cm-row cm-row--total"><span>Total</span><span className="tnum">{naira(total)}</span></div>
              <Link href="/checkout" className="btn btn--primary btn--block" aria-disabled={blocked || undefined} onClick={(e) => blocked && e.preventDefault()}>
                Checkout
              </Link>
              <p className="cm-small cm-soft">
                Exchange only — no refunds. <Link href="/policies/exchanges" className="u-link">Exchange policy</Link>
              </p>
              {status === "guest" && (
                <p className="cm-small cm-soft">
                  Have exchange credit? <Link href="/account?next=/bag" className="u-link">Sign in</Link> to use it.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
      <ProductCarousel title="You may also like" products={alsoLike} />
    </>
  );
}
