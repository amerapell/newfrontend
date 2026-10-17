/**
 * In-browser/in-process mock of the REST contract (docs/api-contract.md).
 * Mirrors every endpoint the frontend calls so the whole UI can be exercised
 * with NEXT_PUBLIC_USE_MOCKS=true. State persists to localStorage in the browser.
 */
import type {
  Address,
  AdminProduct,
  AdminProductInput,
  Cart,
  CartLine,
  Collection,
  Discount,
  Exchange,
  ExchangeStatus,
  FaqItemAdmin,
  OrderStatus,
  Product,
  ProductCard,
  StoreSettings,
  User,
  Variant,
  ZoneCode,
  AdminOrder,
  AdminOrderDetail,
  AdminExchangeDetail,
} from "../types";
import { NG_LGAS, NG_STATES } from "../nigeria";
import {
  MOCK_COLLECTIONS,
  MOCK_FAQ,
  MOCK_PAGES,
  MOCK_PRODUCTS,
  MOCK_SETTINGS,
  MOCK_TIME,
  MOCK_ZONES,
  stripToCard,
} from "./data";

export class MockHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type DB = {
  carts: Record<string, { lines: { id: string; variantId: string; quantity: number }[]; promo: string | null; userId: string | null; utm?: unknown }>;
  user: User | null; // single demo customer
  password: string | null;
  signedIn: boolean;
  addresses: Address[];
  wishlist: string[]; // product ids
  orders: AdminOrder[];
  exchanges: Exchange[];
  credit: { id: string; amountKobo: number; reason: string; createdAt: string; expiresAt: string | null }[];
  settings: StoreSettings;
  discounts: Discount[];
  faq: FaqItemAdmin[];
  pages: typeof MOCK_PAGES;
  zones: typeof MOCK_ZONES;
  products: Product[];
  productMeta: Record<string, { status: "DRAFT" | "LIVE" | "ARCHIVED"; collectionIds: string[]; images: { url: string; alt: string; colour?: string | null }[] }>;
  collections: Collection[];
  newsletter: string[];
  adminTotpPending: boolean;
  adminTotpEnabled: boolean;
  orderNotes: Record<string, { id: string; body: string; author: string | null; createdAt: string }[]>;
  seq: number;
};

const { NOW, DAY } = MOCK_TIME;
const iso = (ms: number) => new Date(ms).toISOString();
const STORE_KEY = "ap_mockdb_v3";

function seedOrders(): AdminOrder[] {
  const jacket = MOCK_PRODUCTS.find((p) => p.slug === "cropped-leather-jacket")!;
  const shirt = MOCK_PRODUCTS.find((p) => p.slug === "silk-camp-collar-shirt")!;
  const hoops = MOCK_PRODUCTS.find((p) => p.slug === "gold-tone-hoop-set")!;
  const tote = MOCK_PRODUCTS.find((p) => p.slug === "structured-tote")!;
  const addr: Address = { id: "adr_1", fullName: "Ada Okafor", phone: "+2348030000000", state: "Lagos", lga: "Eti-Osa", area: "Lekki Phase 1", street: "12 Admiralty Way", landmark: "Opposite the filling station", note: null };
  const item = (p: Product, colour: string | null, size: string | null, id: string) => ({ id, name: p.name, number: p.number, colour, size, unitKobo: p.priceKobo, quantity: 1, imageUrl: null, exchangeable: p.exchangeable });
  const base = (n: string, status: OrderStatus, items: ReturnType<typeof item>[], created: number, delivered: number | null, provider: "PAYSTACK" | "BACHS", source: string): AdminOrder => {
    const sub = items.reduce((s, i) => s + i.unitKobo * i.quantity, 0);
    return {
      id: "ord_" + n, number: n, status, email: "ada@example.com", phone: "+2348030000000", items,
      delivery: { zone: "LEKKI_AJAH", name: "Lekki – Ajah", feeKobo: 5000_00, address: addr },
      subtotalKobo: sub, discountKobo: 0, creditAppliedKobo: 0, deliveryKobo: 5000_00, totalKobo: sub + 5000_00, amountDueKobo: sub + 5000_00,
      payment: { provider, reference: "ref_" + n, status: status === "PENDING_PAYMENT" ? "PENDING" : "SUCCEEDED" },
      createdAt: iso(created), paidAt: status === "PENDING_PAYMENT" ? null : iso(created + 60_000), deliveredAt: delivered ? iso(delivered) : null,
      exchangeableUntil: delivered ? iso(delivered + 14 * DAY) : null, utmSource: source,
    };
  };
  return [
    base("AP-10511", "PAID", [item(tote, "Tan", null, "oi_5")], NOW - 2 * 3600_000, null, "PAYSTACK", "instagram"),
    base("AP-10482", "DELIVERED", [item(jacket, "Black", "M", "oi_1"), item(shirt, "Ivory", "L", "oi_2"), item(hoops, "Gold", null, "oi_3")], NOW - 6 * DAY, NOW - 3 * DAY, "PAYSTACK", "tiktok"),
    base("AP-10377", "EXCHANGED", [item(shirt, "Navy", "M", "oi_4")], NOW - 40 * DAY, NOW - 37 * DAY, "BACHS", "whatsapp"),
    { ...base("AP-10530", "PROCESSING", [item(shirt, "Navy", "S", "oi_6")], NOW - 5 * 3600_000, null, "BACHS", "direct"), email: "tolu@example.com" },
    { ...base("AP-10528", "PENDING_PAYMENT", [item(jacket, "Tan", "S", "oi_7")], NOW - 20 * 60_000, null, "PAYSTACK", "instagram"), email: "kemi@example.com" },
    { ...base("AP-10519", "READY_FOR_PICKUP", [item(hoops, "Gold", null, "oi_8")], NOW - 1 * DAY, null, "PAYSTACK", "instagram"), email: "zainab@example.com", delivery: { zone: "PICKUP", name: "Collect from the store", feeKobo: 0, address: null } },
    { ...base("AP-10502", "DISPATCHED", [item(tote, "Tan", null, "oi_9")], NOW - 2 * DAY, null, "BACHS", "tiktok"), email: "nneka@example.com" },
  ];
}

