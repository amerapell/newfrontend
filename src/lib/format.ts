import type { Money, OrderStatus, ExchangeStatus } from "./types";

export const CREDIT_REASON_LABEL: Record<string, string> = {
  EXCHANGE_CREDIT: "Exchange credit",
  ORDER_PAYMENT: "Spent on order",
  ORDER_CANCELLED_REFUND_TO_CREDIT: "Returned from cancelled order",
  ORDER_PAYMENT_REAPPLIED: "Re-applied to order",
};

export const creditReasonLabel = (r: string) => CREDIT_REASON_LABEL[r] ?? r;

/** "₦ 185,000" (narrow no-break space after the sign) — kobo in, whole naira out, no kobo (design v3 §2). */
export function naira(kobo: Money | null | undefined): string {
  const n = Math.round((kobo ?? 0) / 100);
  return "₦\u202F" + n.toLocaleString("en-NG");
}

export function koboFromNaira(n: number): Money {
  return Math.round(n * 100);
}

export function pad2(n: number) {
  return (n < 10 ? "0" : "") + n;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Thu 16 Oct" */
export function shortDay(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

/** "10 Oct 2026" */
export function longDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

/** "14.10.26" */
export function dotDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return `${pad2(x.getDate())}.${pad2(x.getMonth() + 1)}.${String(x.getFullYear()).slice(2)}`;
}

/** Adds working days (Mon–Fri). */
export function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

/** Pulls the slowest number from "1–2 WORKING DAYS" style ETA text; null if none. */
export function etaMaxDays(eta: string): number | null {
  const nums = eta.match(/\d+/g);
  if (!nums) return /same day/i.test(eta) ? 0 : null;
  return Math.max(...nums.map(Number));
}

export function arrivalFromEta(eta: string, now = new Date()): string | null {
  const max = etaMaxDays(eta);
  if (max === null) return null;
  return shortDay(addWorkingDays(now, max));
}

/** Nigerian phone → E.164 (+234…). Accepts 080…, 80…, 234…, +234…. Returns null if invalid. */
export function toE164NG(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let rest: string;
  if (digits.startsWith("+234")) rest = digits.slice(4);
  else if (digits.startsWith("234")) rest = digits.slice(3);
  else if (digits.startsWith("0")) rest = digits.slice(1);
  else rest = digits.replace(/^\+/, "");
  rest = rest.replace(/^0/, "");
  if (!/^[789][01]\d{8}$/.test(rest)) return null;
  return "+234" + rest;
}

/** +2348030000000 → "803 000 0000" for display in a "+234" prefixed field */
export function localPhoneDisplay(e164: string | null | undefined) {
  if (!e164) return "";
  const r = e164.replace(/^\+234/, "");
  return r.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for pickup",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  EXCHANGE_REQUESTED: "Exchange requested",
  EXCHANGED: "Exchanged",
};

export const EXCHANGE_STATUS_LABEL: Record<ExchangeStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  ITEM_RECEIVED: "Received",
  CREDIT_ISSUED: "Credit issued",
  COMPLETED: "Completed",
  DECLINED: "Declined",
};

export function upper(s: string | null | undefined) {
  return (s ?? "").toUpperCase();
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function apiMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(". ");
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

/** Splits a product name so one word can be set in italic, as the designs do ("Cropped *leather* jacket"). */
export function italicWord(name: string): [string, string, string] {
  const words = name.split(" ");
  if (words.length < 2) return [name, "", ""];
  const idx = words.length >= 3 ? 1 : words.length - 1;
  return [words.slice(0, idx).join(" ") + " ", words[idx], (idx < words.length - 1 ? " " : "") + words.slice(idx + 1).join(" ")];
}
