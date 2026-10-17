import type { Metadata } from "next";
import { HeroPanel, type HeroPanelData } from "@/components/home/HeroPanel";
import { realImage } from "@/components/ui/Photo";
import { ServiceCards, StoryPanel } from "@/components/home/HomeSections";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { catalogApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { homePanels } from "@/lib/nav";
import { getCollections, getSettings } from "@/lib/server-data";
import type { Collection } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Amerapelle — Quiet luxury, cut in Lagos" },
  description: "Lagos luxury fashion — tailoring, leather and silk in limited runs. Delivered across Nigeria; exchange, never a refund.",
  alternates: { canonical: SITE_URL },
};

function toPanel(c: Collection): HeroPanelData {
  return { key: c.slug, title: c.name, linkLabel: c.tagline || "Discover the collection", href: `/c/${c.slug}`, image: realImage(c.heroImageUrl) };
}

export default async function HomePage() {
  const [settings, collections] = await Promise.all([getSettings(), getCollections()]);
  // Only panels with a photo are shown — a collection without one stays off the home page until the admin adds it.
  const panels = homePanels(collections, null)
    .map((c) => toPanel(c))
    .filter((p) => p.image);
  const newIn = await safe(
    catalogApi.collection("new-in", { pageSize: 12, sort: "newest" }).then((r) => r.products.items),
    [],
  );
  const fallback = newIn.length ? newIn : await safe(catalogApi.products({ pageSize: 12, sort: "newest" }).then((r) => r.items), []);
  const story = realImage(collections.find((c) => c.slug === "new-in")?.heroImageUrl);
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
      {story && <StoryPanel image={story} />}
      <ServiceCards settings={settings} />
    </div>
  );
}
