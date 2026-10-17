/**
 * Typed HTTP client for the Amerapelle REST API. Browser → same-origin `/api/v1` (proxied to the API by
 * next.config.ts rewrites, so the refresh cookie is first-party); server → `${NEXT_PUBLIC_API_URL}/api/v1`.
 * Single choke point for: base URL, JSON, auth headers, guest cart token,
 * 401 → refresh → retry, Nest error shape, and the mock fallback.
 * Components never call fetch directly — they use the domain modules in this folder.
 */
import { API_BASE, BROWSER_API_BASE, IS_DEV, USE_MOCKS } from "../env";
import type { ApiErrorBody } from "../types";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;
  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Auth = "customer" | "admin" | "none";

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: Auth;
  /** Send the guest cart token header */
  cart?: boolean;
  /** ISR revalidate seconds for server fetches */
  revalidate?: number | false;
  tags?: string[];
  /** Return text instead of JSON */
  text?: boolean;
  signal?: AbortSignal;
  /** Browser: call the API origin directly instead of the same-origin proxy (large uploads; Vercel caps proxied request bodies). */
  direct?: boolean;
};

const isBrowser = typeof window !== "undefined";
const BASE = isBrowser ? BROWSER_API_BASE : API_BASE;

/* ---------------- token state (browser only, in memory) ---------------- */
let accessToken: string | null = null;
let adminToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

const CART_KEY = "ap_cart_token";
const ADMIN_KEY = "ap_admin_token";
/** Not a credential: "1" after a sign-in on this device, "0" after sign-out / a failed refresh. */
const SESSION_KEY = "ap_session";

export const tokens = {
  setAccess(t: string | null) {
    accessToken = t;
  },
  getAccess() {
    return accessToken;
  },
  onRefresh(fn: (() => Promise<string | null>) | null) {
    refreshHandler = fn;
  },
  getCart(): string | null {
    if (!isBrowser) return null;
    try {
      return window.localStorage.getItem(CART_KEY);
    } catch {
      return null;
    }
  },
  setCart(t: string | null) {
    if (!isBrowser) return;
    try {
      if (t) window.localStorage.setItem(CART_KEY, t);
      else window.localStorage.removeItem(CART_KEY);
    } catch {
      /* private mode */
    }
  },
  /**
   * Whether this browser may hold a refresh cookie (`ap_rt` is httpOnly, so it can't be read directly).
   * Unknown (never recorded) counts as maybe, so sessions that predate the hint are still restored once.
   */
  maybeSignedIn(): boolean {
    if (!isBrowser) return false;
    try {
      return window.localStorage.getItem(SESSION_KEY) !== "0";
    } catch {
      return true;
    }
  },
  setSignedIn(on: boolean) {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(SESSION_KEY, on ? "1" : "0");
    } catch {
      /* private mode */
    }
  },
  getAdmin(): string | null {
    if (adminToken) return adminToken;
    if (!isBrowser) return null;
    try {
      adminToken = window.sessionStorage.getItem(ADMIN_KEY);
    } catch {
      adminToken = null;
    }
    return adminToken;
  },
  setAdmin(t: string | null) {
    adminToken = t;
    if (!isBrowser) return;
    try {
      if (t) window.sessionStorage.setItem(ADMIN_KEY, t);
      else window.sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      /* ignore */
    }
  },
};

function buildQuery(query?: RequestOptions["query"]) {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "" || v === false) continue;
      qs.set(k, String(v));
    }
  }
  return qs;
}

let mockModule: Promise<typeof import("../mocks/router")> | null = null;
function loadMock() {
  if (!mockModule) mockModule = import("../mocks/router");
  return mockModule;
}

/** Whether a failed real request should fall back to mock data (dev only, never prod). */
// Set when the API can't be reached in dev; retried after 30s so starting the backend later just works.
let unreachableUntil = 0;
const isUnreachable = () => Date.now() < unreachableUntil;
export function isUsingMocks() {
  return USE_MOCKS || isUnreachable();
}

