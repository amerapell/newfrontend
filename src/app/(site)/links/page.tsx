import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ProductImage } from "@/components/product/ProductImage";
import { Photo } from "@/components/ui/Photo";
import { Countdown } from "@/components/ui/Countdown";
import { catalogApi, safe } from "@/lib/api";
import { dropPhase } from "@/lib/drop";
import { naira } from "@/lib/format";
import { iconKind, whatsappLink } from "@/lib/product";
import { getCollections, getSettings } from "@/lib/server-data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Links", description: "The current drop, new in and the Amerapelle collections — all in one place." };

/** SOC-4: link-in-bio, phone-sized column in the v3 style. */
export default async function LinksPage() {
  const [s, cols] = await Promise.all([getSettings(), getCollections()]);
  const newIn = await safe(catalogApi.collection("new-in", { pageSize: 4 }).then((r) => r.products.items), []);
  const { phase, target } = dropPhase(s.drop);
  const dropCol = s.drop ? cols.find((c) => c.slug === s.drop!.collectionSlug) : undefined;

  return (
    <main id="main" tabIndex={-1} className="links">
      <header className="links__head">
        <Logo variant="stacked" size={64} />
      </header>

      {s.drop && (phase === "upcoming" || phase === "live") && (
        <Link href={`/drop/${s.drop.collectionSlug}`} className={`links__drop${dropCol?.heroImageUrl ? " on-dark" : ""}`}>
          <Photo src={dropCol?.heroImageUrl} alt="" sizes="480px" />
          <span className="links__drop-cap">
            <span className="t-small">{(dropCol?.name ?? "Drop").split(/\s+[—/]\s+/)[0]}</span>
            <span className="t-display">{s.drop.title}</span>
            {phase === "upcoming" && target && <span className="tnum">Opens in <Countdown target={target} /></span>}
            <span className="u-link">{phase === "upcoming" ? "Get notified" : "Discover the drop"}</span>
          </span>
        </Link>
      )}

      <section className="links__section" aria-labelledby="links-new">
        <div className="links__row-head">
          <h2 id="links-new" className="t-title">New In</h2>
          <Link href="/c/new-in" className="u-link">View all</Link>
        </div>
        <ul className="links__grid">
          {newIn.slice(0, 4).map((p) => (
            <li key={p.id}>
              <Link href={`/p/${p.slug}`} className="links__tile">
                <span className="links__img">
                  <ProductImage src={p.images[0]?.url} alt={p.name} kind={iconKind(p)} iconSize={28} sizes="200px" />
                </span>
                <span>{p.name}</span>
                <span className="tnum">{naira(p.priceKobo)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className="links__list" aria-label="Collections">
        {[
          ["/c/women", "Women"],
          ["/c/men", "Men"],
          ["/c/bags-accessories", "Bags & Accessories"],
          ["/c/shoes", "Shoes"],
          ["/orders/lookup", "Track an order"],
        ].map(([href, label]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
        <a href={whatsappLink(s.whatsappNumber, "Hi Amerapelle, ")} target="_blank" rel="noopener noreferrer">Ask a stylist on WhatsApp</a>
      </nav>
      <p className="t-small t-grey links__foot">Delivery across Nigeria · Exchange, never a refund</p>
    </main>
  );
}
