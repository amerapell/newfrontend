/**
 * Mock dataset — products, collections and settings for the v3 storefront (docs/design-v3.md).
 * Images are neutral local placeholders (src/app/placeholder) — never brand photography.
 * Used ONLY when NEXT_PUBLIC_USE_MOCKS=true, or in development when the API is unreachable.
 */
import type {
  Collection,
  DeliveryZone,
  FaqGroup,
  ContentPage,
  Product,
  ProductCard,
  StoreSettings,
  Variant,
  Colour,
  SizeGuideKind,
  Badge,
} from "../types";
import { placeholderUrl } from "../placeholder";
import { iconKind } from "../product";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** Anchor all relative mock dates to module load so countdowns look like the designs. */
const NOW = Date.now();

export const C = {
  Black: { name: "Black", hex: "#16161a" },
  Tan: { name: "Tan", hex: "#b07a4a" },
  Burgundy: { name: "Burgundy", hex: "#6b1f2a" },
  Ivory: { name: "Ivory", hex: "#f3efe6" },
  Navy: { name: "Navy", hex: "#0b1c4f" },
  Indigo: { name: "Indigo", hex: "#1e3172" },
  Gold: { name: "Gold", hex: "#c9a64a" },
} satisfies Record<string, Colour>;

type Seed = {
  n: string;
  slug: string;
  name: string;
  price: number; // naira
  was?: number;
  material: string;
  badge?: Badge | null;
  colours: Colour[];
  sizes: string[];
  guide: SizeGuideKind;
  cols: string[];
  soldOut?: string[]; // sizes sold out (all colours)
  low?: Record<string, number>; // size → available
  allSoldOut?: boolean;
  exchangeable?: boolean;
  details?: string;
  care?: string;
  description?: string;
  imageAlts?: string[];
  /** How many mock images to generate (default 4). */
  images?: number;
};

export const COLLECTION_NAMES: Record<string, string> = {
  women: "Women",
  men: "Men",
  "bags-accessories": "Bags & Accessories",
  shoes: "Shoes",
  "new-in": "New In",
  sale: "Sale",
  "night-edit": "Drop 04",
  "harmattan-edit": "Drop 05",
};

const CLOTHING = ["XS", "S", "M", "L", "XL"];
const SHOES = ["37", "38", "39", "40", "41"];
const MENS = ["S", "M", "L", "XL"];