async function viaMock<T>(path: string, opts: RequestOptions): Promise<T> {
  const { mockRoute, MockHttpError } = await loadMock();
  try {
    const res = await mockRoute({
      method: opts.method ?? "GET",
      path,
      query: buildQuery(opts.query),
      body: opts.body,
      cartToken: opts.cart ? tokens.getCart() : null,
      auth: opts.auth === "customer" ? !!accessToken : false,
      admin: opts.auth === "admin" ? !!tokens.getAdmin() : false,
    });
    // simulate a little latency in the browser so loading states are exercised
    if (isBrowser) await new Promise((r) => setTimeout(r, 120));
    return structuredCloneSafe(res) as T;
  } catch (e) {
    if (e instanceof MockHttpError) throw new ApiError(e.status, e.message, { statusCode: e.status, message: e.message, error: "Mock" });
    throw e;
  }
}

function structuredCloneSafe<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  try {
    return structuredClone(v);
  } catch {
    return v;
  }
}

async function raw<T>(path: string, opts: RequestOptions, retried = false): Promise<T> {
  if (USE_MOCKS || isUnreachable()) return viaMock<T>(path, opts);

  const qs = buildQuery(opts.query).toString();
  const url = `${opts.direct ? API_BASE : BASE}/${path.replace(/^\//, "")}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { Accept: opts.text ? "text/plain, text/csv, text/html" : "application/json" };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (opts.auth === "customer" && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.auth === "admin" && tokens.getAdmin()) headers.Authorization = `Bearer ${tokens.getAdmin()}`;
  if (opts.cart) {
    const t = tokens.getCart();
    if (t) headers["X-Cart-Token"] = t;
  }

  const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    method: opts.method ?? "GET",
    headers,
    body,
    // Never hang a render on a slow/unreachable API: server 5s, browser 15s.
    signal: opts.signal ?? AbortSignal.timeout(isBrowser ? 15000 : 5000),
  };
  if (isBrowser) init.credentials = "include";
  else if ((opts.method ?? "GET") === "GET") {
    init.next = { revalidate: opts.revalidate ?? 60, tags: opts.tags };
  } else {
    init.cache = "no-store";
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    // Network failure. In development fall back to the mock dataset so the UI stays usable.
    const callerAborted = !!opts.signal && err instanceof DOMException && err.name === "AbortError";
    if (IS_DEV && !callerAborted) {
      if (!isUnreachable() && isBrowser) console.warn(`[api] ${BASE} unreachable — using mock data (dev only).`);
      unreachableUntil = Date.now() + 30_000;
      return viaMock<T>(path, opts);
    }
    throw new ApiError(0, "We couldn't reach the store. Check your connection and try again.");
  }

  if (res.status === 401 && opts.auth === "customer" && !retried && refreshHandler && path !== "auth/refresh") {
    const t = await refreshHandler();
    if (t) return raw<T>(path, opts, true);
  }

  // Dev only: the same-origin rewrite answers 5xx (not a network error) when the API is down — treat as unreachable.
  if (IS_DEV && isBrowser && BASE.startsWith("/") && res.status >= 500 && !(res.headers.get("content-type") || "").includes("json")) {
    if (!isUnreachable()) console.warn(`[api] ${BASE} proxy target unreachable — using mock data (dev only).`);
    unreachableUntil = Date.now() + 30_000;
    return viaMock<T>(path, opts);
  }

  if (!res.ok) {
    let errBody: ApiErrorBody | null = null;
    try {
      errBody = (await res.json()) as ApiErrorBody;
    } catch {
      /* not json */
    }
    const msg = errBody ? (Array.isArray(errBody.message) ? errBody.message.join(". ") : errBody.message) : res.statusText;
    throw new ApiError(res.status, msg || "Request failed", errBody);
  }
  if (res.status === 204) return undefined as T;
  if (opts.text) return (await res.text()) as T;
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? await res.json() : await res.text()) as T;
}

export const api = {
  get: <T>(path: string, opts: Omit<RequestOptions, "method" | "body"> = {}) => raw<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, "method" | "body"> = {}) => raw<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, "method" | "body"> = {}) => raw<T>(path, { ...opts, method: "PATCH", body }),
  del: <T>(path: string, opts: Omit<RequestOptions, "method" | "body"> = {}) => raw<T>(path, { ...opts, method: "DELETE" }),
};

/** Server-side helper: never throw during render/build; return a fallback instead. */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}