function freshDB(): DB {
  return {
    carts: {},
    user: { id: "usr_ada", email: "ada@example.com", firstName: "Ada", lastName: "Okafor", phone: "+2348030000000", emailVerified: true, creditBalanceKobo: 62500_00 },
    password: null,
    signedIn: false,
    addresses: [
      { id: "adr_1", fullName: "Ada Okafor", phone: "+2348030000000", state: "Lagos", lga: "Eti-Osa", area: "Lekki Phase 1", street: "12 Admiralty Way", landmark: "Opposite the filling station", note: null },
      { id: "adr_2", fullName: "Ada Okafor", phone: "+2348030000000", state: "FCT", lga: "Abuja Municipal (AMAC)", area: "Maitama", street: "7 Gana Street", landmark: "Behind the embassy", note: null },
    ],
    wishlist: ["prd_040", "prd_031", "prd_047"],
    orders: seedOrders(),
    exchanges: [
      { id: "exc_2031", number: "EX-2031", orderNumber: "AP-10377", status: "CREDIT_ISSUED", reason: "Wrong size", note: null, photoUrls: [],
        items: [{ orderItemId: "oi_4", name: "Silk camp-collar shirt", quantity: 1, valueKobo: 62500_00 }], creditKobo: 62500_00,
        history: [
          { status: "REQUESTED", at: iso(NOW - 35 * DAY), note: null },
          { status: "APPROVED", at: iso(NOW - 34 * DAY), note: null },
          { status: "ITEM_RECEIVED", at: iso(NOW - 31 * DAY), note: null },
          { status: "CREDIT_ISSUED", at: iso(NOW - 31 * DAY), note: null },
        ], createdAt: iso(NOW - 35 * DAY) },
      { id: "exc_2032", number: "EX-2032", orderNumber: "AP-10482", status: "REQUESTED", reason: "Doesn't fit",
        note: "The L is too loose across the shoulders — could I swap for an M in the same colour?",
        photoUrls: ["https://placehold.co/900x1200/f2f0ea/0a0a0f?text=Front", "https://placehold.co/900x1200/f2f0ea/0a0a0f?text=Label"],
        items: [{ orderItemId: "oi_2", name: "Silk camp-collar shirt", quantity: 1, valueKobo: 62500_00 }], creditKobo: 0,
        history: [{ status: "REQUESTED", at: iso(NOW - 1 * DAY), note: null }], createdAt: iso(NOW - 1 * DAY) },
    ],
    credit: [{ id: "cr_1", amountKobo: 62500_00, reason: "EXCHANGE_CREDIT", createdAt: iso(NOW - 31 * DAY), expiresAt: iso(NOW + 334 * DAY) }],
    settings: structuredClone(MOCK_SETTINGS),
    discounts: [
      { id: "dsc_1", code: "WELCOME10", type: "PERCENT", value: 10, uses: 41, maxUses: null, minSubtotalKobo: null, startsAt: null, endsAt: null },
      { id: "dsc_2", code: "LAGOS5K", type: "FIXED", value: 5000_00, uses: 12, maxUses: 100, minSubtotalKobo: 100000_00, startsAt: null, endsAt: null },
      { id: "dsc_3", code: "FREESHIP", type: "FREE_DELIVERY", value: 0, uses: 3, maxUses: null, minSubtotalKobo: null, startsAt: null, endsAt: null },
    ],
    faq: MOCK_FAQ.flatMap((g) => g.items.map((i, k) => ({ ...i, group: g.group, sortOrder: k }))),
    pages: structuredClone(MOCK_PAGES),
    zones: structuredClone(MOCK_ZONES),
    products: structuredClone(MOCK_PRODUCTS),
    productMeta: {},
    collections: structuredClone(MOCK_COLLECTIONS),
    newsletter: [],
    adminTotpPending: false,
    adminTotpEnabled: false,
    orderNotes: {},
    seq: 2033,
  };
}

let memo: DB | null = null;
function db(): DB {
  if (memo) return memo;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        memo = JSON.parse(raw) as DB;
        // refresh time-relative catalogue data on every load
        memo.collections = structuredClone(MOCK_COLLECTIONS).map((c) => memo!.collections.find((x) => x.slug === c.slug && x.id === c.id) ? { ...c, ...memo!.collections.find((x) => x.slug === c.slug)!, goLiveAt: c.goLiveAt } : c);
        memo.settings.drop = memo.settings.drop ? { ...memo.settings.drop, goLiveAt: MOCK_SETTINGS.drop!.goLiveAt } : null;
        return memo;
      }
    } catch {
      /* ignore */
    }
  }
  memo = freshDB();
  return memo;
}
function save() {
  if (typeof window === "undefined" || !memo) return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(memo));
  } catch {
    /* quota — ignore */
  }
}

const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function liveProducts(): Product[] {
  const d = db();
  return d.products.filter((p) => (d.productMeta[p.id]?.status ?? "LIVE") === "LIVE");
}

/** Mock products flagged "Featured piece in listings" (admin can toggle it per product). */
const MOCK_FEATURED = new Set(["satin-slip-dress", "velvet-blazer", "structured-tote"]);

function card(p: Product): ProductCard {
  return { ...stripToCard(p), featured: p.featured ?? MOCK_FEATURED.has(p.slug) };
}

function findVariant(id: string): { product: Product; variant: Variant } | null {
  for (const p of db().products) {
    const v = p.variants.find((x) => x.id === id);
    if (v) return { product: p, variant: v };
  }
  return null;
}