const seeds: Seed[] = [
  { n: "014", slug: "cropped-leather-jacket", name: "Cropped leather jacket", price: 185000, material: "Lamb leather · Outerwear", badge: "NEW", colours: [C.Black, C.Tan, C.Burgundy], sizes: CLOTHING, guide: "CLOTHING", cols: ["women", "new-in"], soldOut: ["XL"], low: { L: 2 },
    details: "Boxy cropped shape, dropped shoulder, two-way zip, Adire-print silk lining.", care: "Lamb leather, silk lining. Specialist leather clean only. Store on a wide hanger away from direct sun.", description: "A cropped jacket in buttery lamb leather, cut boxy through the body and lined in Adire-print silk dyed in Abeokuta.", imageAlts: ["Front", "Worn", "Detail", "Lining"] },
  { n: "022", slug: "silk-camp-collar-shirt", name: "Silk camp-collar shirt", price: 62500, was: 78000, material: "Mulberry silk · Shirts", badge: "SALE", colours: [C.Ivory, C.Navy], sizes: MENS, guide: "CLOTHING", cols: ["men", "sale", "new-in"],
    details: "Relaxed camp collar, straight hem, mother-of-pearl buttons.", care: "100% mulberry silk. Dry clean or cool hand wash. Iron on the reverse.", description: "A fluid camp-collar shirt in heavy mulberry silk. Wear it open over a vest or buttoned to the top." },
  { n: "031", slug: "structured-tote", name: "Structured tote", price: 240000, material: "Calf leather · Bags", badge: "LOW_STOCK", colours: [C.Tan], sizes: [], guide: "NONE", cols: ["bags-accessories", "new-in"], low: { _: 2 },
    details: "Rigid base, two top handles, magnetic closure, interior zip pocket. 38 × 28 × 14 cm.", care: "Full-grain calf leather. Wipe with a dry cloth; condition twice a year.", description: "A structured day tote in full-grain calf leather that holds its shape from boardroom to dinner." },
  { n: "040", slug: "satin-slip-dress", name: "Satin slip dress", price: 120000, material: "Silk satin · Dresses", badge: "DROP", colours: [C.Navy, C.Black], sizes: CLOTHING, guide: "CLOTHING", cols: ["women", "new-in", "night-edit"],
    details: "Bias cut, adjustable straps, cowl neck, midi length.", care: "Silk satin. Dry clean only.", description: "Cut on the bias so it moves with you — the slip dress of the Night Edit." },
  { n: "043", slug: "tailored-linen-blazer", name: "Tailored linen blazer", price: 150000, material: "Irish linen · Tailoring", colours: [C.Ivory, C.Black], sizes: CLOTHING, guide: "CLOTHING", cols: ["harmattan-edit", "women", "men"],
    details: "Single-breasted, half-canvassed, patch pockets.", care: "Irish linen. Dry clean. Steam to relax creases." },
  { n: "047", slug: "leather-mule", name: "Leather mule", price: 88000, material: "Nappa · Shoes", badge: "NEW", colours: [C.Black, C.Tan], sizes: SHOES, guide: "SHOES", cols: ["shoes", "women", "new-in"],
    details: "Square toe, 4 cm stacked heel, leather sole.", care: "Nappa leather. Wipe clean; use shoe trees." },
  { n: "051", slug: "pleated-wide-leg-trouser", name: "Pleated wide-leg trouser", price: 95000, material: "Wool crepe · Trousers", colours: [C.Navy, C.Black], sizes: CLOTHING, guide: "CLOTHING", cols: ["harmattan-edit", "women"],
    details: "High rise, double front pleat, pressed crease, side pockets.", care: "Wool crepe. Dry clean." },
  { n: "055", slug: "ribbed-knit-top", name: "Ribbed knit top", price: 45000, material: "Merino · Knitwear", colours: [C.Ivory, C.Burgundy, C.Black], sizes: CLOTHING, guide: "CLOTHING", cols: ["harmattan-edit", "women"],
    details: "Fine rib, crew neck, slim fit.", care: "Extra-fine merino. Hand wash cold, dry flat." },
  { n: "058", slug: "quilted-shoulder-bag", name: "Quilted shoulder bag", price: 175000, material: "Lamb leather · Bags", badge: "SOLD_OUT", colours: [C.Black], sizes: [], guide: "NONE", cols: ["bags-accessories", "women"], allSoldOut: true,
    details: "Diamond quilting, chain-and-leather strap, flap closure.", care: "Lamb leather. Store stuffed in its dust bag." },
  { n: "060", slug: "high-waist-denim", name: "High-waist denim", price: 70000, was: 85000, material: "Japanese denim · Trousers", badge: "SALE", colours: [C.Indigo], sizes: CLOTHING, guide: "CLOTHING", cols: ["women", "sale"],
    details: "High rise, straight leg, raw hem.", care: "Japanese selvedge denim. Wash inside out, cold." },
  { n: "063", slug: "draped-midi-skirt", name: "Draped midi skirt", price: 78000, material: "Silk crepe · Skirts", colours: [C.Navy], sizes: CLOTHING, guide: "CLOTHING", cols: ["harmattan-edit", "women"],
    details: "Wrap drape, concealed side zip, midi length.", care: "Silk crepe. Dry clean only." },
  { n: "066", slug: "block-heel-sandal", name: "Block-heel sandal", price: 92000, material: "Calf leather · Shoes", badge: "LOW_STOCK", colours: [C.Black], sizes: SHOES, guide: "SHOES", cols: ["shoes", "women"], low: { "39": 2 },
    details: "Two straps, 7 cm block heel, padded insole.", care: "Calf leather. Wipe clean." },
  { n: "035", slug: "gold-tone-hoop-set", name: "Gold-tone hoop set", price: 35000, material: "Gold vermeil · Jewellery", colours: [C.Gold], sizes: [], guide: "NONE", cols: ["bags-accessories"], exchangeable: false, images: 1,
    details: "Set of three hoops: 15, 22 and 30 mm.", care: "Gold vermeil on sterling silver. Keep dry." },
  { n: "071", slug: "velvet-blazer", name: "Velvet blazer", price: 210000, material: "Silk velvet · Tailoring", badge: "DROP", colours: [C.Navy, C.Black], sizes: CLOTHING, guide: "CLOTHING", cols: ["night-edit", "women"], low: { M: 2 },
    details: "Peak lapel, single button, satin-piped pockets.", care: "Silk velvet. Dry clean only; steam, never iron." },
  { n: "072", slug: "silk-evening-shirt", name: "Silk evening shirt", price: 85000, material: "Silk satin · Shirts", badge: "DROP", colours: [C.Black, C.Ivory], sizes: MENS, guide: "CLOTHING", cols: ["night-edit", "men"],
    details: "Concealed placket, French cuffs.", care: "Silk satin. Dry clean only." },
  { n: "073", slug: "leather-clutch", name: "Leather clutch", price: 140000, material: "Box calf · Bags", badge: "DROP", colours: [C.Black, C.Burgundy], sizes: [], guide: "NONE", cols: ["night-edit", "bags-accessories"],
    details: "Envelope flap, detachable wrist strap. 28 × 16 cm.", care: "Box calf. Wipe with a dry cloth." },
  { n: "074", slug: "satin-wide-leg-trouser", name: "Satin wide-leg trouser", price: 98000, material: "Duchess satin · Trousers", badge: "DROP", colours: [C.Navy], sizes: CLOTHING, guide: "CLOTHING", cols: ["night-edit", "women"],
    details: "High rise, side stripe, wide leg.", care: "Duchess satin. Dry clean only." },
  { n: "080", slug: "merino-roll-neck", name: "Merino roll-neck", price: 72000, material: "Merino · Knitwear", colours: [C.Black, C.Navy], sizes: MENS, guide: "CLOTHING", cols: ["men"], images: 1,
    details: "Fine gauge, double-layer roll neck.", care: "Hand wash cold, dry flat." },
  { n: "083", slug: "double-pleat-trouser", name: "Double-pleat trouser", price: 98000, material: "Wool twill · Tailoring", colours: [C.Navy, C.Black], sizes: MENS, guide: "CLOTHING", cols: ["men"],
    details: "Double forward pleat, side adjusters, turn-ups.", care: "Wool twill. Dry clean." },
  { n: "086", slug: "suede-loafer", name: "Suede loafer", price: 115000, material: "Calf suede · Shoes", badge: "NEW", colours: [C.Tan, C.Black], sizes: ["40", "41", "42", "43", "44"], guide: "SHOES", cols: ["shoes", "men", "new-in"],
    details: "Unlined, hand-sewn apron, leather sole.", care: "Brush with a suede brush; use a protector spray." },
];

