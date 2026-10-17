"use client";
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Common = { label: string; error?: string | null; full?: boolean; hint?: ReactNode; className?: string };

/**
 * Labels used to be set in mono caps ("PHONE · OPTIONAL"). v3 is sentence case, so all-caps
 * labels are converted ("Phone · optional"); mixed-case labels are left exactly as written.
 */
export function sentenceLabel(label: string) {
  if (!/[A-Z]/.test(label) || label !== label.toUpperCase()) return label;
  // Keep known acronyms in capitals (LGA, ID, UK, US, EU, OTP).
  const KEEP = new Set(["lga", "id", "uk", "us", "eu", "otp", "fct"]);
  const lower = label.toLowerCase().replace(/\b[a-z]+\b/g, (w) => (KEEP.has(w) ? w.toUpperCase() : w));
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Design v3 §6 input: 48px box, 1px --rule border (ink on focus), floating label — sits inside as the
 * placeholder (grey 14px) and shrinks to 11px at the top-left once focused or filled. Password fields keep
 * the eye toggle. A real `placeholder` keeps the label floated.
 */
export const FieldBox = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(function FieldBox(
  { label, error, full, hint, className = "", id, type, placeholder, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={`field-wrap ${full ? "field-wrap--full" : ""} ${className}`}>
      <div className={`field${error ? " field--error" : ""}${isPassword ? " field--password" : ""}${placeholder ? " field--float" : ""}`}>
        <label className="field__label" htmlFor={fid}>{sentenceLabel(label)}</label>
        <div className="field__control">
          <input ref={ref} id={fid} type={isPassword && visible ? "text" : type} placeholder={placeholder || " "} aria-invalid={!!error} aria-describedby={describedBy} {...rest} />
          {isPassword && (
            <button
              type="button"
              className="field__toggle"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              aria-controls={fid}
            >
              {visible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>
      </div>
      {error && <span id={`${fid}-err`} className="field__error" role="alert">{error}</span>}
      {!error && hint && <span id={`${fid}-hint`} className="field__hint">{hint}</span>}
    </div>
  );
});

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M2 12s3.6-7 10-7c2 0 3.8.7 5.2 1.6M22 12s-3.6 7-10 7c-2 0-3.8-.7-5.2-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function SelectBox({ label, error, full, hint, className = "", id, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={`field-wrap ${full ? "field-wrap--full" : ""} ${className}`}>
      <div className={`field field--select field--float${error ? " field--error" : ""}`}>
        <label className="field__label" htmlFor={fid}>{sentenceLabel(label)}</label>
        <div className="field__control">
          <select id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} {...rest}>
            {children}
          </select>
        </div>
      </div>
      {error && <span id={`${fid}-err`} className="field__error" role="alert">{error}</span>}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function TextAreaBox({ label, error, full, hint, className = "", id, placeholder, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={`field-wrap ${full ? "field-wrap--full" : ""} ${className}`}>
      <div className={`field field--area${error ? " field--error" : ""}${placeholder ? " field--float" : ""}`}>
        <label className="field__label" htmlFor={fid}>{sentenceLabel(label)}</label>
        <div className="field__control">
          <textarea id={fid} placeholder={placeholder || " "} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} {...rest} />
        </div>
      </div>
      {error && <span id={`${fid}-err`} className="field__error" role="alert">{error}</span>}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

/** 14px square checkbox, 1px ink box, filled ink when checked (§6). */
export function CheckRow({ checked, onChange, children, sub, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; sub?: ReactNode; id?: string }) {
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__box" aria-hidden />
      <span className="check__label">
        <span>{children}</span>
        {sub && <span className="check__sub">{typeof sub === "string" ? sentenceLabel(sub) : sub}</span>}
      </span>
    </label>
  );
}
