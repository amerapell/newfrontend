"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type Toast = { id: number; message: string; action?: { label: string; href?: string; onClick?: () => void }; tone?: "default" | "error" };

type ToastValue = { show: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void };
const Ctx = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ap-toast${t.tone === "error" ? " toast--error" : ""}`}>
            <span>{t.message}</span>
            {t.action &&
              (t.action.href ? (
                <Link href={t.action.href} className="toast__action" onClick={() => dismiss(t.id)}>
                  {t.action.label}
                </Link>
              ) : (
                <button type="button" className="toast__action" onClick={() => { t.action?.onClick?.(); dismiss(t.id); }}>
                  {t.action.label}
                </button>
              ))}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}