function filterProducts(list: Product[], q: URLSearchParams) {
  let out = list.slice();
  const size = q.get("size");
  const colour = q.get("colour");
  const min = q.get("minKobo");
  const max = q.get("maxKobo");
  const inStock = q.get("inStock") === "true";
  const term = (q.get("q") || "").trim().toLowerCase();
  const sizes = (size || "").split(",").map((x) => x.trim()).filter(Boolean);
  const colours = (colour || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (sizes.length) out = out.filter((p) => p.variants.some((v) => !!v.size && sizes.includes(v.size) && v.available > 0));
  if (colours.length) out = out.filter((p) => p.options.colours.some((c) => colours.includes(c.name.toLowerCase())));
  if (min) out = out.filter((p) => p.priceKobo >= Number(min));
  if (max) out = out.filter((p) => p.priceKobo <= Number(max));
  if (inStock) out = out.filter((p) => p.inStock);
  if (term) out = out.filter((p) => fuzzy(`${p.name} ${p.material} ${p.number}`, term));
  const sort = q.get("sort") || "newest";
  if (sort === "price_asc") out.sort((a, b) => a.priceKobo - b.priceKobo);
  else if (sort === "price_desc") out.sort((a, b) => b.priceKobo - a.priceKobo);
  const page = Math.max(1, Number(q.get("page") || 1));
  const pageSize = Math.max(1, Math.min(96, Number(q.get("pageSize") || 24)));
  return { items: out.slice((page - 1) * pageSize, page * pageSize).map(card), page, pageSize, total: out.length };
}

/** Tiny typo-tolerant match (stand-in for Postgres trigram). */
function fuzzy(hay: string, needle: string) {
  const h = hay.toLowerCase();
  return needle.split(/\s+/).every((w) => {
    if (h.includes(w)) return true;
    if (w.length < 4) return false;
    return h.split(/[^a-z0-9]+/).some((tok) => lev(tok, w) <= (w.length > 6 ? 2 : 1));
  });
}
function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

function cartView(token: string): Cart {
  const d = db();
  const c = d.carts[token];
  const lines: CartLine[] = c.lines
    .map((l) => {
      const f = findVariant(l.variantId);
      if (!f) return null;
      const { product: p, variant: v } = f;
      const problem = v.available <= 0 ? "SOLD_OUT" : l.quantity > v.available ? "LOW_STOCK" : null;
      return {
        id: l.id, variantId: v.id, productSlug: p.slug, number: p.number, name: p.name, colour: v.colour, size: v.size,
        material: p.material ? p.material.split(" · ")[0] : null, imageUrl: v.imageUrls[0] ?? p.images[0]?.url ?? null,
        unitKobo: v.priceKobo, quantity: l.quantity, lineKobo: v.priceKobo * l.quantity, available: v.available, problem,
      } as CartLine;
    })
    .filter(Boolean) as CartLine[];
  const subtotal = lines.reduce((s, l) => s + l.lineKobo, 0);
  const disc = c.promo ? d.discounts.find((x) => x.code === c.promo) : null;
  let discountKobo = 0;
  if (disc?.type === "PERCENT") discountKobo = Math.round((subtotal * disc.value) / 100);
  if (disc?.type === "FIXED") discountKobo = Math.min(subtotal, disc.value);
  return {
    id: "cart_" + token.slice(0, 6), token, lines, itemCount: lines.reduce((s, l) => s + l.quantity, 0), subtotalKobo: subtotal,
    discountKobo, promoCode: c.promo, freeDeliveryThresholdKobo: d.settings.freeDeliveryThresholdKobo,
  };
}

function requireCart(token: string | null) {
  const d = db();
  if (!token || !d.carts[token]) {
    const t = token || rid("ct");
    d.carts[t] = { lines: [], promo: null, userId: null };
    return t;
  }
  return token;
}

function requireAuth(auth: boolean) {
  const d = db();
  if (!auth || !d.signedIn || !d.user) throw new MockHttpError(401, "Unauthorized");
  return d.user;
}

/** Older stored mock users have no flag: treat them as verified. */
const isVerified = (u: User | null) => !!u && u.emailVerified !== false;
/** Like the API: an unverified account sees no credit (the stored balance stays put until it verifies). */
const publicUser = (u: User): User => ({ ...u, emailVerified: isVerified(u), creditBalanceKobo: isVerified(u) ? u.creditBalanceKobo : 0 });

function quote(token: string, zone: ZoneCode, useCredit: boolean, signedIn: boolean) {
  const d = db();
  const c = cartView(token);
  const z = d.zones.find((x) => x.code === zone);
  const disc = c.promoCode ? d.discounts.find((x) => x.code === c.promoCode) : null;
  const afterDisc = c.subtotalKobo - c.discountKobo;
  const free = (d.settings.freeDeliveryThresholdKobo != null && afterDisc >= d.settings.freeDeliveryThresholdKobo) || disc?.type === "FREE_DELIVERY";
  const deliveryKobo = free ? 0 : z?.feeKobo ?? 0;
  const total = afterDisc + deliveryKobo;
  const avail = signedIn && d.user && isVerified(d.user) ? d.user.creditBalanceKobo : 0;
  const applied = useCredit ? Math.min(avail, total) : 0;
  return {
    subtotalKobo: c.subtotalKobo, discountKobo: c.discountKobo, deliveryKobo, creditAvailableKobo: avail, creditAppliedKobo: applied,
    totalKobo: total, amountDueKobo: total - applied, problems: c.lines.filter((l) => l.problem),
  };
}

function adminProduct(p: Product): AdminProduct {
  const d = db();
  const meta = d.productMeta[p.id];
  const imgs = meta?.images ?? p.images;
  return {
    ...p,
    featured: p.featured ?? MOCK_FEATURED.has(p.slug),
    status: meta?.status ?? "LIVE",
    basePriceKobo: p.priceKobo,
    lowStockThreshold: 2,
    collectionIds: meta?.collectionIds ?? d.collections.filter((c) => p.collections.some((x) => x.slug === c.slug)).map((c) => c.id),
    seoTitle: null,
    seoDescription: null,
    imagesDetailed: imgs.map((i, k) => ({ id: `img_${k}`, url: i.url, alt: i.alt, colour: (i as { colour?: string | null }).colour ?? null })),
  };
}

function applyProductInput(input: AdminProductInput, existing?: Product): Product {
  const d = db();
  const sizes: (string | null)[] = input.sizes.length ? input.sizes : [null];
  const variants: Variant[] = [];
  input.colours.forEach((c) => {
    sizes.forEach((s) => {
      const prev = existing?.variants.find((v) => v.colour === c.name && v.size === s);
      variants.push(prev ?? {
        id: rid("var"), sku: `AP-${input.number}-${c.name.slice(0, 3).toUpperCase()}-${s ?? "OS"}`, colour: c.name, colourHex: c.hex, size: s,
        priceKobo: input.basePriceKobo, compareAtKobo: input.compareAtKobo ?? null, stock: 0, available: 0, imageUrls: [],
      });
    });
  });
  const cols = d.collections.filter((c) => input.collectionIds.includes(c.id)).map((c) => ({ slug: c.slug, name: c.name }));
  const id = existing?.id ?? rid("prd");
  const p: Product = {
    id, slug: input.slug || existing?.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), number: /^No\./i.test(input.number) ? input.number : `No. ${input.number}`, name: input.name,
    material: input.material || null, priceKobo: input.basePriceKobo, compareAtKobo: input.compareAtKobo ?? null,
    badge: input.compareAtKobo ? "SALE" : existing?.badge ?? "NEW", lowStockCount: null,
    images: input.images.map((i) => ({ url: i.url, alt: i.alt })), colours: input.colours, inStock: variants.some((v) => v.available > 0),
    description: input.description, details: input.details || null, care: input.care || null, sizeGuide: input.sizeGuide, exchangeable: input.exchangeable,
    options: { colours: input.colours, sizes: input.sizes }, variants, collections: cols, related: existing?.related ?? [], featured: input.featured ?? false,
    seo: { title: `${input.name} — Amerapelle`, description: input.description.slice(0, 150), ogImage: input.images[0]?.url ?? null },
  };
  d.productMeta[id] = { status: input.status, collectionIds: input.collectionIds, images: input.images };
  return p;
}

const EX_FLOW: Record<string, ExchangeStatus> = { approve: "APPROVED", decline: "DECLINED", receive: "CREDIT_ISSUED", complete: "COMPLETED" };

export type MockRequest = { method: string; path: string; query: URLSearchParams; body: unknown; cartToken: string | null; auth: boolean; admin: boolean };

