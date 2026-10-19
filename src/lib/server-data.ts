import "server-only";
import { cache } from "react";
import { catalogApi, safe } from "./api";
import { NAV_CATEGORIES, subcategoriesOf, type NavCategories } from "./nav";
import type { Collection, StoreSettings } from "./types";

/** Used only if the API can't be reached in production — keeps every page renderable. */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Amerapelle",
  pickupAddress: "",
  openingHours: "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  instagramUrl: "",
  tiktokUrl: "",
  contactEmail: "",
  contactPhone: "",
  paystackEnabled: true,
  bachsEnabled: true,
  exchangeWindowDays: 7,
  creditExpiryDays: null,
  freeDeliveryThresholdKobo: null,
  tickerText: [],
  serviceImages: { stylist: null, store: null, exchange: null },
  welcomePopup: { enabled: false, title: "Welcome to Amerapelle", text: "", imageUrl: null },
  homeMedia: {
    hero: { images: [], title: "", linkLabel: "", href: "/" },
    slides: { images: [], title: "", linkLabel: "", href: "/" },
    still: { images: [], title: "", linkLabel: "", href: "/" },
  },
  drop: null,
};

export const getSettings = cache(() => safe<StoreSettings>(catalogApi.settings(), DEFAULT_SETTINGS));
export const getCollections = cache(() => safe<Collection[]>(catalogApi.collections(), []));

/** Mega-menu / listing-rail sub-categories for the main collections (cached with the collection fetch). */
export const getNavCategories = cache(async (): Promise<NavCategories> => {
  const entries = await Promise.all(
    NAV_CATEGORIES.map(async (n) => {
      const page = await safe(catalogApi.collection(n.slug, { pageSize: 96 }), null);
      // null = API unreachable → keep the category; [] products → leave it out of the menu.
      if (page && page.products.items.length === 0) return null;
      return [n.slug, page ? subcategoriesOf(page.products.items) : []] as const;
    }),
  );
  return Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null));
});
