import { api } from "./client";
import type {
  Collection,
  CollectionPage,
  ContentPage,
  DeliveryZone,
  FaqGroup,
  Paginated,
  Product,
  ProductCard,
  NgState,
  ProductFilters,
  SearchSuggest,
  StoreSettings,
} from "../types";

const filterQuery = (f: ProductFilters = {}) => ({
  page: f.page,
  pageSize: f.pageSize,
  size: f.size,
  colour: f.colour,
  minKobo: f.minKobo,
  maxKobo: f.maxKobo,
  inStock: f.inStock ? "true" : undefined,
  sort: f.sort,
  q: f.q,
});

export const catalogApi = {
  settings: () => api.get<StoreSettings>("settings/public", { revalidate: 60, tags: ["settings"] }),
  collections: () => api.get<Collection[]>("collections", { revalidate: 120, tags: ["collections"] }),
  collection: (slug: string, filters?: ProductFilters) =>
    api.get<CollectionPage>(`collections/${encodeURIComponent(slug)}`, { query: filterQuery(filters), revalidate: 60, tags: ["collections", `collection:${slug}`] }),
  products: (filters?: ProductFilters) => api.get<Paginated<ProductCard>>("products", { query: filterQuery(filters), revalidate: 60, tags: ["products"] }),
  product: (slug: string) => api.get<Product>(`products/${encodeURIComponent(slug)}`, { revalidate: 60, tags: ["products", `product:${slug}`] }),
  suggest: (q: string, signal?: AbortSignal) => api.get<SearchSuggest>("search/suggest", { query: { q }, signal, revalidate: 30 }),
  states: () => api.get<NgState[]>("locations/states", { revalidate: 86400, tags: ["states"] }),
  zones: () => api.get<DeliveryZone[]>("delivery-zones", { revalidate: 300, tags: ["zones"] }),
  /** "Notify me" when a sold-out size is back. */
  notifyStock: (slug: string, email: string, variantId: string) => api.post<{ ok: true }>(`products/${encodeURIComponent(slug)}/notify`, { email, variantId }),
};

export const contentApi = {
  faq: () => api.get<FaqGroup[]>("faq", { revalidate: 300, tags: ["faq"] }),
  page: (slug: string) => api.get<ContentPage>(`pages/${encodeURIComponent(slug)}`, { revalidate: 300, tags: [`page:${slug}`] }),
  contact: (body: { name: string; email: string; phone?: string; subject: string; message: string }) => api.post<{ ok: true }>("contact", body),
  newsletter: (email: string) => api.post<{ ok: true }>("newsletter", { email, consent: true }),
  notifyDrop: (contact: string, collectionSlug: string) => api.post<{ ok: true }>("drops/notify", { contact, collectionSlug }),
};
