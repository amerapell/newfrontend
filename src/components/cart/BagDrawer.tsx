"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";
import { naira, plural } from "@/lib/format";
import { BagLine } from "./BagLine";
import { FreeDeliveryBar } from "./FreeDeliveryBar";

/** Bag drawer (§7): opens on add-to-bag and from the header bag icon. */
export function BagDrawer() {
  const { cart, drawerOpen, setDrawerOpen, update, remove, lastAdded, busy } = useCart();
  const { settings } = useSettings();
  const pathname = usePathname();
  const close = () => setDrawerOpen(false);
  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen]);

  const lines = cart?.lines ?? [];
  const n = cart?.itemCount ?? 0;
  const subtotal = (cart?.subtotalKobo ?? 0) - (cart?.discountKobo ?? 0);
  const threshold = cart?.freeDeliveryThresholdKobo ?? settings.freeDeliveryThresholdKobo;
  const blocked = lines.some((l) => l.problem === "SOLD_OUT");

  const footer = lines.length ? (
    <div className="cm-drawer-foot">
      <div className="cm-row">
        <span>Subtotal</span>
        <span className="tnum">{naira(subtotal)}</span>
      </div>
      <FreeDeliveryBar subtotalKobo={subtotal} thresholdKobo={threshold} />
      {blocked && <p className="cm-alert" role="alert">Remove sold-out pieces to check out.</p>}
      <Link href="/checkout" className="btn btn--primary btn--block" aria-disabled={blocked || undefined} onClick={(e) => blocked && e.preventDefault()}>
        Checkout
      </Link>
      <Link href="/bag" className="u-link cm-drawer-foot__view">View bag</Link>
    </div>
  ) : null;

  return (
    <Drawer open={drawerOpen} onClose={close} title="Your bag" meta={n ? plural(n, "item", "items") : undefined} footer={footer} className="bag-drawer">
      <p className="sr-only" aria-live="polite">{drawerOpen && lastAdded ? `${lastAdded.name} added to your bag.` : ""}</p>
      {lines.length ? (
        <ul className="cm-lines">
          {lines.map((l) => (
            <BagLine key={l.id} line={l} busy={busy} onQty={(q) => update(l.id, { quantity: q })} onRemove={() => remove(l.id)} />
          ))}
        </ul>
      ) : (
        <div className="cm-empty">
          <p>Your bag is empty.</p>
          <Link href="/c/new-in" className="u-link" onClick={close}>Continue shopping</Link>
        </div>
      )}
    </Drawer>
  );
}
