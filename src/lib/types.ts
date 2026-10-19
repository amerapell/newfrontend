/**
 * Types mirroring docs/api-contract.md exactly. Money is always integer kobo.
 */

export type Money = number; // kobo

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number };

export type ApiErrorBody = { statusCode: number; message: string | string[]; error: string };

export type Colour = { name: string; hex: string };

export type Badge = "NEW" | "SALE" | "DROP" | "LOW_STOCK" | "SOLD_OUT";

/** scale: % of the frame the photo fills (100 / missing = edge to edge; lower = packshot sitting on the stage). */
export type ProductImage = { url: string; alt: string; scale?: number };

export type ProductCard = {
  id: string;
  slug: string;
  number: string; // "No. 014"
  name: string;
  material: string | null; // "Lamb leather · Outerwear"
  priceKobo: Money;
  compareAtKobo: Money | null;
  badge: Badge | null;
  lowStockCount: number | null;
  images: ProductImage[];
  colours: Colour[];
  inStock: boolean;
  /** Admin flag: shown as the wide featured piece in listing grids. */
  featured?: boolean;
};

export type Variant = {
  id: string;
  sku: string;
  colour: string | null;
  colourHex: string | null;
  size: string | null;
  priceKobo: Money;
  compareAtKobo: Money | null;
  stock: number;
  available: number;
  imageUrls: string[];
};

export type SizeGuideKind = "CLOTHING" | "SHOES" | "NONE";

export type Product = ProductCard & {
  description: string;
  details: string | null;
  care: string | null;
  sizeGuide: SizeGuideKind;
  exchangeable: boolean;
  options: { colours: Colour[]; sizes: string[] };
  variants: Variant[];
  collections: { slug: string; name: string }[];
  related: ProductCard[];
  seo: { title: string; description: string; ogImage: string | null };
};

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  count: number;
  isDrop: boolean;
  goLiveAt: string | null;
  /** Legacy v2 field — ignored by the v3 storefront. */
  heroPattern?: "ADIRE" | "ASOOKE" | null;
  /** Design v3 §8: home hero panel / mega-menu image. */
  heroImageUrl?: string | null;
  /** Design v3 §8: home hero panel order (ascending); null = not on the home page. */
  homeOrder?: number | null;
  /** Design v3 §8: hero link label override (default "Discover the collection"). */
  tagline?: string | null;
};

export type SortKey = "newest" | "price_asc" | "price_desc";

export type ProductFilters = {
  page?: number;
  pageSize?: number;
  size?: string;
  colour?: string;
  minKobo?: number;
  maxKobo?: number;
  inStock?: boolean;
  sort?: SortKey;
  q?: string;
};

export type Facets = { sizes: string[]; colours: Colour[]; priceRangeKobo: [number, number] };

export type CollectionPage = { collection: Collection; products: Paginated<ProductCard>; facets: Facets };

export type SearchSuggest = { products: ProductCard[]; collections: Collection[] };

export type CartLineProblem = "SOLD_OUT" | "LOW_STOCK";

export type CartLine = {
  id: string;
  variantId: string;
  productSlug: string;
  number: string;
  name: string;
  colour: string | null;
  size: string | null;
  material: string | null;
  imageUrl: string | null;
  unitKobo: Money;
  quantity: number;
  lineKobo: Money;
  available: number;
  problem: CartLineProblem | null;
};

export type Cart = {
  id: string;
  token: string;
  lines: CartLine[];
  itemCount: number;
  subtotalKobo: Money;
  discountKobo: Money;
  promoCode: string | null;
  freeDeliveryThresholdKobo: Money | null;
};

/** Nigerian zones, store pickup, and DHL Express regions for delivery abroad (INTL_*). */
export type ZoneCode = "LAGOS_ISLAND" | "LAGOS_MAINLAND" | "LEKKI_AJAH" | "OTHER_STATES" | "PICKUP" | "INTL_AFRICA" | "INTL_EUROPE" | "INTL_AMERICAS" | "INTL_WORLD";

export type DeliveryZone = { id: string; code: ZoneCode; name: string; etaText: string; feeKobo: Money; active: boolean };

export type Address = {
  id?: string;
  fullName: string;
  phone: string;
  state: string;
  lga: string;
  area: string;
  street: string;
  landmark: string;
  note?: string | null;
  /** ISO 3166-1 alpha-2; missing/"NG" = Nigeria. Abroad: state = state/region, lga = town/city, area = district. */
  country?: string;
  postcode?: string;
};

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED"
  | "EXCHANGE_REQUESTED"
  | "EXCHANGED";

export type PaymentProviderCode = "PAYSTACK" | "BACHS";