function stockFor(seed: Seed, size: string | null, colourIdx: number): number {
  if (seed.allSoldOut) return 0;
  const key = size ?? "_";
  if (seed.soldOut?.includes(key)) return 0;
  if (seed.low && key in seed.low) return colourIdx === 0 ? seed.low[key] : seed.low[key] + 3;
  return 6 + ((seed.n.charCodeAt(2) + colourIdx * 3 + (size?.length ?? 0)) % 7);
}

function buildVariants(seed: Seed): Variant[] {
  const sizes: (string | null)[] = seed.sizes.length ? seed.sizes : [null];
  const out: Variant[] = [];
  seed.colours.forEach((c, ci) => {
    sizes.forEach((s) => {
      const stock = stockFor(seed, s, ci);
      out.push({
        id: `var_${seed.n}_${ci}_${s ?? "os"}`,
        sku: `AP-${seed.n}-${c.name.slice(0, 3).toUpperCase()}-${s ?? "OS"}`,
        colour: c.name,
        colourHex: c.hex,
        size: s,
        priceKobo: seed.price * 100,
        compareAtKobo: seed.was ? seed.was * 100 : null,
        stock,
        available: stock,
        imageUrls: [],
      });
    });
  });
  return out;
}

/** Image 1 = packshot on the stage ground; image 2 = worn / detail shot; then details. */
function mockImages(seed: Seed): { url: string; alt: string }[] {
  const kind = iconKind({ material: seed.material, name: seed.name });
  const alts = seed.imageAlts ?? ["Front", "Worn", "Detail", "Back"];
  const count = seed.images ?? alts.length;
  return alts.slice(0, count).map((alt, i) => ({
    url: i === 1 ? placeholderUrl(800, 1000, "cecdcb", `${seed.name} — worn`, "figure") : placeholderUrl(800, 1000, i === 0 ? "edece8" : "e3e2de", i === 0 ? seed.name : `${seed.name} — ${alt.toLowerCase()}`, kind),
    alt: i === 0 ? seed.name : `${seed.name} — ${alt.toLowerCase()}`,
  }));
}

