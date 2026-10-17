"use client";
import { useEffect, type ReactNode } from "react";
import type { NavCategories } from "@/lib/nav";
import type { Collection, StoreSettings } from "@/lib/types";
import { captureUtm } from "@/lib/utm";
import { SettingsProvider } from "./SettingsContext";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";
import { CartProvider } from "./CartContext";
import { WishlistProvider } from "./WishlistContext";
import { UIProvider } from "./UIContext";

export function Providers({ settings, collections, navCategories, children }: { settings: StoreSettings; collections: Collection[]; navCategories?: NavCategories; children: ReactNode }) {
  useEffect(() => {
    captureUtm();
  }, []);
  return (
    <SettingsProvider settings={settings} collections={collections} navCategories={navCategories}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <UIProvider>{children}</UIProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
