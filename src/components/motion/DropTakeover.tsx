"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCountdown } from "@/components/ui/Countdown";
import { Photo } from "@/components/ui/Photo";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { contentApi } from "@/lib/api";
import { apiMessage, pad2 } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import type { Collection, ProductCard } from "@/lib/types";

function NotifyForm({ slug }: { slug: string }) {
  const [v, setV] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.trim()) return;
    setState("busy");
    try {
      await contentApi.notifyDrop(v.trim(), slug);
      setState("ok");
      setMsg("Thank you — we'll write the minute it opens.");
    } catch (err) {
      setState("err");
      setMsg(apiMessage(err));
    }
  };
  return (
    <form onSubmit={submit} className="drop__form" noValidate>
      <div className="line-field line-field--light">
        <label htmlFor="drop-notify" className="sr-only">Email or WhatsApp number</label>
        <input id="drop-notify" type="text" inputMode="email" autoComplete="email" placeholder="Email or WhatsApp number" value={v} onChange={(e) => setV(e.target.value)} />
        <button type="submit" disabled={state === "busy"}>Notify me</button>
      </div>
      {msg && <p className="t-small" role="status">{msg}</p>}
    </form>
  );
}

/**
 * Drop launch (§7, restyled): while upcoming, a full-screen espresso overlay with the drop's hero image
 * (darkened 40%) and a centred white countdown (DD : HH : MM : SS) + notify field. At go-live the overlay
 * fades out (600ms) to reveal the listing grid, whose cards fade up in a stagger.
 */
export function DropTakeover({ collection, label, title, products }: { collection: Collection; label: string; title: string; products: ProductCard[] }) {
  const goLive = collection.goLiveAt ? new Date(collection.goLiveAt).getTime() : null;
  const secs = useCountdown(goLive);
  const [stage, setStage] = useState<"curtain" | "fading" | "open">(() => (goLive && goLive > Date.now() ? "curtain" : "open"));

  useEffect(() => {
    if (stage === "curtain" && secs === 0) setStage("fading");
  }, [secs, stage]);
  useEffect(() => {
    if (stage !== "fading") return;
    const t = window.setTimeout(() => setStage("open"), prefersReducedMotion() ? 0 : 600);
    return () => window.clearTimeout(t);
  }, [stage]);
  useEffect(() => {
    if (stage === "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage]);

  const d = secs ?? 0;
  const units: [string, string][] = [
    [secs == null ? "--" : pad2(Math.floor(d / 86400)), "Days"],
    [secs == null ? "--" : pad2(Math.floor((d % 86400) / 3600)), "Hours"],
    [secs == null ? "--" : pad2(Math.floor((d % 3600) / 60)), "Minutes"],
    [secs == null ? "--" : pad2(d % 60), "Seconds"],
  ];

  return (
    <>
      <section className={`drop-list${stage === "curtain" ? " is-waiting" : ""}`} aria-label={`${label} — ${title}`}>
        <header className="cat-head container">
          <p className="t-small t-grey">{label}</p>
          <h1 className="t-display">{title}</h1>
          {collection.description && <p className="cat-head__intro">{collection.description}</p>}
        </header>
        {stage !== "curtain" && (
          <>
            <div className="shop-bar">
              <div className="toolbar">
                <span className="toolbar__count">{products.length} {products.length === 1 ? "item" : "items"}</span>
                <Link href={`/c/${collection.slug}`} className="u-link">Filter &amp; sort</Link>
              </div>
            </div>
            <ProductGrid products={products} featured={false} stagger />
          </>
        )}
      </section>

      {stage !== "open" && (
        <div className={`drop on-dark${stage === "fading" ? " is-fading" : ""}`} role="dialog" aria-modal="true" aria-label={`${label} — ${title} opens soon`}>
          <div className="drop__bg" aria-hidden>
            <Photo src={collection.heroImageUrl} alt="" priority />
          </div>
          <Link href="/" className="drop__logo" aria-label="Amerapelle — home">
            <Logo size={32} tone="light" />
          </Link>
          <div className="drop__centre">
            <p className="t-small">{label}</p>
            <h2 className="t-display">{title}</h2>
            <div className="drop__clock" role="timer" aria-label={secs != null ? `${units.map(([v, l]) => `${v} ${l}`).join(", ")}` : "Loading countdown"}>
              {units.map(([v, l], i) => (
                <span key={l} className="drop__unit">
                  {i > 0 && <span className="drop__sep" aria-hidden>:</span>}
                  <span className="drop__num tnum" suppressHydrationWarning>{v}</span>
                  <span className="drop__lbl">{l}</span>
                </span>
              ))}
            </div>
            <NotifyForm slug={collection.slug} />
            <Link href="/" className="u-link drop__browse">Browse the store</Link>
          </div>
        </div>
      )}
    </>
  );
}
