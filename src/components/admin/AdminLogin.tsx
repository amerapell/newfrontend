"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FieldBox } from "@/components/ui/Field";
import { adminApi, tokens } from "@/lib/api";
import { apiMessage } from "@/lib/format";
import { setAdminTotpFlag } from "./AdminShell";
import { Logo } from "@/components/brand/Logo";

/** ADM-6: email + password, then a 6-digit TOTP code (with first-time setup). */
export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"password" | "totp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [temp, setTemp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = (t: string, totpEnabled = true) => {
    tokens.setAdmin(t);
    setAdminTotpFlag(totpEnabled);
    if (!totpEnabled) {
      // First sign-in without two-step verification: go straight to enrolment (ADM-6).
      router.replace("/admin/settings?setup=totp#security");
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") && next !== "/admin/login" ? next : "/admin");
  };

  return (
    <div className="admin-login">
      <div className="admin-login__mark"><Logo variant="stacked" size={88} /></div>
      <div className="mono-label">Admin · {step === "password" ? "Step 1 of 2" : "Step 2 of 2 · two-step verification"}</div>
      {step === "password" ? (
        <form
          className="stack gap-12"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              const r = await adminApi.login(email.trim(), password);
              if (!r.requiresTotp) finish(r.accessToken, r.totpEnabled);
              else {
                setTemp(r.tempToken);
                setStep("totp");
              }
            } catch (x) {
              setErr(apiMessage(x, "Email or password is incorrect."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FieldBox label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FieldBox label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="form-error" role="alert">{err}</p>}
          <button className="btn btn--block" disabled={busy}><span>{busy ? "Checking…" : "Continue"}</span><span aria-hidden>→</span></button>
        </form>
      ) : (
        <form
          className="stack gap-12"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              const r = await adminApi.totp(temp, code.replace(/\s/g, ""));
              finish(r.accessToken);
            } catch (x) {
              setErr(apiMessage(x, "That code didn't match. Try the newest one."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="body-copy">Enter the 6-digit code from your authenticator app.</p>
          <FieldBox label="Code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required data-autofocus />
          {err && <p className="form-error" role="alert">{err}</p>}
          <button className="btn btn--block" disabled={busy}><span>{busy ? "Verifying…" : "Verify"}</span><span aria-hidden>→</span></button>
          <button type="button" className="ap-link small-link" onClick={() => { setStep("password"); setCode(""); setErr(null); }}>← Back</button>
        </form>
      )}
    </div>
  );
}
