"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountApi, ApiError, authApi, tokens } from "@/lib/api";
import type { User } from "@/lib/types";

type Status = "loading" | "authed" | "guest";

type AuthValue = {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<User>;
  /** Google Identity Services credential (ID token) → same session as an email login. */
  loginWithGoogle: (credential: string) => Promise<User>;
  register: (b: { email: string; password: string; firstName: string; lastName: string; phone?: string; marketingConsent: boolean }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

/**
 * Access token lives in memory only; the refresh token is the httpOnly `ap_rt` cookie,
 * so on load we call POST /auth/refresh (credentials: include) to restore the session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const refreshing = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async () => {
    if (!refreshing.current) {
      refreshing.current = authApi
        .refresh()
        .then((r) => {
          tokens.setAccess(r.accessToken);
          tokens.setSignedIn(true);
          return r.accessToken;
        })
        .catch((e) => {
          // Only a definite "no session" answer clears the hint; a network blip must not sign the shopper out.
          if (e instanceof ApiError && e.status === 401) tokens.setSignedIn(false);
          tokens.setAccess(null);
          setUser(null);
          setStatus("guest");
          return null;
        })
        .finally(() => {
          refreshing.current = null;
        });
    }
    return refreshing.current;
  }, []);

  useEffect(() => {
    tokens.onRefresh(refresh);
    let alive = true;
    (async () => {
      // Guests who never signed in on this device skip POST /auth/refresh (it can only answer 401).
      if (!tokens.maybeSignedIn()) return setStatus("guest");
      const t = await refresh();
      if (!alive) return;
      if (!t) return setStatus("guest");
      try {
        const me = await accountApi.me();
        if (!alive) return;
        setUser(me);
        setStatus("authed");
      } catch {
        if (alive) setStatus("guest");
      }
    })();
    return () => {
      alive = false;
      tokens.onRefresh(null);
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    tokens.setAccess(r.accessToken);
    tokens.setSignedIn(true);
    setUser(r.user);
    setStatus("authed");
    return r.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const r = await authApi.google(credential);
    tokens.setAccess(r.accessToken);
    tokens.setSignedIn(true);
    setUser(r.user);
    setStatus("authed");
    return r.user;
  }, []);

  const register = useCallback<AuthValue["register"]>(async (b) => {
    const r = await authApi.register(b);
    tokens.setAccess(r.accessToken);
    tokens.setSignedIn(true);
    setUser(r.user);
    setStatus("authed");
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    tokens.setAccess(null);
    tokens.setSignedIn(false);
    tokens.setCart(null);
    setUser(null);
    setStatus("guest");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await accountApi.me());
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, loginWithGoogle, register, logout, refreshUser }),
    [user, status, login, loginWithGoogle, register, logout, refreshUser],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