export type OrderItem = {
  id: string;
  name: string;
  number: string;
  colour: string | null;
  size: string | null;
  unitKobo: Money;
  quantity: number;
  imageUrl: string | null;
  exchangeable: boolean;
};

export type Order = {
  id: string;
  number: string; // "AP-10511"
  status: OrderStatus;
  email: string;
  phone: string;
  items: OrderItem[];
  delivery: { zone: ZoneCode; name: string; feeKobo: Money; address: Address | null };
  subtotalKobo: Money;
  discountKobo: Money;
  creditAppliedKobo: Money;
  deliveryKobo: Money;
  totalKobo: Money;
  amountDueKobo: Money;
  payment: {
    provider: PaymentProviderCode | "CREDIT" | null;
    reference: string | null;
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  } | null;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  exchangeableUntil: string | null;
};

export type ExchangeStatus = "REQUESTED" | "APPROVED" | "ITEM_RECEIVED" | "CREDIT_ISSUED" | "COMPLETED" | "DECLINED";

export type Exchange = {
  id: string;
  number: string; // "EX-2031"
  orderNumber: string;
  status: ExchangeStatus;
  reason: string;
  note: string | null;
  photoUrls: string[];
  items: { orderItemId: string; name: string; quantity: number; valueKobo: Money }[];
  creditKobo: Money;
  history: { status: ExchangeStatus; at: string; note: string | null }[];
  createdAt: string;
};

export type DropSettings = {
  title: string;
  collectionSlug: string;
  goLiveAt: string | null;
  firstRunTotal: number;
  firstRunLeft: number;
};

export type StoreSettings = {
  storeName: string;
  pickupAddress: string;
  openingHours: string;
  whatsappNumber: string;
  instagramUrl: string;
  tiktokUrl: string;
  contactEmail: string;
  contactPhone: string;
  paystackEnabled: boolean;
  bachsEnabled: boolean;
  exchangeWindowDays: number;
  creditExpiryDays: number | null;
  freeDeliveryThresholdKobo: Money | null;
  tickerText: string[];
  /** Home "Amerapelle at your service" card photos; null → plain ground with the icon. */
  serviceImages?: ServiceImages;
  /** First-visit "Welcome to Amerapelle" newsletter pop-up. */
  welcomePopup?: WelcomePopup;
  /** Home page photo panels: opening image (slow zoom), slideshow, still image. */
  homeMedia?: HomeMedia;
  drop: DropSettings | null;
};

/** focus = which part of a wide photo stays in view on a narrow phone screen. */
export type HomeImageFocus = "left" | "center" | "right";
export type HomeImage = { url: string; focus: HomeImageFocus };
export type HomePanel = { images: HomeImage[]; title: string; linkLabel: string; href: string };
export type HomeMedia = { hero: HomePanel; slides: HomePanel; still: HomePanel };

export type FaqGroup = { group: string; items: { id: string; question: string; answer: string }[] };

export type ContentPage = { slug: string; title: string; bodyMarkdown: string; updatedAt: string };

export type Utm = { source?: string; medium?: string; campaign?: string };

export type CheckoutQuote = {
  subtotalKobo: Money;
  discountKobo: Money;
  deliveryKobo: Money;
  creditAvailableKobo: Money;
  creditAppliedKobo: Money;
  totalKobo: Money;
  amountDueKobo: Money;
  problems: CartLine[];
};

export type CheckoutRequest = {
  email: string;
  phone: string;
  zoneCode: ZoneCode;
  address: Address | null;
  provider: PaymentProviderCode;
  useCredit: boolean;
  marketingConsent: boolean;
  saveAddress?: boolean;
};

export type CheckoutResponse = {
  order: Order;
  payment: { provider: PaymentProviderCode | "CREDIT"; authorizationUrl: string | null; reference: string };
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  /** False until the customer confirms their email; credit and past guest orders stay hidden (credit reads 0). */
  emailVerified: boolean;
  creditBalanceKobo: Money;
};

export type AuthResponse = { accessToken: string; user: User };

export type CreditReason = "EXCHANGE_CREDIT" | "ORDER_PAYMENT" | "ORDER_CANCELLED_REFUND_TO_CREDIT" | "ORDER_PAYMENT_REAPPLIED";

export type CreditLedger = {
  balanceKobo: Money;
  entries: { id: string; amountKobo: Money; reason: CreditReason | string; createdAt: string; expiresAt: string | null }[];
};

/** GET /locations/states */
export type NgState = { name: string; lgas: string[] };

export type ExchangeRequest = {
  orderNumber: string;
  email?: string;
  items: { orderItemId: string; quantity: number }[];
  reason: string;
  note?: string;
  photoUrls?: string[];
};