function toCard(seed: Seed, variants: Variant[]): ProductCard {
  const total = variants.reduce((s, v) => s + v.available, 0);
  const minLow = seed.low ? Math.min(...Object.values(seed.low)) : null;
  return {
    id: `prd_${seed.n}`,
    slug: seed.slug,
    number: `No. ${seed.n}`,
    name: seed.name,
    material: seed.material,
    priceKobo: seed.price * 100,
    compareAtKobo: seed.was ? seed.was * 100 : null,
    badge: seed.allSoldOut ? "SOLD_OUT" : seed.badge ?? null,
    lowStockCount: seed.badge === "LOW_STOCK" ? minLow : null,
    images: mockImages(seed),
    colours: seed.colours,
    inStock: total > 0,
  };
}

export const MOCK_PRODUCTS: Product[] = seeds.map((seed, i) => {
  const variants = buildVariants(seed);
  const card = toCard(seed, variants);
  return {
    ...card,
    description: seed.description ?? `${seed.name} — ${seed.material.split(" · ")[0].toLowerCase()}, cut in Lagos in a limited run.`,
    details: seed.details ?? null,
    care: seed.care ?? null,
    sizeGuide: seed.guide,
    exchangeable: seed.exchangeable ?? true,
    options: { colours: seed.colours, sizes: seed.sizes },
    variants,
    collections: seed.cols.map((slug) => ({ slug, name: COLLECTION_NAMES[slug] ?? slug })),
    related: [],
    seo: { title: `${seed.name} — Amerapelle`, description: `${seed.name} in ${seed.material.split(" · ")[0].toLowerCase()}. ₦${seed.price.toLocaleString("en-NG")}.`, ogImage: null },
    _order: i,
  } as Product & { _order: number };
});


// Related: same-collection pieces + a cross-category "complete the look"
const LOOKS: Record<string, string[]> = {
  "cropped-leather-jacket": ["silk-camp-collar-shirt", "pleated-wide-leg-trouser", "leather-mule", "structured-tote"],
  "satin-slip-dress": ["velvet-blazer", "leather-clutch", "block-heel-sandal", "gold-tone-hoop-set"],
};
for (const p of MOCK_PRODUCTS) {
  const look = LOOKS[p.slug];
  const pool = look
    ? look.map((s) => MOCK_PRODUCTS.find((x) => x.slug === s)!).filter(Boolean)
    : MOCK_PRODUCTS.filter((x) => x.slug !== p.slug && x.collections.some((c) => p.collections.some((d) => d.slug === c.slug))).slice(0, 4);
  p.related = pool.map(stripToCard);
}

export function stripToCard(p: Product): ProductCard {
  const { id, slug, number, name, material, priceKobo, compareAtKobo, badge, lowStockCount, images, colours, inStock } = p;
  return { id, slug, number, name, material, priceKobo, compareAtKobo, badge, lowStockCount, images, colours, inStock };
}



const DESCRIPTIONS: Record<string, string> = {
  women: "Tailoring, silk and leather for evenings in Lagos. Every piece is a limited run; when it's gone, it's gone.",
  men: "Tailoring, knitwear and leather, cut for heat and for evenings that run late.",
  "bags-accessories": "Structured leather, hand-finished hardware and a little gold.",
  shoes: "Mules, sandals and loafers in nappa, calf and suede.",
  "new-in": "This week's arrivals across the store.",
  sale: "Last pieces from past runs, marked down once.",
  "night-edit": "Twelve pieces for after dark. Velvet, satin and box calf in navy and ink.",
  "harmattan-edit": "The Harmattan Edit. Dry-season layers in undyed cotton and indigo.",
};

/** First run ends 48h after go-live; anchor so the hero clock reads ~02:14:37 like the design. */
export const FIRST_RUN_HOURS = 48;
const DROP_LIVE_AT = new Date(NOW - (FIRST_RUN_HOURS * HOUR - (2 * HOUR + 14 * 60_000 + 37_000))).toISOString();
const NEXT_DROP_AT = new Date(NOW + 2 * HOUR + 14 * 60_000 + 37_000).toISOString();

