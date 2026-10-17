"use client";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { ChevronDown } from "@/components/chrome/Icons";
import { ProductImage } from "@/components/product/ProductImage";
import { naira } from "@/lib/format";
import { fabricOf, iconKind } from "@/lib/product";
import type { CartLine } from "@/lib/types";

/** "Qty: 1 ⌄" — native select, plain text look. */
export function QtySelect({ value, max, onChange, disabled, label }: { value: number; max: number; onChange: (n: number) => void; disabled?: boolean; label: string }) {
  const id = useId();
  const top = Math.max(value, Math.min(10, Math.max(1, max)));
  return (
    <span className="qty-select">
      <label htmlFor={id}>Qty:</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-label={`Quantity, ${label}`}>
        {Array.from({ length: top }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <ChevronDown aria-hidden />
    </span>
  );
}

/**
 * One bag line (§7 Bag): 80px 4:5 thumb; name / material (grey) / "Colour: …" / "Size: …"; bottom row
 * "Remove" · "Qty: 1 ⌄" · price right. `actions` adds more text buttons (Change, Save for later).
 */
export function BagLine({ line, busy, onQty, onRemove, actions, editor, large }: { line: CartLine; busy?: boolean; onQty: (q: number) => void; onRemove: () => void; actions?: ReactNode; editor?: ReactNode; large?: boolean }) {
  const out = line.problem === "SOLD_OUT";
  return (
    <li className={`cm-line${large ? " cm-line--lg" : ""}${out ? " is-out" : ""}`}>
      <Link href={`/p/${line.productSlug}`} className="cm-line__img" tabIndex={-1} aria-hidden>
        <ProductImage src={line.imageUrl} alt="" kind={iconKind({ material: line.material, name: line.name })} iconSize={20} sizes={large ? "120px" : "80px"} />
      </Link>
      <div className="cm-line__body">
        <div className="cm-line__info">
          <Link href={`/p/${line.productSlug}`} className="cm-line__name">{line.name}</Link>
          {line.material && <span className="cm-soft">{fabricOf(line.material)}</span>}
          {line.colour && <span>Colour: {line.colour}</span>}
          {line.size && <span>Size: {line.size}</span>}
          {out && <span className="cm-alert">Sold out — remove it to continue.</span>}
          {line.problem === "LOW_STOCK" && <span className="cm-alert">Only {line.available} left — quantity reduced at checkout.</span>}
        </div>
        {editor ?? (
          <div className="cm-line__actions">
            <button type="button" className="u-link" onClick={onRemove}>
              Remove<span className="sr-only"> {line.name}</span>
            </button>
            {actions}
            <QtySelect label={line.name} value={line.quantity} max={line.available} disabled={busy || out} onChange={onQty} />
            <span className="cm-line__price tnum">{naira(line.lineKobo)}</span>
          </div>
        )}
      </div>
    </li>
  );
}
