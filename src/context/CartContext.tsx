"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, cartApi, tokens } from "@/lib/api";
import { apiMessage } from "@/lib/format";
import { readUtm } from "@/lib/utm";
import type { Cart, CartLine } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
type AddOptions = {
  /** Skip the drawer (reel …) */
  silent?: boolean;
  label?: string;
};

type CartValue = {
  cart: Cart | null;
  ready: boolean;
  count: number;
  bumpKey: number;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  lastAdded: CartLine | null;
  add: (variantId: string, quantity?: number, opts?: AddOptions) => Promise<boolean>;
  update: (lineId: string, patch: { quantity?: number; variantId?: string }) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  applyPromo: (code: string) => Promise<void>;
  removePromo: () => Promise<void>;
  reload: () => Promise<void>;
  useCredit: boolean;
  setUseCredit: (v: boolean) => void;
  busy: boolean;
};

const Ctx = createContext<CartValue | null>(null);
const CREDIT_KEY = "ap_use_credit";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLine | null>(null);
  const [useCredit, setUseCreditState] = useState(true);
  const mergedFor = useRef<string | null>(null);

  const accept = useCallback((c: Cart) => {
    setCart(c);
    if (c.token) tokens.setCart(c.token);
  }, []);

  const create = useCallback(async () => {
    const c = await cartApi.create(readUtm());
    accept(c);
    return c;
  }, [accept]);

  const load = useCallback(async () => {
    try {
      if (!tokens.getCart() && !tokens.getAccess()) {
        setCart(null);
        return;
      }
      accept(await cartApi.get());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
        tokens.setCart(null);
        setCart(null);
      }
    } finally {
      setReady(true);
    }
  }, [accept]);

  // Initial load once auth has settled (logged-in carts come from the user, guests from the token).
  useEffect(() => {
    if (status === "loading") return;
    void load();
  }, [status, load]);

  // CRT-3: merge the guest cart into the account on login.
  useEffect(() => {
    if (!user || mergedFor.current === user.id) return;
    mergedFor.current = user.id;
    const guest = tokens.getCart();
    if (!guest) return;
    cartApi
      .merge(guest)
      .then(accept)
      .catch(() => void load());
  }, [user, accept, load]);

  useEffect(() => {
    try {
      const v = window.sessionStorage.getItem(CREDIT_KEY);
      if (v !== null) setUseCreditState(v === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const setUseCredit = useCallback((v: boolean) => {
    setUseCreditState(v);
    try {
      window.sessionStorage.setItem(CREDIT_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const withCart = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      if (!tokens.getCart() && !tokens.getAccess()) await create();
      try {
        return await fn();
      } catch (e) {
        // stale token → start a fresh cart and retry once
        if (e instanceof ApiError && e.status === 404 && !tokens.getAccess()) {
          tokens.setCart(null);
          await create();
          return await fn();
        }
        throw e;
      }
    },
    [create],
  );

  const add = useCallback<CartValue["add"]>(
    async (variantId, quantity = 1, opts = {}) => {
      setBusy(true);
      try {
        const c = await withCart(() => cartApi.addLine(variantId, quantity));
        accept(c);
        const line = c.lines.find((l) => l.variantId === variantId) ?? null;
        setLastAdded(line);
        setBumpKey((k) => k + 1);
        // §7 Bag drawer opens on add-to-bag (all viewports); silent adds (reel) show their own confirmation.
        if (!opts.silent) setDrawerOpen(true);
        return true;
      } catch (e) {
        toast.show({ message: apiMessage(e, "We couldn't add that. Please try again."), tone: "error" });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [withCart, accept, toast],
  );

  const mutate = useCallback(
    async (fn: () => Promise<Cart>) => {
      setBusy(true);
      try {
        accept(await withCart(fn));
      } catch (e) {
        toast.show({ message: apiMessage(e), tone: "error" });
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [withCart, accept, toast],
  );

  const update = useCallback<CartValue["update"]>((lineId, patch) => mutate(() => cartApi.updateLine(lineId, patch)).catch(() => {}), [mutate]);
  const remove = useCallback<CartValue["remove"]>((lineId) => mutate(() => cartApi.removeLine(lineId)).catch(() => {}), [mutate]);
  const applyPromo = useCallback<CartValue["applyPromo"]>(
    async (code) => {
      setBusy(true);
      try {
        accept(await withCart(() => cartApi.applyPromo(code)));
      } finally {
        setBusy(false);
      }
    },
    [withCart, accept],
  );
  const removePromo = useCallback<CartValue["removePromo"]>(() => mutate(() => cartApi.removePromo()).catch(() => {}), [mutate]);

  const value = useMemo<CartValue>(
    () => ({
      cart,
      ready,
      count: cart?.itemCount ?? 0,
      bumpKey,
      drawerOpen,
      setDrawerOpen,
      lastAdded,
      add,
      update,
      remove,
      applyPromo,
      removePromo,
      reload: load,
      useCredit,
      setUseCredit,
      busy,
    }),
    [cart, ready, bumpKey, drawerOpen, lastAdded, add, update, remove, applyPromo, removePromo, load, useCredit, setUseCredit, busy],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}