/** Design v3 §8: home hero panels — drop first, then homeOrder 1..4. Shoes has no image (placeholder ground). */
const HOME_ORDER: Record<string, number> = { "night-edit": 0, women: 1, men: 2, "bags-accessories": 3, shoes: 4 };
const HERO: Record<string, string> = {
  "night-edit": placeholderUrl(1600, 1000, "2b2722", "Drop 04 — The Night Edit", "figure"),
  "harmattan-edit": placeholderUrl(1600, 1000, "cecdcb", "Drop 05", "figure"),
  women: placeholderUrl(1600, 1000, "6f6a63", "Women", "figure"),
  men: placeholderUrl(1600, 1000, "4a4540", "Men", "figure"),
  "bags-accessories": placeholderUrl(1600, 1000, "8a837a", "Bags & Accessories", "bag"),
  "new-in": placeholderUrl(1600, 1000, "5c5650", "New In", "figure"),
};

export const MOCK_COLLECTIONS: Collection[] = Object.keys(COLLECTION_NAMES).map((slug, i) => ({
  id: `col_${i + 1}`,
  slug,
  name: COLLECTION_NAMES[slug],
  description: DESCRIPTIONS[slug] ?? null,
  count: MOCK_PRODUCTS.filter((p) => p.collections.some((c) => c.slug === slug)).length,
  isDrop: slug === "night-edit" || slug === "harmattan-edit",
  goLiveAt: slug === "night-edit" ? DROP_LIVE_AT : slug === "harmattan-edit" ? NEXT_DROP_AT : null,
  heroImageUrl: HERO[slug] ?? null,
  homeOrder: HOME_ORDER[slug] ?? null,
  tagline: slug === "night-edit" ? "Discover the drop" : null,
}));


export const MOCK_SETTINGS: StoreSettings = {
  storeName: "Amerapelle",
  pickupAddress: "14 Admiralty Way, Lekki Phase 1, Lagos",
  openingHours: "Mon–Sat · 10:00–19:00",
  whatsappNumber: "2348000000000",
  instagramUrl: "https://instagram.com/amerapelle",
  tiktokUrl: "https://tiktok.com/@amerapelle",
  contactEmail: "hello@amerapelle.com",
  contactPhone: "+2348000000000",
  paystackEnabled: true,
  bachsEnabled: true,
  exchangeWindowDays: 7,
  creditExpiryDays: 365,
  freeDeliveryThresholdKobo: 300_000_00,
  tickerText: ["Discover Drop 04 — The Night Edit", "Delivery across Nigeria", "Exchange, never a refund"],
  drop: { title: "The Night Edit", collectionSlug: "night-edit", goLiveAt: DROP_LIVE_AT, firstRunTotal: 48, firstRunLeft: 9 },
};

export const MOCK_ZONES: DeliveryZone[] = [
  { id: "z1", code: "LAGOS_ISLAND", name: "Lagos Island", etaText: "1–2 working days", feeKobo: 4500_00, active: true },
  { id: "z2", code: "LAGOS_MAINLAND", name: "Lagos Mainland", etaText: "1–3 working days", feeKobo: 3500_00, active: true },
  { id: "z3", code: "LEKKI_AJAH", name: "Lekki – Ajah", etaText: "1–2 working days", feeKobo: 5000_00, active: true },
  { id: "z4", code: "OTHER_STATES", name: "Other states", etaText: "3–5 working days", feeKobo: 9000_00, active: true },
  { id: "z5", code: "PICKUP", name: "Collect from the store", etaText: "Ready same day", feeKobo: 0, active: true },
];

