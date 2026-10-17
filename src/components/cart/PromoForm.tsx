"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { apiMessage, naira } from "@/lib/format";

/** Promo code: underline field + "Apply" text button; applied code shows with a Remove link. */
export function PromoForm() {
  const { cart, applyPromo, removePromo, busy } = useCart();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (cart?.promoCode) {
    return (
      <div className="cm-row">
        <span>
          Promo code {cart.promoCode}
          {cart.discountKobo > 0 && <span className="cm-soft"> (−{naira(cart.discountKobo)})</span>}
        </span>
        <button type="button" className="cm-textbtn" onClick={() => removePromo()} disabled={busy}>Remove</button>
      </div>
    );
  }
  return (
    <form
      className="cm-promo"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setErr(null);
        try {
          await applyPromo(code.trim().toUpperCase());
          setCode("");
        } catch (x) {
          setErr(apiMessage(x, "That code isn't valid."));
        }
      }}
    >
      <div className="cm-inline">
        <label htmlFor="promo" className="sr-only">Promo code</label>
        <input id="promo" type="text" placeholder="Promo code" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "promo-err" : undefined} />
        <button type="submit" className="cm-textbtn" disabled={busy}>Apply</button>
      </div>
      {err && <span id="promo-err" className="cm-error" role="alert">{err}</span>}
    </form>
  );
}
