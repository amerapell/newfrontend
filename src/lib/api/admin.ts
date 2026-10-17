import { api } from "./client";
import type {
  AdminCollection,
  AdminCustomer,
  AdminCustomerDetail,
  AdminCustomerSort,
  AdminDashboard,
  AdminExchange,
  AdminExchangeDetail,
  AdminLoginResponse,
  AdminOrder,
  AdminOrderDetail,
  AdminProduct,
  AdminProductInput,
  AdminProductListItem,
  CloudinarySignature,
  ContentPage,
  DeliveryZone,
  Discount,
  FaqItemAdmin,
  OrderStatus,
  Paginated,
  StoreSettings,
  Variant,
} from "../types";

const a = { auth: "admin" as const };

/** POST /admin/stock/import → one entry per rejected CSV row. */
export type StockImportResult = { updated: number; errors: { line: number; sku: string | null; message: string }[] };

export const adminApi = {
  login: (email: string, password: string) => api.post<AdminLoginResponse>("admin/auth/login", { email, password }),
  totp: (tempToken: string, code: string) => api.post<{ accessToken: string }>("admin/auth/totp", { tempToken, code }),
  /** Requires an admin access token (first login without TOTP). */
  totpSetup: () => api.post<{ otpauthUrl: string; secret: string }>("admin/auth/totp/setup", undefined, a),
  totpEnable: (code: string) => api.post<{ ok: true }>("admin/auth/totp/enable", { code }, a),
  dashboard: () => api.get<AdminDashboard>("admin/dashboard", a),

  products: (q?: { q?: string; status?: string; page?: number }) => api.get<Paginated<AdminProductListItem>>("admin/products", { ...a, query: q }),
  product: (id: string) => api.get<AdminProduct>(`admin/products/${id}`, a),
  createProduct: (b: AdminProductInput) => api.post<AdminProduct>("admin/products", b, a),
  updateProduct: (id: string, b: Partial<AdminProductInput>) => api.patch<AdminProduct>(`admin/products/${id}`, b, a),
  archiveProduct: (id: string) => api.del<unknown>(`admin/products/${id}`, a),
  updateVariant: (id: string, b: { priceKobo?: number; compareAtKobo?: number | null; stock?: number; sku?: string }) => api.patch<Variant>(`admin/variants/${id}`, b, a),
  exportStock: () => api.get<string>("admin/stock/export", { ...a, text: true }),
  importStock: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<StockImportResult>("admin/stock/import", fd, { ...a, direct: true });
  },

  collections: () => api.get<AdminCollection[]>("admin/collections", a),
  collection: (id: string) => api.get<AdminCollection>(`admin/collections/${id}`, a),
  createCollection: (b: Partial<AdminCollection>) => api.post<AdminCollection>("admin/collections", b, a),
  updateCollection: (id: string, b: Partial<AdminCollection>) => api.patch<AdminCollection>(`admin/collections/${id}`, b, a),
  deleteCollection: (id: string) => api.del<unknown>(`admin/collections/${id}`, a),

  orders: (q?: { status?: string; provider?: string; q?: string; page?: number }) => api.get<Paginated<AdminOrder>>("admin/orders", { ...a, query: q }),
  customers: (q?: { q?: string; sort?: AdminCustomerSort; page?: number }) => api.get<Paginated<AdminCustomer>>("admin/customers", { ...a, query: q }),
  customer: (email: string) => api.get<AdminCustomerDetail>(`admin/customers/${encodeURIComponent(email)}`, a),
  order: (id: string) => api.get<AdminOrderDetail>(`admin/orders/${id}`, a),
  updateOrder: (id: string, b: { status?: OrderStatus; note?: string }) => api.patch<AdminOrderDetail>(`admin/orders/${id}`, b, a),
  packingSlip: (id: string) => api.get<string>(`admin/orders/${id}/packing-slip`, { ...a, text: true }),

  exchanges: (status?: string) => api.get<AdminExchange[]>("admin/exchanges", { ...a, query: { status } }),
  exchange: (id: string) => api.get<AdminExchangeDetail>(`admin/exchanges/${id}`, a),
  exchangeAction: (id: string, action: "approve" | "decline" | "receive" | "complete", note?: string) =>
    api.post<AdminExchangeDetail>(`admin/exchanges/${id}/${action}`, { note }, a),

  discounts: () => api.get<Discount[]>("admin/discounts", a),
  discount: (id: string) => api.get<Discount>(`admin/discounts/${id}`, a),
  createDiscount: (b: Omit<Discount, "id">) => api.post<Discount>("admin/discounts", b, a),
  updateDiscount: (id: string, b: Partial<Discount>) => api.patch<Discount>(`admin/discounts/${id}`, b, a),
  deleteDiscount: (id: string) => api.del<unknown>(`admin/discounts/${id}`, a),

  zones: () => api.get<DeliveryZone[]>("admin/delivery-zones", a),
  zone: (id: string) => api.get<DeliveryZone>(`admin/delivery-zones/${id}`, a),
  updateZone: (id: string, b: Partial<DeliveryZone>) => api.patch<DeliveryZone>(`admin/delivery-zones/${id}`, b, a),

  settings: () => api.get<StoreSettings>("admin/settings", a),
  updateSettings: (b: Partial<StoreSettings>) => api.patch<StoreSettings>("admin/settings", b, a),

  faq: () => api.get<FaqItemAdmin[]>("admin/faq", a),
  faqItem: (id: string) => api.get<FaqItemAdmin>(`admin/faq/${id}`, a),
  createFaq: (b: Omit<FaqItemAdmin, "id">) => api.post<FaqItemAdmin>("admin/faq", b, a),
  updateFaq: (id: string, b: Partial<FaqItemAdmin>) => api.patch<FaqItemAdmin>(`admin/faq/${id}`, b, a),
  deleteFaq: (id: string) => api.del<unknown>(`admin/faq/${id}`, a),

  pages: () => api.get<ContentPage[]>("admin/pages", a),
  page: (slug: string) => api.get<ContentPage>(`admin/pages/${slug}`, a),
  updatePage: (slug: string, b: { title?: string; bodyMarkdown?: string }) => api.patch<ContentPage>(`admin/pages/${slug}`, b, a),
};

