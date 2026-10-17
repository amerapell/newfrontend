"use client";
import type { ReactNode } from "react";

/** Radio row (delivery method, payment provider, reasons): 16px ring, title + 12px soft meta, right-aligned aside, hairline below. */
export function RadioRow({ name, value, checked, onChange, title, meta, aside, disabled }: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={`radio-row${checked ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}>
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} />
      <span className="radio-row__ring" aria-hidden><span /></span>
      <span className="radio-row__text">
        <span className="radio-row__title">{title}</span>
        {meta && <span className="radio-row__meta">{meta}</span>}
      </span>
      {aside != null && <span className="radio-row__aside tnum">{aside}</span>}
    </label>
  );
}
