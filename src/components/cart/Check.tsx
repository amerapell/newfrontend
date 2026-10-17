"use client";
import type { ReactNode } from "react";

/** 16px square checkbox (1px ink border, ink tick) with a 14px label and optional 12px helper line. */
export function Check({ id, checked, onChange, children, sub, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode; sub?: ReactNode; disabled?: boolean }) {
  return (
    <label className="cm-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-describedby={sub ? `${id}-sub` : undefined} />
      <span className="cm-check__box" aria-hidden />
      <span className="cm-check__text">
        <span>{children}</span>
        {sub && <span id={`${id}-sub`} className="cm-small cm-soft">{sub}</span>}
      </span>
    </label>
  );
}
