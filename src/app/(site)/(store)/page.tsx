import type { Metadata } from "next";
import { HeroPanel, type HeroPanelData } from "@/components/home/HeroPanel";
import { ServiceCards, StoryPanel } from "@/components/home/HomeSections";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { catalogApi, safe } from "@/lib/api";
import { dropPhase, dropTitle } from "@/lib/drop";
import { SITE_URL } from "@/lib/env";
import { homePanels } from "@/lib/nav";
import { getCollections, getSettings } from "@/lib/server-data";
import type { Collection, StoreSettings } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Amerapelle — Quiet luxury, cut in Lagos" },
  description: "Lagos luxury fashion — tailoring, leather and silk in limited runs. Delivered across Nigeria; exchange, never a refund.",
  alternates: { canonical: SITE_URL },
};

function toPanel(c: Collection, settings: StoreSettings): HeroPanelData {
  const isDrop = c.slug === settings.drop?.collectionSlug;
  if (isDrop && settings.drop) {
    const { phase } = dropPhase(settings.drop);
    const label = c.name.split(/\s+[—/]\s+/)[0];
    return {
      key: c.slug,
      title: `${label} — ${dropTitle(label, settings.drop.title)}`,
      linkLabel: c.tagline || "Discover the drop",
      href: `/drop/${c.slug}`,
      image: c.heroImageUrl ?? null,
      opensAt: phase === "upcoming" ? settings.drop.goLiveAt : null,
    };
  }
  return { key: c.slug, title: c.name, linkLabel: c.tagline || "Discover the collection", href: `/c/${c.slug}`, image: c.heroImageUrl ?? null };
}

export default async function HomePage() {
  const [settings, collections] = await Promise.all([getSettings(), getCollections()]);
  const phase = dropPhase(settings.drop).phase;
  const dropSlug = phase === "live" || phase === "upcoming" ? settings.drop?.collectionSlug : null;
  const panels = homePanels(collections, dropSlug).map((c) => toPanel(c, settings));
  const newIn = await safe(
    catalogApi.collection("new-in", { pageSize: 12, sort: "newest" }).then((r) => r.products.items),
    [],
  );
  const fallback = newIn.length ? newIn : await safe(catalogApi.products({ pageSize: 12, sort: "newest" }).then((r) => r.items), []);
  const story = collections.find((c) => c.slug === "new-in")?.heroImageUrl ?? null;
  const [first, second, ...rest] = panels;

  return (
    <div className="home">
      <h1 className="sr-only">Amerapelle — quiet luxury, cut in Lagos</h1>
      {first && <HeroPanel panel={first} priority />}
      {second && <HeroPanel panel={second} />}
      <ProductCarousel title="New In" subtitle="This week's new pieces, cut in Lagos." products={fallback} className="home__newin" />
      {rest.map((p) => (
        <HeroPanel key={p.key} panel={p} />
      ))}
      <StoryPanel image={story} />
      <ServiceCards settings={settings} />
    </div>
  );
}