/* ---------------- Admin ---------------- */

export type ProductStatus = "DRAFT" | "LIVE" | "ARCHIVED";

export type AdminProductInput = {
  name: string;
  slug?: string;
  number: string;
  description: string;
  details: string;
  care: string;
  material: string;
  sizeGuide: SizeGuideKind;
  exchangeable: boolean;
  featured?: boolean;
  status: ProductStatus;
  collectionIds: string[];
  colours: Colour[];
  sizes: string[];
  basePriceKobo: Money;
  compareAtKobo?: Money | null;
  images: { url: string; alt: string; colour?: string | null; scale?: number }[];
};

/** GET /admin/products/:id — the public Product shape plus admin fields. */
export type AdminProduct = Product & {
  status: ProductStatus;
  basePriceKobo: Money;
  lowStockThreshold: number | null;
  collectionIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  imagesDetailed: { id: string; url: string; alt: string; colour: string | null; scale?: number }[];
};

export type AdminProductListItem = {
  id: string;
  slug: string;
  number: string;
  name: string;
  status: ProductStatus;
  priceKobo: Money;
  stock: number;
  available: number;
  variantCount: number;
  imageUrl: string | null;
  updatedAt: string;
};

export type AdminDashboard = {
  todaySalesKobo: Money;
  ordersToFulfil: number;
  pendingExchanges: number;
  bestSellers: { name: string; units: number }[];
  lowStock: { sku: string; name: string; available: number }[];
  ordersBySource: { source: string; count: number }[];
};

/** GET /admin/orders list item */
export type AdminOrder = Order & { utmSource: string | null };

/** GET /admin/customers — registered accounts and guest checkout emails, merged by lowercased email. */
export type AdminCustomer = {
  email: string;
  userId: string | null;
  name: string;
  phone: string | null;
  registered: boolean;
  verified: boolean;
  joinedAt: string | null;
  /** Paid orders only. */
  orders: number;
  totalSpentKobo: Money;
  lastOrderAt: string | null;
  creditBalanceKobo: Money;
};
export type AdminCustomerSort = "recent" | "spent" | "orders";

/** GET /admin/customers/:email */
export type AdminCustomerDetail = AdminCustomer & {
  orderList: { id: string; number: string; createdAt: string; paidAt: string | null; status: OrderStatus; provider: PaymentProviderCode | "CREDIT" | null; totalKobo: Money; itemCount: number }[];
  addresses: Address[];
  credit: { id: string; amountKobo: Money; reason: string; orderId: string | null; exchangeId: string | null; createdAt: string; expiresAt: string | null }[];
};

/** GET/PATCH /admin/orders/:id */
export type AdminOrderDetail = Order & {
  userId: string | null;
  discountCode: string | null;
  marketingConsent: boolean;
  utm: { source: string | null; medium: string | null; campaign: string | null };
  notes: { id: string; body: string; author: string | null; createdAt: string }[];
};

export type AdminExchange = Exchange & { email?: string | null };

/** GET /admin/exchanges/:id (and every admin exchange action's response). */
export type AdminExchangeDetail = Omit<AdminExchange, "items"> & {
  email: string;
  orderId: string;
  orderStatus: OrderStatus;
  customer: { name: string | null; email: string; phone: string | null; userId: string | null };
  items: {
    orderItemId: string;
    name: string;
    quantity: number;
    valueKobo: Money;
    number: string | null;
    sku: string | null;
    colour: string | null;
    size: string | null;
    imageUrl: string | null;
    paidUnitKobo: Money | null;
  }[];
  deliveredAt: string | null;
  exchangeWindowDays: number;
  exchangeableUntil: string | null;
  requestedWithinWindow: boolean;
  updatedAt: string;
};

export type DiscountType = "PERCENT" | "FIXED" | "FREE_DELIVERY";

export type Discount = {
  id: string;
  active?: boolean;
  code: string;
  type: DiscountType;
  value: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
  minSubtotalKobo?: Money | null;
  uses?: number;
};

export type AdminCollection = Collection & { productCount: number; exchangeable: boolean; sortOrder: number };

export type FaqItemAdmin = { id: string; group: string; question: string; answer: string; sortOrder?: number };

export type AdminLoginResponse = { requiresTotp: true; tempToken: string } | { requiresTotp: false; accessToken: string; totpEnabled: false };

export type CloudinarySignature = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };

export interface ServiceImages {
  stylist: string | null;
  store: string | null;
  exchange: string | null;
}

export interface WelcomePopup {
  enabled: boolean;
  title: string;
  text: string;
  imageUrl: string | null;
}
