"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check } from "@/components/cart/Check";
import { FieldBox } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { GOOGLE_ENABLED, GoogleSignIn, OrDivider } from "./GoogleSignIn";
import { apiMessage, toE164NG } from "@/lib/format";

type View = "signin" | "register" | "forgot" | "reset";
const REMEMBER_KEY = "ap_remember_email";

/** ACC-1: sign in | new customer (two columns), forgot and reset — one page, switched by ?view= */
export function AuthForms() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = (params.get("view") as View) || (params.get("token") ? "reset" : "signin");
  const [view, setViewState] = useState<View>(["signin", "register", "forgot", "reset"].includes(initial) ? initial : "signin");
  const { login, loginWithGoogle, register } = useAuth();
  const prefill = params.get("email") ?? "";
  const [email, setEmail] = useState(view === "register" ? "" : prefill);
  const [password, setPassword] = useState("");
  const [regEmail, setRegEmail] = useState(view === "register" ? prefill : "");
  const [regPassword, setRegPassword] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<View | null>(null);
  const [error, setError] = useState<{ view: View; message: string } | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const regRef = useRef<HTMLHeadingElement>(null);
  const [remember, setRemember] = useState(true);
  // "Remember me" keeps the email on this device for next time.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved && !prefill) setEmail(saved);
    } catch {
      /* storage unavailable */
    }
  }, [prefill]);
  const rememberEmail = (v: string) => {
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, v);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  };
  const next = params.get("next");

  const setView = (v: View) => {
    setViewState(v);
    setError(null);
    setInfo(null);
    const q = new URLSearchParams(params.toString());
    if (v === "signin") q.delete("view");
    else q.set("view", v);
    router.replace(`/account${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  // ?view=register (e.g. from the order-complete page) lands on the "New customer" column
  useEffect(() => {
    if (initial === "register") regRef.current?.scrollIntoView({ block: "start" });
  }, [initial]);

  const after = () => {
    if (next && next.startsWith("/")) router.push(next);
  };

  const run = async (v: View, fn: () => Promise<void>) => {
    setBusy(v);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError({ view: v, message: apiMessage(e) });
    } finally {
      setBusy(null);
    }
  };
  const errFor = (v: View) => (error?.view === v ? <p className="cm-error" role="alert">{error.message}</p> : null);

  if (view === "forgot" || view === "reset") {
    return (
      <div className="cm cm-page cm-narrow">
        <h1 className="cm-title">{view === "forgot" ? "Reset your password" : "Choose a new password"}</h1>
        {view === "forgot" ? (
          <form className="cm-form" onSubmit={(e) => { e.preventDefault(); run("forgot", async () => { await authApi.forgot(email.trim()); setInfo("If there's an account for that email, a reset link is on its way."); }); }}>
            <p>Enter your email and we&apos;ll send you a link to reset your password.</p>
            <FieldBox label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {errFor("forgot")}
            {info && <p role="status">{info}</p>}
            <button className="btn btn--primary btn--block" disabled={busy !== null}>{busy ? "Sending…" : "Send reset link"}</button>
            <button type="button" className="cm-textbtn cm-textbtn--ink" onClick={() => setView("signin")}>Back to sign in</button>
          </form>
        ) : (
          <form
            className="cm-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length < 8) return setError({ view: "reset", message: "Use at least 8 characters." });
              run("reset", async () => {
                await authApi.reset(params.get("token") ?? "", password);
                setInfo("Password updated. You can sign in now.");
                setPassword("");
              });
            }}
          >
            <FieldBox label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="At least 8 characters." />
            {errFor("reset")}
            {info && <p role="status">{info}</p>}
            <button className="btn btn--primary btn--block" disabled={busy !== null}>{busy ? "Saving…" : "Save password"}</button>
            <button type="button" className="cm-textbtn cm-textbtn--ink" onClick={() => setView("signin")}>Sign in</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="cm cm-page">
      <div className="cm-auth">
        <section className="cm-auth__col" aria-labelledby="signin-h">
          <h1 id="signin-h" className="cm-title">Sign in</h1>
          <p className="cm-small cm-auth__req">*Required fields</p>
          <form className="cm-form" onSubmit={(e) => { e.preventDefault(); run("signin", async () => { await login(email.trim(), password); rememberEmail(email.trim()); after(); }); }}>
            <FieldBox label="Email*" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <FieldBox label="Password*" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="cm-auth__row">
              <Check id="remember" checked={remember} onChange={setRemember}>Remember me</Check>
              <button type="button" className="u-link" onClick={() => setView("forgot")}>Forgot password?</button>
            </div>
            {errFor("signin")}
            <button className="btn btn--primary btn--block" disabled={busy !== null}>{busy === "signin" ? "Signing in…" : "Sign in"}</button>
          </form>
          {GOOGLE_ENABLED && (
            <>
              <OrDivider />
              <GoogleSignIn disabled={busy !== null} onCredential={(credential) => run("signin", async () => { await loginWithGoogle(credential); after(); })} />
            </>
          )}
          <p className="cm-soft">
            Ordered as a guest? <Link href="/orders/lookup" className="u-link">Find your order</Link>
          </p>
        </section>

        <section className="cm-auth__col cm-auth__col--register" aria-labelledby="register-h">
          <h2 id="register-h" ref={regRef} className="cm-h2">Create an account</h2>
          <p className="cm-soft">Track orders, request exchanges, spend exchange credit and save addresses for a faster checkout.</p>
          <form
            className="cm-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (regPassword.length < 8) return setError({ view: "register", message: "Use at least 8 characters for your password." });
              if (phone && !toE164NG(phone)) return setError({ view: "register", message: "Enter a Nigerian phone number, e.g. 0803 000 0000." });
              run("register", async () => {
                await register({ email: regEmail.trim(), password: regPassword, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone ? toE164NG(phone)! : undefined, marketingConsent: consent });
                after();
              });
            }}
          >
            <div className="cm-fields">
              <FieldBox label="First name*" autoComplete="given-name" value={firstName} onChange={(e) => setFirst(e.target.value)} required />
              <FieldBox label="Last name*" autoComplete="family-name" value={lastName} onChange={(e) => setLast(e.target.value)} required />
            </div>
            <FieldBox label="Email*" type="email" autoComplete="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
            <FieldBox label="Phone (optional)" type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Nigerian number, e.g. 0803 000 0000." />
            <FieldBox label="Password*" type="password" autoComplete="new-password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={8} hint="At least 8 characters." />
            <Check id="reg-consent" checked={consent} onChange={setConsent} sub="Optional. Unsubscribe any time.">Email me about new arrivals and private sales</Check>
            <p className="cm-small cm-soft">
              By creating an account you agree to our <Link href="/policies/terms" className="u-link">Terms</Link> and <Link href="/policies/privacy" className="u-link">Privacy Policy</Link>.
            </p>
            {errFor("register")}
            <button className="btn btn--secondary btn--block" disabled={busy !== null}>{busy === "register" ? "Creating…" : "Create an account"}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
