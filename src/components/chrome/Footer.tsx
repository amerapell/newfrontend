"use client";
import Link from "next/link";
import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { contentApi } from "@/lib/api";
import { apiMessage } from "@/lib/format";
import { whatsappLink } from "@/lib/product";
import { InstagramIcon, TikTokIcon } from "./Icons";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
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
      setState("ok");
      setMsg("Thank you — you're on the list.");
      setEmail("");
    } catch (err) {
      setState("error");
      setMsg(apiMessage(err));
    }
  };
  return (
    <form className="footer__news" onSubmit={submit} noValidate>
      <label htmlFor="news" className="footer__news-title">Amerapelle News</label>
      <p className="t-small">Be the first to know about new arrivals and private sales.</p>
      <div className="line-field line-field--light">
        <input id="news" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="news-note" />
        <button type="submit" disabled={state === "busy"}>Sign up</button>
      </div>
      {msg && (
        <p id="news-note" className="t-small" role={state === "error" ? "alert" : "status"}>
          {msg}
        </p>
      )}
      <p className="t-small footer__consent">
        By subscribing, you agree to our <Link href="/policies/privacy" className="u-link">privacy policy</Link>
      </p>
    </form>
  );
}

/**
 * Footer (§5): espresso, white text. Row 1 tagline + newsletter; row 2 four link columns; row 3 legal line.
 */
export function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();
  const map = settings.pickupAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.pickupAddress)}` : "/contact";
  return (
    <footer className="footer on-dark">
      <div className="footer__top">
        <p className="footer__tagline">A world of style. A signature of luxury.</p>
        <div className="footer__side">
          <Newsletter />
          <ul className="footer__social" aria-label="Social">
            <li>
              <a href={settings.instagramUrl || "https://instagram.com/"} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>
            </li>
            <li>
              <a href={settings.tiktokUrl || "https://tiktok.com/"} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon /></a>
            </li>
          </ul>
        </div>
      </div>

      <nav className="footer__cols" aria-label="Footer">
        <div className="footer__col">
          <h2>Client Service</h2>
          <ul>
            <li><a href={whatsappLink(settings.whatsappNumber, "Hi Amerapelle, ")} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>
            <li><a href={settings.contactPhone ? `tel:${settings.contactPhone}` : "/contact"}>Call us</a></li>
            <li><a href={settings.contactEmail ? `mailto:${settings.contactEmail}` : "/contact"}>Email us</a></li>
            <li><a href={map} target={settings.pickupAddress ? "_blank" : undefined} rel="noopener noreferrer">Visit the store</a></li>
          </ul>
        </div>
        <div className="footer__col">
          <h2>Orders</h2>
          <ul>
            <li><Link href="/policies/delivery">Delivery</Link></li>
            <li><Link href="/policies/exchanges">Exchanges</Link></li>
            <li><Link href="/orders/lookup">Track an order</Link></li>
          </ul>
        </div>
        <div className="footer__col">
          <h2>Amerapelle</h2>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/founder">Our Founder</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>
      </nav>

      <div className="footer__legal">
        <span>© {year} Amerapelle, Lagos</span>
        <Link href="/policies/privacy">Privacy</Link>
        <Link href="/policies/terms">Terms</Link>
      </div>
    </footer>
  );
}
