import Link from "next/link";
import { BagIcon, WhatsAppIcon } from "@/components/chrome/Icons";
import { Markdown } from "@/components/ui/Markdown";
import { Photo, realImage } from "@/components/ui/Photo";
import { whatsappLink } from "@/lib/product";
import type { ContentPage, StoreSettings } from "@/lib/types";

/** Home introduction — the client's brand text, edited in admin → Pages → "home" (title = the small line on top). */
export function HomeIntro({ page }: { page: ContentPage | null }) {
  if (!page?.bodyMarkdown.trim()) return null;
  return (
    <section className="home-intro container" aria-label="About Amerapelle">
      {page.title && <p className="home-intro__eyebrow">{page.title}</p>}
      <div className="home-intro__body">
        <Markdown source={page.bodyMarkdown} />
      </div>
    </section>
  );
}

/** Editorial story panel (§7.4): full-bleed, "Beyond Fashion. A Statement of Distinction." → /about. */
export function StoryPanel({ image }: { image: string | null | undefined }) {
  return (
    <section className={`hero hero--story${image ? " hero--photo on-dark" : " hero--empty"}`} aria-label="Our story">
      <Link href="/about" className="hero__media" tabIndex={-1} aria-hidden>
        <Photo src={image} alt="" sizes="100vw" />
      </Link>
      <div className="hero__cap">
        <h2 className="hero__title">Beyond Fashion. A Statement of Distinction.</h2>
        <Link href="/about" className="u-link hero__link">Read our story</Link>
      </div>
    </section>
  );
}

function ExchangeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M2 6.5h12.5L11.5 3.5M16 11.5H3.5l3 3" />
    </svg>
  );
}

/** "Amerapelle at your service" (§7.5): three cards — image 3:2, 20px title, 14px text, underlined link. */
export function ServiceCards({ settings }: { settings: StoreSettings }) {
  const map = settings.pickupAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.pickupAddress)}` : "/contact";
  const cards = [
    { title: "Style advice on WhatsApp", text: "Fit, sizing and styling, answered fast by our team.", link: "Message a stylist", href: whatsappLink(settings.whatsappNumber, "Hi Amerapelle, I'd like some style advice."), icon: <WhatsAppIcon width={28} height={28} />, external: true, image: realImage(settings.serviceImages?.stylist) },
    { title: "Visit the store", text: "Try pieces on at our Lagos store, Monday to Saturday.", link: "Get directions", href: map, icon: <BagIcon width={28} height={28} />, external: !!settings.pickupAddress, image: realImage(settings.serviceImages?.store) },
    { title: "Exchange, never a refund", text: "Unworn pieces can be exchanged for store credit within 7 days.", link: "How exchanges work", href: "/policies/exchanges", icon: <ExchangeIcon />, external: false, image: realImage(settings.serviceImages?.exchange) },
  ];
  return (
    <section className="service container" aria-labelledby="service-title">
      <h2 id="service-title" className="t-title">Amerapelle at your service</h2>
      <ul className="service__cards">
        {cards.map((c) => (
          <li key={c.title} className="service__card">
            {c.image && (
              <span className="service__img">
                <Photo src={c.image} alt="" sizes="(max-width: 767px) 100vw, 33vw" />
              </span>
            )}
            <h3 className="t-title">{c.title}</h3>
            <p>{c.text}</p>
            <a href={c.href} className="u-link" target={c.external ? "_blank" : undefined} rel={c.external ? "noopener noreferrer" : undefined}>
              {c.link}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