type UploadMode = (({ mode: "cloudinary" } & CloudinarySignature) | { mode: "direct" } | (CloudinarySignature & { mode?: undefined })) & { backgroundRemoval?: boolean };

/** Whether the server can cut out backgrounds (the model is installed). Cached for the session. */
let removalAvailable: Promise<boolean> | null = null;
export function backgroundRemovalAvailable(): Promise<boolean> {
  removalAvailable ??= api
    .post<UploadMode>("admin/uploads/sign", undefined, a)
    .then((m) => !!m.backgroundRemoval)
    .catch(() => {
      removalAvailable = null;
      return false;
    });
  return removalAvailable;
}

export interface CutoutUpload {
  /** The cut-out on the stage ground. */
  url: string;
  /** The untouched photo, when `keepOriginal` was asked for. */
  originalUrl: string | null;
}

/**
 * Upload with automatic background removal: the server cuts the subject out and places it on the stage ground
 * (`portrait` 4:5 for product shots, `landscape` 3:2 for banners). Always goes through our API, even when
 * Cloudinary is configured, because the cut-out is made on the server. Takes a few seconds per photo.
 */
export async function uploadCutout(file: File, opts: { layout?: "portrait" | "landscape"; keepOriginal?: boolean } = {}): Promise<CutoutUpload> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("removeBackground", "true");
  fd.append("layout", opts.layout ?? "portrait");
  if (opts.keepOriginal) fd.append("keepOriginal", "true");
  const res = await api.post<{ url: string; originalUrl?: string | null }>("admin/uploads/image", fd, { ...a, direct: true, signal: AbortSignal.timeout(90_000) });
  return { url: res.url, originalUrl: res.originalUrl ?? null };
}

/**
 * Admin image upload (product images, collection hero images). POST /admin/uploads/sign says how:
 *  - `{ mode: "cloudinary", …signed params }` → straight from the browser to Cloudinary;
 *  - `{ mode: "direct" }` → multipart POST /admin/uploads/image (built-in storage, WebP variants via sharp).
 * Resolves with the public image URL.
 */
export async function uploadImage(file: File): Promise<string> {
  const how = await api.post<UploadMode>("admin/uploads/sign", undefined, a);
  if (how.mode === "direct") {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post<{ url: string }>("admin/uploads/image", fd, { ...a, direct: true });
    return res.url;
  }
  const sig = how as CloudinarySignature;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const json = (await res.json()) as { secure_url: string };
  return json.secure_url;
}

/** @deprecated use uploadImage (handles built-in storage as well as Cloudinary). */
export const uploadToCloudinary = uploadImage;