/** Routes a contract request to the mock. Throws MockHttpError for non-2xx. */
export async function mockRoute(req: MockRequest): Promise<unknown> {
  const { method, path, query: q } = req;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const d = db();
  const seg = path.replace(/^\/+|\/+$/g, "").split("/");
  const is = (m: string, pattern: string) => {
    if (m !== method) return null;
    const ps = pattern.split("/");
    if (ps.length !== seg.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].startsWith(":")) params[ps[i].slice(1)] = decodeURIComponent(seg[i]);
      else if (ps[i] !== seg[i]) return null;
    }
    return params;
  };
  let m: Record<string, string> | null;
  const done = <T,>(v: T) => {
    save();
    return v;
  };

  // ---------- public ----------
  if (is("GET", "health")) return { ok: true };
  if (is("GET", "settings/public")) return d.settings;
  if (is("GET", "collections")) return d.collections;
  if ((m = is("GET", "collections/:slug"))) {
    const col = d.collections.find((c) => c.slug === m!.slug);
    if (!col) throw new MockHttpError(404, "Collection not found");
    const inCol = liveProducts().filter((p) => p.collections.some((c) => c.slug === col.slug));
    const sizes = Array.from(new Set(inCol.flatMap((p) => p.options.sizes)));
    const colours = Array.from(new Map(inCol.flatMap((p) => p.options.colours).map((c) => [c.name, c])).values());
    const prices = inCol.map((p) => p.priceKobo);
    return { collection: { ...col, count: inCol.length }, products: filterProducts(inCol, q), facets: { sizes, colours, priceRangeKobo: [prices.length ? Math.min(...prices) : 0, prices.length ? Math.max(...prices) : 0] } };
  }
  if (is("GET", "products")) return filterProducts(liveProducts(), q);
  if ((m = is("GET", "products/:slug"))) {
    const p = d.products.find((x) => x.slug === m!.slug);
    if (!p) throw new MockHttpError(404, "Product not found");
    return { ...p, featured: p.featured ?? MOCK_FEATURED.has(p.slug) };
  }
  if ((m = is("POST", "products/:slug/notify"))) {
    const p = d.products.find((x) => x.slug === m!.slug);
    if (!p) throw new MockHttpError(404, "Product not found");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email ?? "").trim())) throw new MockHttpError(400, "Enter a valid email address");
    if (!p.variants.some((v) => v.id === body.variantId)) throw new MockHttpError(400, "Unknown size for this product");
    return { ok: true };
  }
  if (is("GET", "search/suggest")) {
    const term = (q.get("q") || "").trim().toLowerCase();
    if (!term) return { products: [], collections: [] };
    return {
      products: liveProducts().filter((p) => fuzzy(`${p.name} ${p.material}`, term)).slice(0, 6).map(card),
      collections: d.collections.filter((c) => fuzzy(c.name, term)).slice(0, 3),
    };
  }
  if (is("GET", "delivery-zones")) return d.zones.filter((z) => z.active);
  if (is("GET", "locations/states")) return NG_STATES.map((name) => ({ name, lgas: NG_LGAS[name] }));
  if (is("GET", "faq")) {
    const groups = new Map<string, { id: string; question: string; answer: string }[]>();
    for (const f of d.faq) {
      if (!groups.has(f.group)) groups.set(f.group, []);
      groups.get(f.group)!.push({ id: f.id, question: f.question, answer: f.answer });
    }
    return Array.from(groups, ([group, items]) => ({ group, items }));
  }
  if ((m = is("GET", "pages/:slug"))) {
    const pg = d.pages[m.slug as keyof typeof d.pages];
    if (!pg) throw new MockHttpError(404, "Page not found");
    return pg;
  }
  if (is("POST", "contact")) {
    if (!body.email || !body.message) throw new MockHttpError(400, "Email and message are required");
    return { ok: true };
  }
  if (is("POST", "newsletter")) {
    if (!body.email) throw new MockHttpError(400, "Email is required");
    d.newsletter.push(String(body.email));
    return done({ ok: true });
  }
  if (is("POST", "drops/notify")) {
    if (!body.contact) throw new MockHttpError(400, "Enter an email or WhatsApp number");
    return { ok: true };
  }

  // ---------- cart ----------
  if (is("POST", "cart")) {
    const t = rid("ct");
    d.carts[t] = { lines: [], promo: null, userId: d.signedIn ? d.user?.id ?? null : null, utm: body.utm };
    return done(cartView(t));
  }
  if (is("GET", "cart")) return done(cartView(requireCart(req.cartToken)));
  if (is("POST", "cart/lines")) {
    const t = requireCart(req.cartToken);
    const f = findVariant(String(body.variantId));
    if (!f) throw new MockHttpError(404, "Variant not found");
    if (f.variant.available <= 0) throw new MockHttpError(400, "This size is sold out");
    const c = d.carts[t];
    const existing = c.lines.find((l) => l.variantId === f.variant.id);
    const qty = Number(body.quantity || 1);
    if (existing) existing.quantity = Math.min(f.variant.available, existing.quantity + qty);
    else c.lines.push({ id: rid("ln"), variantId: f.variant.id, quantity: Math.min(qty, f.variant.available) });
    return done(cartView(t));
  }
  if ((m = is("PATCH", "cart/lines/:id"))) {
    const t = requireCart(req.cartToken);
    const line = d.carts[t].lines.find((l) => l.id === m!.id);
    if (!line) throw new MockHttpError(404, "Line not found");
    if (body.variantId) {
      const f = findVariant(String(body.variantId));
      if (!f || f.variant.available <= 0) throw new MockHttpError(400, "That option is sold out");
      line.variantId = f.variant.id;
    }
    if (body.quantity != null) {
      const f = findVariant(line.variantId)!;
      line.quantity = Math.max(1, Math.min(Number(body.quantity), Math.max(1, f.variant.available)));
    }
    return done(cartView(t));
  }
  if ((m = is("DELETE", "cart/lines/:id"))) {
    const t = requireCart(req.cartToken);
    d.carts[t].lines = d.carts[t].lines.filter((l) => l.id !== m!.id);
    return done(cartView(t));
  }
  if (is("POST", "cart/promo")) {
    const t = requireCart(req.cartToken);
    const code = String(body.code || "").trim().toUpperCase();
    const disc = d.discounts.find((x) => x.code === code);
    if (!disc) throw new MockHttpError(400, "That code isn't valid");
    d.carts[t].promo = code;
    return done(cartView(t));
  }
  if (is("DELETE", "cart/promo")) {
    const t = requireCart(req.cartToken);
    d.carts[t].promo = null;
    return done(cartView(t));
  }
  if (is("POST", "cart/merge")) {
    requireAuth(req.auth);
    const t = requireCart(req.cartToken);
    return done(cartView(t));
  }

  // ---------- checkout ----------
  if (is("POST", "checkout/quote")) {
    const t = requireCart(req.cartToken);
    return quote(t, body.zoneCode as ZoneCode, Boolean(body.useCredit), req.auth && d.signedIn);
  }
  if (is("POST", "checkout")) {
    const t = requireCart(req.cartToken);
    const c = cartView(t);
    if (!c.lines.length) throw new MockHttpError(400, "Your bag is empty");
    const qt = quote(t, body.zoneCode as ZoneCode, Boolean(body.useCredit), req.auth && d.signedIn);
    if (qt.problems.some((p) => p.problem === "SOLD_OUT")) throw new MockHttpError(400, "Some pieces in your bag have sold out");
    const zone = d.zones.find((z) => z.code === body.zoneCode)!;
    const number = "AP-" + (10540 + d.orders.length);
    const reference = rid("ref");
    const byCredit = qt.amountDueKobo === 0;
    const provider = byCredit ? "CREDIT" : (body.provider as "PAYSTACK" | "BACHS");
    const order: AdminOrder = {
      id: rid("ord"), number, status: byCredit ? "PAID" : "PENDING_PAYMENT", email: String(body.email), phone: String(body.phone),
      items: c.lines.map((l) => ({ id: rid("oi"), name: l.name, number: l.number, colour: l.colour, size: l.size, unitKobo: l.unitKobo, quantity: l.quantity, imageUrl: l.imageUrl, exchangeable: true })),
      delivery: { zone: zone.code, name: zone.name, feeKobo: qt.deliveryKobo, address: (body.address as Address) ?? null },
      subtotalKobo: qt.subtotalKobo, discountKobo: qt.discountKobo, creditAppliedKobo: qt.creditAppliedKobo, deliveryKobo: qt.deliveryKobo,
      totalKobo: qt.totalKobo, amountDueKobo: qt.amountDueKobo,
      payment: { provider, reference, status: byCredit ? "SUCCEEDED" : "PENDING" },
      createdAt: new Date().toISOString(), paidAt: byCredit ? new Date().toISOString() : null, deliveredAt: null, exchangeableUntil: null,
      utmSource: (d.carts[t].utm as { source?: string } | undefined)?.source ?? "direct",
    };
    d.orders.unshift(order);
    if (qt.creditAppliedKobo && d.user) {
      d.user.creditBalanceKobo -= qt.creditAppliedKobo;
      d.credit.push({ id: rid("cr"), amountKobo: -qt.creditAppliedKobo, reason: "ORDER_PAYMENT", createdAt: new Date().toISOString(), expiresAt: null });
    }
    if (body.saveAddress && body.address && d.signedIn) d.addresses.push({ ...(body.address as Address), id: rid("adr") });
    d.carts[t].lines = [];
    d.carts[t].promo = null;
    // Mock "hosted page": straight back to our return URL.
    const authorizationUrl = byCredit ? null : `/checkout/complete?reference=${reference}&mock=1`;
    return done({ order, payment: { provider, authorizationUrl, reference } });
  }
  if (is("GET", "checkout/verify")) {
    const ref = q.get("reference");
    const o = d.orders.find((x) => x.payment?.reference === ref);
    if (!o) throw new MockHttpError(404, "We couldn't find that payment");
    if (o.status === "PENDING_PAYMENT") {
      o.status = "PAID";
      o.paidAt = new Date().toISOString();
      o.payment = { ...o.payment!, status: "SUCCEEDED" };
    }
    return done({ order: o });
  }

  // ---------- auth ----------
  if (is("POST", "auth/register")) {
    d.user = { id: "usr_ada", email: String(body.email), firstName: String(body.firstName || "Ada"), lastName: String(body.lastName || ""), phone: (body.phone as string) ?? null, emailVerified: false, creditBalanceKobo: d.user?.creditBalanceKobo ?? 0 };
    d.password = String(body.password);
    d.signedIn = true;
    return done({ accessToken: "mock_access", user: publicUser(d.user) });
  }
  if (is("POST", "auth/login")) {
    if (!body.email || !body.password) throw new MockHttpError(400, "Enter your email and password");
    if (String(body.password).length < 4) throw new MockHttpError(401, "Email or password is incorrect");
    d.signedIn = true;
    d.user = { ...d.user!, email: String(body.email) };
    return done({ accessToken: "mock_access", user: publicUser(d.user) });
  }
  // Any credential works in mocks; Google has verified the email, so the account is verified.
  if (is("POST", "auth/google")) {
    if (!body.credential) throw new MockHttpError(400, "credential should not be empty");
    d.signedIn = true;
    d.user = { ...d.user!, emailVerified: true };
    return done({ accessToken: "mock_access", user: publicUser(d.user) });
  }
  // Token "expired" / "invalid" simulate a bad link; anything else verifies the demo user (idempotent).
  if (is("POST", "auth/verify-email")) {
    const token = String(body.token ?? "");
    if (!token || token === "expired" || token === "invalid" || !d.user) throw new MockHttpError(400, "This link is invalid or has expired");
    d.user = { ...d.user, emailVerified: true };
    return done(publicUser(d.user));
  }
  if (is("POST", "auth/resend-verification")) {
    const u = requireAuth(req.auth);
    return { ok: true, sent: !isVerified(u) };
  }
  if (is("POST", "auth/refresh")) {
    if (!d.signedIn) throw new MockHttpError(401, "No session");
    return { accessToken: "mock_access" };
  }
  if (is("POST", "auth/logout")) {
    d.signedIn = false;
    return done({ ok: true });
  }
  if (is("POST", "auth/forgot-password")) return { ok: true };
  if (is("POST", "auth/reset-password")) {
    if (!body.token) throw new MockHttpError(400, "This reset link has expired");
    return { ok: true };
  }

  // ---------- account ----------
  if (is("GET", "me")) return publicUser(requireAuth(req.auth));
  if (is("PATCH", "me")) {
    const u = requireAuth(req.auth);
    d.user = { ...u, ...(body as Partial<User>) };
    return done(publicUser(d.user));
  }
  if (is("GET", "me/orders")) {
    const u = requireAuth(req.auth);
    if (!isVerified(u)) return []; // demo orders are all pre-account guest orders
    return d.orders.filter((o) => o.email === u.email || o.email === "ada@example.com");
  }
  if ((m = is("GET", "me/orders/:number"))) {
    requireAuth(req.auth);
    const o = d.orders.find((x) => x.number === m!.number);
    if (!o) throw new MockHttpError(404, "Order not found");
    return o;
  }
  if (is("GET", "me/addresses")) return requireAuth(req.auth) && d.addresses;
  if (is("POST", "me/addresses")) {
    requireAuth(req.auth);
    const a = { ...(body as unknown as Address), id: rid("adr") };
    d.addresses.push(a);
    return done(a);
  }
  if ((m = is("PATCH", "me/addresses/:id"))) {
    requireAuth(req.auth);
    const i = d.addresses.findIndex((a) => a.id === m!.id);
    if (i < 0) throw new MockHttpError(404, "Address not found");
    d.addresses[i] = { ...d.addresses[i], ...(body as unknown as Address), id: m.id };
    return done(d.addresses[i]);
  }
  if ((m = is("DELETE", "me/addresses/:id"))) {
    requireAuth(req.auth);
    d.addresses = d.addresses.filter((a) => a.id !== m!.id);
    return done(d.addresses);
  }
  if (is("GET", "me/wishlist")) {
    requireAuth(req.auth);
    return d.wishlist.map((id) => d.products.find((p) => p.id === id)).filter(Boolean).map((p) => card(p!));
  }
  if ((m = is("POST", "me/wishlist/:id"))) {
    requireAuth(req.auth);
    if (!d.wishlist.includes(m.id)) d.wishlist.push(m.id);
    return done(d.wishlist.map((id) => d.products.find((p) => p.id === id)).filter(Boolean).map((p) => card(p!)));
  }
  if ((m = is("DELETE", "me/wishlist/:id"))) {
    requireAuth(req.auth);
    d.wishlist = d.wishlist.filter((x) => x !== m!.id);
    return done(d.wishlist.map((id) => d.products.find((p) => p.id === id)).filter(Boolean).map((p) => card(p!)));
  }
  if (is("GET", "me/credit")) {
    const u = requireAuth(req.auth);
    return isVerified(u) ? { balanceKobo: u.creditBalanceKobo, entries: d.credit } : { balanceKobo: 0, entries: [] };
  }
  if (is("GET", "me/data-export")) {
    const u = requireAuth(req.auth);
    return { user: u, addresses: d.addresses, orders: d.orders, exchanges: d.exchanges, wishlist: d.wishlist, credit: d.credit };
  }
  if (is("DELETE", "me")) {
    requireAuth(req.auth);
    memo = freshDB();
    memo.user = null;
    return done({ ok: true });
  }
  if (is("POST", "orders/lookup")) {
    const o = d.orders.find((x) => x.number.toUpperCase() === String(body.number || "").trim().toUpperCase() && x.email.toLowerCase() === String(body.email || "").trim().toLowerCase());
    if (!o) throw new MockHttpError(404, "We couldn't find an order with that number and email");
    return o;
  }

  // ---------- exchanges ----------
  if (is("GET", "me/exchanges")) {
    if (!isVerified(requireAuth(req.auth))) return [];
    return d.exchanges;
  }
  if (is("POST", "exchanges")) {
    const o = d.orders.find((x) => x.number === body.orderNumber);
    if (!o) throw new MockHttpError(404, "Order not found");
    if (!o.exchangeableUntil || new Date(o.exchangeableUntil).getTime() < Date.now()) throw new MockHttpError(400, "This order is outside the exchange window");
    const items = (body.items as { orderItemId: string; quantity: number }[]).map((it) => {
      const oi = o.items.find((x) => x.id === it.orderItemId);
      if (!oi) throw new MockHttpError(400, "Item not found on this order");
      if (!oi.exchangeable) throw new MockHttpError(400, `${oi.name} can't be exchanged`);
      return { orderItemId: oi.id, name: oi.name, quantity: it.quantity, valueKobo: oi.unitKobo * it.quantity };
    });
    const ex: Exchange = {
      id: rid("exc"), number: "EX-" + d.seq++, orderNumber: o.number, status: "REQUESTED", reason: String(body.reason), note: (body.note as string) ?? null,
      photoUrls: (body.photoUrls as string[]) ?? [], items, creditKobo: items.reduce((s, i) => s + i.valueKobo, 0),
      history: [{ status: "REQUESTED", at: new Date().toISOString(), note: null }], createdAt: new Date().toISOString(),
    };
    d.exchanges.unshift(ex);
    o.status = "EXCHANGE_REQUESTED";
    return done(ex);
  }
  if (is("POST", "uploads/exchange-photo")) {
    const file = body instanceof FormData ? body.get("file") : null;
    const url = file && typeof window !== "undefined" && file instanceof Blob ? URL.createObjectURL(file) : "/placeholder-photo.svg";
    return { url };
  }

  // ---------- admin ----------
  if (seg[0] === "admin") {
    if (is("POST", "admin/auth/login")) {
      if (!body.email || !body.password) throw new MockHttpError(400, "Enter email and password");
      if (!d.adminTotpEnabled) return { requiresTotp: false, accessToken: "mock_admin", totpEnabled: false };
      d.adminTotpPending = true;
      return done({ requiresTotp: true, tempToken: "mock_temp" });
    }
    if (is("POST", "admin/auth/totp")) {
      if (!/^\d{6}$/.test(String(body.code || ""))) throw new MockHttpError(401, "That code didn't match");
      return { accessToken: "mock_admin" };
    }
    if (is("POST", "admin/auth/totp/enable")) {
      if (!/^\d{6}$/.test(String(body.code || ""))) throw new MockHttpError(400, "Incorrect code");
      d.adminTotpEnabled = true;
      return done({ ok: true });
    }
    if (is("POST", "admin/auth/totp/setup")) return { otpauthUrl: "otpauth://totp/Amerapelle:admin?secret=JBSWY3DPEHPK3PXP&issuer=Amerapelle", secret: "JBSWY3DPEHPK3PXP" };
    if (!req.admin) throw new MockHttpError(401, "Unauthorized");

    if (is("GET", "admin/dashboard")) {
      const today = d.orders.filter((o) => o.paidAt && Date.now() - new Date(o.paidAt).getTime() < DAY);
      const sources = new Map<string, number>();
      d.orders.forEach((o) => sources.set(o.utmSource || "direct", (sources.get(o.utmSource || "direct") || 0) + 1));
      const low: { sku: string; name: string; available: number }[] = [];
      d.products.forEach((p) => p.variants.forEach((v) => v.available <= 2 && low.push({ sku: v.sku, name: `${p.name} · ${[v.colour, v.size].filter(Boolean).join(" / ")}`, available: v.available })));
      return {
        todaySalesKobo: today.reduce((s, o) => s + o.totalKobo, 0),
        ordersToFulfil: d.orders.filter((o) => ["PAID", "PROCESSING"].includes(o.status)).length,
        pendingExchanges: d.exchanges.filter((e) => e.status === "REQUESTED").length,
        bestSellers: [{ name: "Cropped leather jacket", units: 31 }, { name: "Silk camp-collar shirt", units: 24 }, { name: "Satin slip dress", units: 19 }, { name: "Structured tote", units: 11 }, { name: "Leather mule", units: 9 }],
        lowStock: low.slice(0, 8),
        ordersBySource: Array.from(sources, ([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      };
    }
    if (is("GET", "admin/products")) {
      const term = (q.get("q") || "").toLowerCase();
      const status = q.get("status");
      const list = d.products
        .map((p) => ({ p, a: adminProduct(p) }))
        .filter(({ p, a }) => (!term || `${p.name} ${p.number}`.toLowerCase().includes(term)) && (!status || a.status === status))
        .map(({ p, a }) => ({ id: p.id, slug: p.slug, number: p.number, name: p.name, status: a.status, priceKobo: p.priceKobo, stock: p.variants.reduce((s, v) => s + v.stock, 0), available: p.variants.reduce((s, v) => s + v.available, 0), variantCount: p.variants.length, imageUrl: a.imagesDetailed[0]?.url || null, updatedAt: new Date(NOW).toISOString() }));
      const page = Number(q.get("page") || 1), pageSize = Number(q.get("pageSize") || 50);
      return { items: list.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: list.length };
    }
    if (is("POST", "admin/products")) {
      const p = applyProductInput(body as unknown as AdminProductInput);
      d.products.unshift(p);
      return done(adminProduct(p));
    }
    if ((m = is("GET", "admin/products/:id"))) {
      const p = d.products.find((x) => x.id === m!.id);
      if (!p) throw new MockHttpError(404, "Product not found");
      return adminProduct(p);
    }
    if ((m = is("PATCH", "admin/products/:id"))) {
      const i = d.products.findIndex((x) => x.id === m!.id);
      if (i < 0) throw new MockHttpError(404, "Product not found");
      const cur = adminProduct(d.products[i]);
      const base: AdminProductInput = { name: cur.name, slug: cur.slug, number: cur.number, description: cur.description, details: cur.details ?? "", care: cur.care ?? "", material: cur.material ?? "", sizeGuide: cur.sizeGuide, exchangeable: cur.exchangeable, status: cur.status, collectionIds: cur.collectionIds, colours: cur.options.colours, sizes: cur.options.sizes, basePriceKobo: cur.basePriceKobo, compareAtKobo: cur.compareAtKobo, images: cur.imagesDetailed };
      const merged = { ...base, ...(body as Partial<AdminProductInput>) } as AdminProductInput;
      d.products[i] = applyProductInput(merged, d.products[i]);
      return done(adminProduct(d.products[i]));
    }
    if ((m = is("DELETE", "admin/products/:id"))) {
      const p = d.products.find((x) => x.id === m!.id);
      if (!p) throw new MockHttpError(404, "Product not found");
      const a = adminProduct(p);
      d.productMeta[p.id] = { status: "ARCHIVED", collectionIds: a.collectionIds, images: a.images };
      return done({ ok: true });
    }
    if ((m = is("PATCH", "admin/variants/:id"))) {
      const f = findVariant(m.id);
      if (!f) throw new MockHttpError(404, "Variant not found");
      Object.assign(f.variant, body);
      if (body.stock != null) f.variant.available = Number(body.stock);
      f.product.inStock = f.product.variants.some((v) => v.available > 0);
      return done(f.variant);
    }
    if (is("GET", "admin/stock/export")) {
      const rows = ["sku,product,colour,size,stock"];
      d.products.forEach((p) => p.variants.forEach((v) => rows.push([v.sku, `"${p.name}"`, v.colour ?? "", v.size ?? "", v.stock].join(","))));
      return rows.join("\n");
    }
    if (is("POST", "admin/stock/import")) {
      const file = req.body instanceof FormData ? req.body.get("file") : null;
      const text = file instanceof Blob ? await file.text() : "";
      let updated = 0;
      const errors: { line: number; sku: string | null; message: string }[] = [];
      text.split(/\r?\n/).slice(1).filter(Boolean).forEach((line, i) => {
        const [sku, , , , stock] = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const v = d.products.flatMap((p) => p.variants).find((x) => x.sku === sku);
        if (!v || isNaN(Number(stock))) errors.push({ line: i + 2, sku: sku || null, message: v ? `Invalid stock "${stock}"` : "Unknown SKU" });
        else { v.stock = Number(stock); v.available = Number(stock); updated++; }
      });
      return done({ updated, errors });
    }
    if (is("POST", "admin/uploads/sign")) return { mode: "direct" };
    if (is("POST", "admin/uploads/image")) {
      const file = body instanceof FormData ? body.get("file") : null;
      const url = file && typeof window !== "undefined" && file instanceof Blob ? URL.createObjectURL(file) : "/placeholder/1600x1000/cecdcb/Upload.svg";
      return { url, width: null, height: null };
    }
    if (is("GET", "admin/collections")) return d.collections.map((c) => ({ ...c, productCount: c.count, exchangeable: true, sortOrder: 0 }));
    if ((m = is("GET", "admin/collections/:id"))) {
      const c = d.collections.find((x) => x.id === m!.id);
      if (!c) throw new MockHttpError(404, "Collection not found");
      return { ...c, productCount: c.count, exchangeable: true, sortOrder: 0 };
    }
    if (is("POST", "admin/collections")) {
      const c = { id: rid("col"), count: 0, description: null, isDrop: false, goLiveAt: null, heroImageUrl: null, homeOrder: null, tagline: null, ...(body as Partial<Collection>) } as Collection;
      d.collections.push(c);
      return done(c);
    }
    if ((m = is("PATCH", "admin/collections/:id"))) {
      const c = d.collections.find((x) => x.id === m!.id);
      if (!c) throw new MockHttpError(404, "Collection not found");
      Object.assign(c, body);
      return done(c);
    }
    if ((m = is("DELETE", "admin/collections/:id"))) {
      d.collections = d.collections.filter((x) => x.id !== m!.id);
      return done({ ok: true });
    }
    if (is("GET", "admin/orders")) {
      const status = q.get("status"), provider = q.get("provider"), term = (q.get("q") || "").toLowerCase();
      const list = d.orders.filter((o) => (!status || o.status === status) && (!provider || o.payment?.provider === provider) && (!term || `${o.number} ${o.email} ${o.delivery.address?.fullName ?? ""}`.toLowerCase().includes(term)));
      const page = Number(q.get("page") || 1), pageSize = 25;
      return { items: list.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: list.length };
    }
    const detail = (o: AdminOrder): AdminOrderDetail => ({
      ...o,
      userId: o.email === "ada@example.com" ? "usr_ada" : null,
      discountCode: null,
      marketingConsent: false,
      utm: { source: o.utmSource, medium: o.utmSource && o.utmSource !== "direct" ? "social" : null, campaign: null },
      notes: d.orderNotes[o.id] ?? [],
    });
    if ((m = is("GET", "admin/orders/:id"))) {
      const o = d.orders.find((x) => x.id === m!.id || x.number === m!.id);
      if (!o) throw new MockHttpError(404, "Order not found");
      return detail(o);
    }
    if ((m = is("PATCH", "admin/orders/:id"))) {
      const o = d.orders.find((x) => x.id === m!.id);
      if (!o) throw new MockHttpError(404, "Order not found");
      if (body.status) {
        o.status = body.status as OrderStatus;
        if (o.status === "DELIVERED") {
          o.deliveredAt = new Date().toISOString();
          o.exchangeableUntil = new Date(Date.now() + d.settings.exchangeWindowDays * DAY).toISOString();
        }
      }
      if (body.note) d.orderNotes[o.id] = [...(d.orderNotes[o.id] ?? []), { id: rid("note"), body: String(body.note), author: "admin@amerapelle.com", createdAt: new Date().toISOString() }];
      return done(detail(o));
    }
    if ((m = is("GET", "admin/orders/:id/packing-slip"))) return "<html><body>Packing slip</body></html>";
    const exchangeDetail = (e: Exchange): AdminExchangeDetail => {
      const o = d.orders.find((x) => x.number === e.orderNumber);
      const until = o?.deliveredAt ? new Date(o.deliveredAt).getTime() + d.settings.exchangeWindowDays * DAY : null;
      return {
        ...e,
        email: o?.email ?? "ada@example.com",
        orderId: o?.id ?? "",
        orderStatus: o?.status ?? "DELIVERED",
        customer: { name: o?.delivery.address?.fullName ?? null, email: o?.email ?? "ada@example.com", phone: o?.phone ?? null, userId: o?.email === "ada@example.com" ? "usr_ada" : null },
        items: e.items.map((i) => {
          const oi = o?.items.find((x) => x.id === i.orderItemId);
          const p = d.products.find((x) => x.name === i.name);
          return { ...i, number: oi?.number ?? null, sku: null, colour: oi?.colour ?? null, size: oi?.size ?? null, imageUrl: oi?.imageUrl ?? p?.images[0]?.url ?? null, paidUnitKobo: oi?.unitKobo ?? null };
        }),
        deliveredAt: o?.deliveredAt ?? null,
        exchangeWindowDays: d.settings.exchangeWindowDays,
        exchangeableUntil: until ? new Date(until).toISOString() : null,
        requestedWithinWindow: until !== null && new Date(e.createdAt).getTime() <= until,
        updatedAt: e.history[e.history.length - 1]?.at ?? e.createdAt,
      };
    };
    if ((m = is("GET", "admin/exchanges/:id"))) {
      const e = d.exchanges.find((x) => x.id === m!.id);
      if (!e) throw new MockHttpError(404, "Exchange not found");
      return exchangeDetail(e);
    }
    if (is("GET", "admin/exchanges")) {
      const status = q.get("status");
      return d.exchanges.filter((e) => !status || e.status === status).map((e) => ({ ...e, email: d.orders.find((o) => o.number === e.orderNumber)?.email ?? null }));
    }
    if ((m = is("POST", "admin/exchanges/:id/:action"))) {
      const e = d.exchanges.find((x) => x.id === m!.id);
      if (!e) throw new MockHttpError(404, "Exchange not found");
      const next = EX_FLOW[m.action];
      if (!next) throw new MockHttpError(400, "Unknown action");
      if (m.action === "decline" && !String(body.note ?? "").trim()) throw new MockHttpError(400, "Give the customer a reason for declining");
      if (m.action === "receive") {
        e.creditKobo = e.items.reduce((n, i) => n + i.valueKobo, 0);
        e.history.push({ status: "ITEM_RECEIVED", at: new Date().toISOString(), note: null });
        if (d.user) d.user.creditBalanceKobo += e.creditKobo;
        d.credit.push({ id: rid("cr"), amountKobo: e.creditKobo, reason: "EXCHANGE_CREDIT", createdAt: new Date().toISOString(), expiresAt: d.settings.creditExpiryDays ? new Date(Date.now() + d.settings.creditExpiryDays * DAY).toISOString() : null });
      }
      e.status = next;
      e.history.push({ status: next, at: new Date().toISOString(), note: (body.note as string) ?? null });
      if (next === "COMPLETED") {
        const o = d.orders.find((x) => x.number === e.orderNumber);
        if (o) o.status = "EXCHANGED";
      }
      return done(exchangeDetail(e));
    }
    if (is("GET", "admin/discounts")) return d.discounts;
    if ((m = is("GET", "admin/discounts/:id"))) {
      const x = d.discounts.find((y) => y.id === m!.id);
      if (!x) throw new MockHttpError(404, "Not found");
      return x;
    }
    if (is("POST", "admin/discounts")) {
      const x = { id: rid("dsc"), uses: 0, ...(body as Partial<Discount>) } as Discount;
      x.code = x.code.toUpperCase();
      d.discounts.push(x);
      return done(x);
    }
    if ((m = is("PATCH", "admin/discounts/:id"))) {
      const x = d.discounts.find((y) => y.id === m!.id);
      if (!x) throw new MockHttpError(404, "Not found");
      Object.assign(x, body);
      return done(x);
    }
    if ((m = is("DELETE", "admin/discounts/:id"))) {
      d.discounts = d.discounts.filter((y) => y.id !== m!.id);
      return done({ ok: true });
    }
    if (is("GET", "admin/delivery-zones")) return d.zones;
    if ((m = is("GET", "admin/delivery-zones/:id"))) {
      const z = d.zones.find((y) => y.id === m!.id);
      if (!z) throw new MockHttpError(404, "Not found");
      return z;
    }
    if ((m = is("PATCH", "admin/delivery-zones/:id"))) {
      const z = d.zones.find((y) => y.id === m!.id);
      if (!z) throw new MockHttpError(404, "Not found");
      Object.assign(z, body);
      return done(z);
    }
    if (is("GET", "admin/settings")) return d.settings;
    if (is("PATCH", "admin/settings")) {
      Object.assign(d.settings, body);
      return done(d.settings);
    }
    if (is("GET", "admin/faq")) return d.faq;
    if ((m = is("GET", "admin/faq/:id"))) {
      const f = d.faq.find((y) => y.id === m!.id);
      if (!f) throw new MockHttpError(404, "Not found");
      return f;
    }
    if (is("GET", "admin/pages")) return Object.values(d.pages);
    if (is("POST", "admin/faq")) {
      const f = { id: rid("faq"), ...(body as Omit<FaqItemAdmin, "id">) };
      d.faq.push(f);
      return done(f);
    }
    if ((m = is("PATCH", "admin/faq/:id"))) {
      const f = d.faq.find((y) => y.id === m!.id);
      if (!f) throw new MockHttpError(404, "Not found");
      Object.assign(f, body);
      return done(f);
    }
    if ((m = is("DELETE", "admin/faq/:id"))) {
      d.faq = d.faq.filter((y) => y.id !== m!.id);
      return done({ ok: true });
    }
    if ((m = is("GET", "admin/pages/:slug"))) {
      const pg = d.pages[m.slug as keyof typeof d.pages];
      if (!pg) throw new MockHttpError(404, "Not found");
      return pg;
    }
    if ((m = is("PATCH", "admin/pages/:slug"))) {
      const key = m.slug as keyof typeof d.pages;
      if (!d.pages[key]) throw new MockHttpError(404, "Not found");
      d.pages[key] = { ...d.pages[key], ...(body as object), updatedAt: new Date().toISOString() };
      return done(d.pages[key]);
    }
  }

  throw new MockHttpError(404, `Mock: no route for ${method} /${seg.join("/")}`);
}

/** Lets the mock "remember" a signed-in session across reloads (stands in for the ap_rt cookie). */
export function mockSignedIn() {
  return db().signedIn;
}
