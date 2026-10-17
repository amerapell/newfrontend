"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Photo, realImage } from "@/components/ui/Photo";
import { useSettings } from "@/context/SettingsContext";
import { contentApi } from "@/lib/api";
import { apiMessage } from "@/lib/format";

const SEEN_KEY = "ap_welcome_seen";
const DELAY_MS = 1000;
/** Never interrupt someone who is paying, signing in or checking an order. */
const QUIET = ["/checkout", "/bag", "/account", "/orders", "/policies"];

function seen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked → don't nag on every page
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** "Welcome to Amerapelle" — newsletter sign-up shown once per visitor, a few seconds into the first visit. */
export function WelcomePopup() {
  const { settings } = useSettings();
  const pathname = usePathname();
  const w = settings.welcomePopup;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const quiet = QUIET.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!w?.enabled || quiet || seen()) return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, [w?.enabled, quiet]);

  if (!w?.enabled) return null;
  const close = () => {
    markSeen();
    setOpen(false);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setState("error");
      setMsg("Enter a valid email address.");
      return;
    }
    setState("busy");
    try {
      await contentApi.newsletter(email);
      markSeen();
      setState("ok");
      setMsg("Thank you — you're on the list.");
      setEmail("");
    } catch (err) {
      setState("error");
      setMsg(apiMessage(err));
    }
  };
  const image = realImage(w.imageUrl);

  return (
    <Drawer open={open} onClose={close} title={w.title} className="welcome">
      {image && (
        <div className="welcome__img">
          <Photo src={image} alt="" sizes="(max-width: 767px) 100vw, 480px" />
        </div>
      )}
      {w.text && <p className="welcome__text">{w.text}</p>}
      {state === "ok" ? (
        <p className="welcome__done" role="status">{msg}</p>
      ) : (
        <form className="welcome__form" onSubmit={submit} noValidate>
          <div className="line-field">
            <input type="email" autoComplete="email" placeholder="Email address" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} data-autofocus />
            <button type="submit" disabled={state === "busy"}>Sign up</button>
          </div>
          {msg && <p className="t-small welcome__err" role="alert">{msg}</p>}
          <p className="t-small">
            By subscribing, you agree to our <Link href="/policies/privacy" className="u-link" onClick={close}>privacy policy</Link>
          </p>
        </form>
      )}
    </Drawer>
  );
}
