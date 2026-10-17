"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { NavCategories } from "@/lib/nav";
import type { Collection, StoreSettings } from "@/lib/types";

type SettingsValue = {
  settings: StoreSettings;
  collections: Collection[];
  collection: (slug: string) => Collection | undefined;
  /** The current/next drop collection, if any */
  drop: Collection | undefined;
  /** Sub-categories per main collection (mega menu, mobile menu). */
  navCategories: NavCategories;
};

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ settings, collections, navCategories = {}, children }: { settings: StoreSettings; collections: Collection[]; navCategories?: NavCategories; children: ReactNode }) {
  const value = useMemo<SettingsValue>(() => {
    const collection = (slug: string) => collections.find((c) => c.slug === slug);
    return { settings, collections, collection, drop: settings.drop ? collection(settings.drop.collectionSlug) : undefined, navCategories };
  }, [settings, collections, navCategories]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used inside <SettingsProvider>");
  return v;
}
