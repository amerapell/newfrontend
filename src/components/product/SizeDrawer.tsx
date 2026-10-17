"use client";
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FieldBox } from "@/components/ui/Field";
import { catalogApi } from "@/lib/api";
import { apiMessage } from "@/lib/format";
import type { SizeGuideKind } from "@/lib/types";
import { SizeGuideTable } from "./SizeGuideModal";

export type SizeRow = { label: string; available: number; variantId: string | null };
export type SizeDrawerMode = "sizes" | "guide" | "notify";

/**
 * Size drawer (§7): "Select a size", 44px rows (size left; right blank / "Last pieces" / "Notify me" in grey
 * for sold out), "Size guide" link at the bottom opens the table inside the drawer. Picking a sold-out size
 * (or opening it for a sold-out piece) shows the notify-me form → POST /products/:slug/notify.
 */
export function SizeDrawer({
  open,
  onClose,
  mode,
  setMode,
  slug,
  sizes,
  value,
  onPick,
  guide,
  notifyVariantId,
  notifyLabel,
  lowAt = 3,
}: {
  open: boolean;
  onClose: () => void;
  mode: SizeDrawerMode;
  setMode: (m: SizeDrawerMode) => void;
  slug: string;
  sizes: SizeRow[];
  value: string | null;
  onPick: (size: string, soldOut: boolean) => void;
  guide: SizeGuideKind;
  notifyVariantId: string | null;
  notifyLabel: string;
  lowAt?: number;
}) {
  const title = mode === "guide" ? "Size guide" : mode === "notify" ? "Notify me when available" : "Select a size";
  return (
    <Drawer open={open} onClose={onClose} title={title} className="size-drawer">
      {mode === "sizes" && (
        <>
          <ul className="size-list" role="listbox" aria-label="Size">
            {sizes.map((s) => {
              const out = s.available <= 0;
              const low = !out && s.available <= lowAt;
              return (
                <li key={s.label}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === s.label}
                    className={`size-list__row${value === s.label ? " is-on" : ""}${out ? " is-out" : ""}`}
                    onClick={() => onPick(s.label, out)}
                  >
                    <span>{s.label}</span>
                    <span className="size-list__note">{out ? "Notify me" : low ? "Last pieces" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {guide !== "NONE" && (
            <button type="button" className="u-link size-drawer__guide" onClick={() => setMode("guide")}>
              Size guide
            </button>
          )}
        </>
      )}
      {mode === "guide" && (
        <>
          <SizeGuideTable kind={guide} />
          {sizes.length > 0 && (
            <button type="button" className="u-link size-drawer__guide" onClick={() => setMode("sizes")}>
              Back to sizes
            </button>
          )}
        </>
      )}
      {mode === "notify" && <NotifyForm slug={slug} variantId={notifyVariantId} label={notifyLabel} onBack={sizes.length > 1 ? () => setMode("sizes") : undefined} />}
    </Drawer>
  );
}

function NotifyForm({ slug, variantId, label, onBack }: { slug: string; variantId: string | null; label: string; onBack?: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setState("idle");
    setMsg("");
  }, [variantId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setState("err");
      setMsg("Enter a valid email address.");
      return;
    }
    setState("busy");
    try {
      await catalogApi.notifyStock(slug, email.trim(), variantId);
      setState("ok");
      setMsg(`Thank you. We'll email you as soon as ${label} is back.`);
    } catch (err) {
      setState("err");
      setMsg(apiMessage(err));
    }
  };
  if (state === "ok") {
    return (
      <div className="notify-done" role="status">
        <p>{msg}</p>
        {onBack && (
          <button type="button" className="u-link" onClick={onBack}>
            Choose another size
          </button>
        )}
      </div>
    );
  }
  return (
    <form className="notify-form" onSubmit={submit} noValidate>
      <p>{label} is sold out. Leave your email and we&apos;ll let you know the moment it&apos;s back.</p>
      <FieldBox label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={state === "err" ? msg : null} data-autofocus />
      <button type="submit" className="btn btn--primary btn--block" disabled={state === "busy" || !variantId}>
        {state === "busy" ? "Sending…" : "Notify me"}
      </button>
      {onBack && (
        <button type="button" className="u-link" onClick={onBack}>
          Choose another size
        </button>
      )}
    </form>
  );
}
