"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/chrome/Icons";

/**
 * Right-hand slide-in panel (docs/design-v3.md §6 "Drawers"): --drawer-w (30vw, min 420px; 100vw on mobile),
 * --bg, 24px padding, 20px title top-left, × top-right, scrolling body, sticky footer for actions.
 *
 *   <Drawer open={open} onClose={() => setOpen(false)} title="Filter" footer={<button className="btn btn--primary btn--block">Apply</button>}>
 *     …content…
 *   </Drawer>
 *
 * Behaviour: rendered in a portal on <body>; scrim fades + panel slides (300ms, off under
 * prefers-reduced-motion); Esc and scrim click close; focus moves into the panel (to the first
 * [data-autofocus] element, else the panel itself), is trapped while open and restored on close;
 * body scroll is locked. Stacks correctly (Esc closes only the top-most drawer).
 */
type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  /** Sticky footer actions (hairline above). */
  footer?: ReactNode;
  /** Extra content on the title row, before the × (e.g. "{n} Items"). */
  meta?: ReactNode;
  side?: "right" | "left";
  /** "wide" = 560px minimum on desktop (size tables). */
  size?: "default" | "wide";
  className?: string;
  /** Accessible name when the visible title is not descriptive enough. */
  ariaLabel?: string;
  closeLabel?: string;
  /** Keep the title for screen readers only (search drawer: the input is the first thing). */
  hideTitle?: boolean;
};

const stack: symbol[] = [];
let lockCount = 0;
let savedOverflow = "";
let savedPadding = "";

function lockScroll() {
  if (lockCount++ > 0) return;
  const sb = window.innerWidth - document.documentElement.clientWidth;
  savedOverflow = document.body.style.overflow;
  savedPadding = document.body.style.paddingRight;
  document.body.style.overflow = "hidden";
  if (sb > 0) document.body.style.paddingRight = `${sb}px`;
}
function unlockScroll() {
  if (--lockCount > 0) return;
  lockCount = 0;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPadding;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function Drawer({ open, onClose, title, children, footer, meta, side = "right", size = "default", className = "", ariaLabel, closeLabel = "Close", hideTitle }: Props) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  });

  // mount → next frame show (so the slide runs); hide → unmount after the transition
  useEffect(() => {
    if (open) {
      setMounted(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), reducedMotion() ? 0 : 300);
    return () => window.clearTimeout(t);
  }, [open]);

  // focus, trap, Esc, scroll lock while open
  useEffect(() => {
    if (!open || !mounted) return;
    const me = Symbol("drawer");
    stack.push(me);
    const prev = document.activeElement as HTMLElement | null;
    lockScroll();
    const t = window.setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
      el?.focus({ preventScroll: true });
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key === "Tab" && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null || x === document.activeElement);
        if (!f.length) {
          e.preventDefault();
          return;
        }
        const first = f[0];
        const last = f[f.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panel.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      unlockScroll();
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className={`drawer-root drawer-root--${side}${shown ? " is-open" : ""}`}>
      <div className="scrim" onClick={() => closeRef.current()} aria-hidden />
      <div
        ref={panel}
        className={`drawer drawer--${side}${size === "wide" ? " drawer--wide" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        <div className="drawer__head">
          <h2 id={titleId} className={hideTitle ? "sr-only" : "drawer__title"}>{title}</h2>
          {meta != null && <span className="drawer__meta">{meta}</span>}
          <button type="button" className="drawer__close" aria-label={closeLabel} onClick={() => closeRef.current()}>
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        {footer != null && <div className="drawer__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
