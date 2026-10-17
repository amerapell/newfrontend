"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { tokens, isUsingMocks } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { Logo } from "@/components/brand/Logo";

const TOTP_FLAG = "ap_admin_totp_off";
/** Remembers (per tab) that this admin signed in without two-step verification. */
export function setAdminTotpFlag(enabled: boolean) {
  try {
    if (enabled) window.sessionStorage.removeItem(TOTP_FLAG);
    else window.sessionStorage.setItem(TOTP_FLAG, "1");
  } catch {
    /* ignore */
  }
}
function totpOff() {
  try {
    return window.sessionStorage.getItem(TOTP_FLAG) === "1";
  } catch {
    return false;
  }
}

type AdminCtx = { signOut: () => void; onError: (e: unknown) => void };
const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin outside AdminShell");
  return v;
};

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/customers", "Customers"],
  ["/admin/products", "Products"],
  ["/admin/collections", "Collections"],
  ["/admin/exchanges", "Exchanges"],
  ["/admin/discounts", "Discounts"],
  ["/admin/delivery-zones", "Delivery zones"],
  ["/admin/faq", "FAQ"],
  ["/admin/pages", "Pages"],
  ["/admin/settings", "Settings"],
] as const;

/** Admin chrome (client-rendered, noindex): white, mono labels, sharp corners. Gates on the admin JWT. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  useEffect(() => setNeedsTotp(totpOff()), [pathname]);
  const isLogin = pathname === "/admin/login";
  const bare = pathname.endsWith("/slip");

  useEffect(() => {
    if (!isLogin && !tokens.getAdmin()) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    else setReady(true);
  }, [isLogin, pathname, router]);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = useCallback(() => {
    tokens.setAdmin(null);
    setAdminTotpFlag(true);
    router.replace("/admin/login");
  }, [router]);

  const onError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) signOut();
    },
    [signOut],
  );

  if (isLogin) return <div className="admin admin--login">{children}</div>;
  if (!ready) return <div className="admin"><p className="mono-label admin__loading">Checking session…</p></div>;
  if (bare) return <Ctx.Provider value={{ signOut, onError }}>{children}</Ctx.Provider>;

  return (
    <Ctx.Provider value={{ signOut, onError }}>
      <div className="admin">
        <header className="admin__top">
          <button className="icon-btn admin__menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M4 9h16M4 15h10" /></svg>
          </button>
          <Link href="/admin" className="admin__mark" aria-label="Amerapelle admin"><Logo size={28} /></Link>
          <span className="mono-label">Admin{isUsingMocks() ? " · mock data" : ""}</span>
          <span className="admin__spacer" />
          <a href="/" target="_blank" rel="noopener" className="ap-link small-link">View store ↗</a>
          <button className="ap-link small-link" onClick={signOut}>Sign out</button>
        </header>
        <div className="admin__body">
          <nav className={`admin__nav${open ? " is-open" : ""}`} aria-label="Admin">
            {NAV.map(([href, label]) => {
              const on = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={`admin__navlink${on ? " is-on" : ""}`} aria-current={on ? "page" : undefined}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <main id="main" className="admin__main">
            {needsTotp && !pathname.startsWith("/admin/settings") && (
              <div className="notice notice--red">
                Two-step verification isn&apos;t on yet. <Link href="/admin/settings?setup=totp#security" className="ap-link">Set it up now</Link> — it&apos;s required for the admin account.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function AdminHead({ index, title, actions }: { index?: string; title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="admin-head">
      <div>
        {index && <div className="mono-label">{index}</div>}
        <h1 className="serif admin-head__title">{title}</h1>
      </div>
      {actions && <div className="admin-head__actions">{actions}</div>}
    </div>
  );
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const { onError } = useAdmin();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      onError(e);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void run();
  }, [run]);
  return { data, setData, error, loading, reload: run };
}
