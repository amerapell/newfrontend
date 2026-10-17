"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { authApi } from "@/lib/api";
import { apiMessage } from "@/lib/format";

export const VERIFY_NOTICE = "Confirm your email to use exchange credit and see past orders.";
const COOLDOWN_MS = 60_000;

/** Shared across every "Resend email" button on the page so the bar and the credit panel cool down together. */
let cooldownUntil = 0;
const listeners = new Set<() => void>();

/** "Resend email": POST /auth/resend-verification, then disabled for 60 s with a countdown. */
export function useResendVerification() {
  const { user } = useAuth();
  const toast = useToast();
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

  useEffect(() => {
    const on = () => force((n) => n + 1);
    listeners.add(on);
    return () => void listeners.delete(on);
  }, []);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => force((n) => n + 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  const resend = useCallback(async () => {
    setBusy(true);
    try {
      const r = await authApi.resendVerification();
      cooldownUntil = Date.now() + COOLDOWN_MS;
      listeners.forEach((l) => l());
      toast.show({ message: r.sent ? `New link sent to ${user?.email ?? "your email"}.` : "A link is already on its way — check your inbox." });
    } catch (e) {
      toast.show({ message: apiMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  }, [toast, user?.email]);

  return { resend, busy, left, disabled: busy || left > 0, label: busy ? "Sending…" : left > 0 ? `Resend in ${left}s` : "Resend email" };
}

/** Notice under the account title while the email is unconfirmed. */
export function VerifyNoticeBar() {
  const r = useResendVerification();
  return (
    <div className="cm-notice" role="region" aria-label="Confirm your email">
      <p>{VERIFY_NOTICE}</p>
      <button type="button" className="btn btn--secondary cm-notice__btn" onClick={r.resend} disabled={r.disabled}>
        {r.label}
      </button>
    </div>
  );
}

/** Replaces the credit balance for unverified accounts: no balance is shown until the email is confirmed. */
export function CreditLocked() {
  const r = useResendVerification();
  return (
    <div className="cm-block cm-credit">
      <p className="cm-credit__label">Exchange credit</p>
      <p>Confirm your email to see and use your credit.</p>
      <p className="cm-soft">{VERIFY_NOTICE}</p>
      <button type="button" className="cm-textbtn cm-textbtn--ink" onClick={r.resend} disabled={r.disabled}>
        {r.label}
      </button>
    </div>
  );
}

type Phase = "checking" | "done" | "failed";

/** /account?view=verify&token=… — confirms the email, then continues to the account. */
export function VerifyEmailView({ token, onVerified }: { token: string; onVerified?: () => void | Promise<void> }) {
  const router = useRouter();
  const { status, user, refreshUser } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        if (!token) throw new Error("This link is invalid or has expired");
        await authApi.verifyEmail(token);
        setPhase("done");
      } catch (e) {
        setError(apiMessage(e));
        setPhase("failed");
      }
    })();
  }, [token]);

  // Once the session has loaded, pull the fresh user (emailVerified, credit) into the account.
  useEffect(() => {
    if (phase === "done" && status === "authed") {
      void refreshUser();
      void onVerified?.();
    }
  }, [phase, status, refreshUser, onVerified]);

  const resend = useResendVerification();
  const canResend = phase === "failed" && status === "authed" && user && !user.emailVerified;
  const toAccount = () => router.replace("/account");

  return (
    <div className="cm cm-page cm-narrow">
      <div className="cm-stack" aria-live="polite" aria-busy={phase === "checking"}>
        {phase === "checking" && (
          <>
            <h1 className="cm-title">Confirming your email…</h1>
            <p className="cm-soft">One moment.</p>
          </>
        )}
        {phase === "done" && (
          <>
            <h1 className="cm-title">Your email is confirmed.</h1>
            <p>Your exchange credit and past orders are now linked to your account.</p>
            <button type="button" className="btn btn--primary btn--block" onClick={toAccount}>
              {status === "authed" ? "Continue to account" : "Sign in to continue"}
            </button>
          </>
        )}
        {phase === "failed" && (
          <>
            <h1 className="cm-title">This link has expired.</h1>
            <p>{error ?? "This link is invalid or has expired"}. Links are valid for 24 hours and can be used once.</p>
            {canResend ? (
              <button type="button" className="btn btn--primary btn--block" onClick={resend.resend} disabled={resend.disabled}>
                {resend.left > 0 ? resend.label : "Send a new link"}
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--block" onClick={toAccount}>
                {status === "authed" ? "Continue to account" : "Sign in"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
