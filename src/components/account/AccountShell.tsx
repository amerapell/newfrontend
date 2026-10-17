"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { accountApi, exchangesApi } from "@/lib/api";
import type { Address, CreditLedger, Exchange, Order } from "@/lib/types";
import { AuthForms } from "./AuthForms";
import { VerifyEmailView, VerifyNoticeBar } from "./EmailVerification";

type AccountData = {
  orders: Order[] | null;
  addresses: Address[] | null;
  credit: CreditLedger | null;
  exchanges: Exchange[] | null;
  reload: () => Promise<void>;
  setAddresses: (a: Address[]) => void;
  pendingCredit: { amountKobo: number; ref: string } | null;
  setPendingCredit: (p: { amountKobo: number; ref: string } | null) => void;
};

const Ctx = createContext<AccountData | null>(null);
export const useAccount = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used inside <AccountShell>");
  return v;
};

const NAV = [
  { href: "/account", label: "Overview", title: "Account" },
  { href: "/account/orders", label: "Orders", title: "Orders" },
  { href: "/account/exchanges", label: "Exchanges", title: "Exchanges & credit" },
  { href: "/account/addresses", label: "Addresses", title: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist", title: "Wishlist" },
  { href: "/account/privacy", label: "Privacy", title: "Privacy" },
] as const;

const isOn = (pathname: string, href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));

/** Signed-in account layout (§7): 240px list nav with --hair rules on the left, content + 26px H1 on the right. */
export function AccountShell({ children, topBar }: { children: ReactNode; topBar?: ReactNode }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [credit, setCredit] = useState<CreditLedger | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[] | null>(null);
  const [pendingCredit, setPendingCredit] = useState<{ amountKobo: number; ref: string } | null>(null);

  const reload = useCallback(async () => {
    const [o, a, c, x] = await Promise.allSettled([accountApi.orders(), accountApi.addresses(), accountApi.credit(), exchangesApi.mine()]);
    if (o.status === "fulfilled") setOrders(o.value);
    if (a.status === "fulfilled") setAddresses(a.value);
    if (c.status === "fulfilled") setCredit(c.value);
    if (x.status === "fulfilled") setExchanges(x.value);
  }, []);

  useEffect(() => {
    if (status === "authed") void reload();
  }, [status, reload]);

  useEffect(() => {
    const next = params.get("next");
    if (status === "authed" && next && next.startsWith("/") && !next.startsWith("/account")) router.replace(next);
  }, [status, params, router]);

  // /account?view=verify&token=… (link from the "Confirm your email" email) works signed in or not.
  if (params.get("view") === "verify") return <VerifyEmailView token={params.get("token") ?? ""} onVerified={reload} />;

  if (status === "loading") {
    return (
      <div className="cm cm-page" aria-busy="true">
        <p className="cm-soft">Loading your account…</p>
      </div>
    );
  }
  if (status === "guest" || !user) return <AuthForms />;

  const current = NAV.find((n) => isOn(pathname, n.href)) ?? NAV[0];
  const exchangeOpen = exchanges?.some((e) => !["COMPLETED", "DECLINED"].includes(e.status));

  return (
    <Ctx.Provider value={{ orders, addresses, credit, exchanges, reload, setAddresses, pendingCredit, setPendingCredit }}>
      {topBar}
      <div className="cm cm-page">
        <div className="cm-acc">
          <nav aria-label="Account" className="cm-acc__nav">
            <ul>
              {NAV.map((n) => {
                const on = isOn(pathname, n.href);
                return (
                  <li key={n.href}>
                    <Link href={n.href} className={`cm-acc__link${on ? " is-on" : ""}`} aria-current={on ? "page" : undefined}>
                      {n.label}
                      {n.href === "/account/exchanges" && exchangeOpen && <span className="cm-soft"> (open)</span>}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button type="button" className="cm-acc__link" onClick={() => logout().then(() => router.push("/account"))}>
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
          <section className="cm-acc__main">
            <h1 className="cm-title">{current.title}</h1>
            {user.emailVerified === false && <VerifyNoticeBar />}
            {children}
          </section>
        </div>
      </div>
    </Ctx.Provider>
  );
}