export const MOCK_FAQ: FaqGroup[] = [
  { group: "Orders", items: [
    { id: "f1", question: "How do I know my order went through?", answer: "You'll see a confirmation page with your order number (AP-…) and get an email receipt within a few minutes. Your order is confirmed once payment clears." },
    { id: "f2", question: "Can I change or cancel an order?", answer: "Message us on WhatsApp within an hour of ordering and we'll do our best before it's packed." },
  ] },
  { group: "Delivery", items: [
    { id: "f3", question: "Where do you deliver?", answer: "Everywhere in Nigeria. Lagos Island, Mainland and Lekki–Ajah in 1–3 working days; other states in 3–5 working days." },
    { id: "f4", question: "Can I collect from the store?", answer: "Yes — choose \"Collect from the store\" at checkout. Pickup is free and usually ready the same day." },
  ] },
  { group: "Payments", items: [
    { id: "f5", question: "How can I pay?", answer: "Paystack for naira cards, bank transfer and USSD. Bachs for cards in your own currency, bank transfer or USDT/USDC from abroad." },
    { id: "f6", question: "Is my card safe?", answer: "Card details are entered on Paystack's or Bachs's secure page — they never touch our servers." },
  ] },
  { group: "Exchanges", items: [
    { id: "f7", question: "Do you offer refunds?", answer: "No. We offer exchanges only: send back an unworn piece with its tags within 7 days of delivery and we'll add its full value to your exchange credit." },
    { id: "f8", question: "How do I use exchange credit?", answer: "It's applied automatically at checkout when you're signed in. If your new order costs more, you pay the difference; if less, the rest stays as credit." },
  ] },
  { group: "Sizing", items: [
    { id: "f9", question: "How do your pieces fit?", answer: "Most pieces fit true to size. Each product page has a size guide, and a stylist on WhatsApp can help with fit." },
  ] },
  { group: "Authenticity", items: [
    { id: "f10", question: "Are your pieces original?", answer: "Every piece is designed by Amerapelle and made in limited runs. Each carries a numbered label (No. 014 etc.)." },
  ] },
];

export const MOCK_PAGES: Record<string, ContentPage> = {
  about: { slug: "about", title: "About Amerapelle", updatedAt: new Date(NOW - 30 * DAY).toISOString(), bodyMarkdown:
`Amerapelle is a Lagos label making **quiet luxury for loud entrances**: tailoring, leather and silk in navy, ink and ivory.

Every piece is made in a limited, numbered run — No. 014, No. 022 — and when a run is gone, it's gone. We don't restock.

## The cloth

Every pattern is drafted in our Lagos studio and every seam finished by hand. We work in small numbered runs so nothing is made to sit on a shelf.

## The promise

- Delivered across Nigeria
- Exchange, not refund
- Pay your way: Paystack in naira, Bachs from abroad
- A stylist on WhatsApp` },
  delivery: { slug: "delivery", title: "Delivery", updatedAt: new Date(NOW - 10 * DAY).toISOString(), bodyMarkdown:
`We deliver across Nigeria. Fees and timings are shown at checkout.

| Zone | Time |
| --- | --- |
| Lagos Island | 1–2 working days |
| Lagos Mainland | 1–3 working days |
| Lekki – Ajah | 1–2 working days |
| Other states | 3–5 working days |
| Collect from the store | Ready same day, free |

Orders above the free-delivery threshold ship free. A rider will call the number you give at checkout — please add a nearby landmark.` },
  exchanges: { slug: "exchanges", title: "Exchanges (no refunds)", updatedAt: new Date(NOW - 10 * DAY).toISOString(), bodyMarkdown:
`**We don't offer refunds.** Instead, every unworn piece with its tags can be exchanged for credit.

1. Request an exchange from your account (or the order lookup page) within 7 days of delivery.
2. We'll approve it and email return instructions.
3. Return the piece to the store or book a pickup.
4. When we receive it, its full value is added to your exchange credit.

Credit is never paid out as cash. Some pieces — jewellery, for example — are marked *not exchangeable* on their product page.` },
  privacy: { slug: "privacy", title: "Privacy", updatedAt: new Date(NOW - 40 * DAY).toISOString(), bodyMarkdown:
`We process your data in line with the Nigeria Data Protection Act 2023.

## What we collect
Your name, email, phone and delivery address to fulfil orders; order history; and, only if you opt in, your email for drop announcements.

## Your rights
You can download all your data or delete your account at any time from **Account → Privacy**.

## Cookies
We use essential cookies to keep your bag and sign-in working. Non-essential cookies (analytics) are only set if you accept them.` },
  terms: { slug: "terms", title: "Terms", updatedAt: new Date(NOW - 40 * DAY).toISOString(), bodyMarkdown:
`By placing an order you agree to these terms.

## Prices
All prices are in Nigerian naira and include VAT where applicable.

## Orders
Your order is confirmed only once payment has been verified. Stock is held for 15 minutes while you pay.

## Exchanges
See our exchange policy. We do not offer refunds.` },
};

export const MOCK_TIME = { NOW, DAY, HOUR };
