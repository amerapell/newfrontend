"use client";
import type { ReactNode } from "react";
import { Drawer } from "./Drawer";

/**
 * v3 has no centred modals: every secondary task opens a right-hand drawer (design-v3 §6).
 * Kept for existing callers (size guide, admin) — same props, rendered as a <Drawer>.
 */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <Drawer open={open} onClose={onClose} title={title} size={wide ? "wide" : "default"}>
      <div className="stack gap-16">{children}</div>
    </Drawer>
  );
}
