import type { Metadata } from "next";
import { HeroPanel, type HeroPanelData } from "@/components/home/HeroPanel";
import { realImage } from "@/components/ui/Photo";
import { HomeMediaPanel } from "@/components/home/HomeMedia";
import { HomeIntro, ServiceCards, StoryPanel } from "@/components/home/HomeSections";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { catalogApi, contentApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { usableImages } from "@/lib/home-media";
import { homePanels } from "@/lib/nav";
import { getCollections, getSettings } from "@/lib/server-data";
import type { Collection } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Amerapelle — A World of Style. A Signature of Luxury." },
  description: "Amerapelle is a Lagos-based luxury multi-brand fashion house: fashion, statement handbags, footwear and accessories. Delivered worldwide.",
  alternates: { canonical: SITE_URL },
};

function toPanel(c: Collection): HeroPanelData {
  return { key: c.slug, title: c.name, linkLabel: c.tagline || "Discover the collection", href: `/c/${c.slug}`, image: realImage(c.heroImageUrl) };
}

/**
 * Home: opening photo (slow zoom) → brand introduction → slideshow → New In → still photo → services.
 * All three photo panels are edited in admin → Settings → Home page. If none has a photo yet, the collection banners
 * are shown instead (the earlier layout).
 */
export default async function HomePage() {
  const [settings, collections, intro] = await Promise.all([getSettings(), getCollections(), safe(contentApi.page("home"), null)]);
  const media = settings.homeMedia;
  const campaign = !!media && [media.hero, media.slides, media.still].some((p) => usableImages(p).length);
  const newIn = await safe(
    catalogApi.collection("new-in", { pageSize: 12, sort: "newest" }).then((r) => r.products.items),
    [],
  );
  const fallback = newIn.length ? newIn : await safe(catalogApi.products({ pageSize: 12, sort: "newest" }).then((r) => r.items), []);
  const carousel = <ProductCarousel title="New In" subtitle="The latest arrivals." products={fallback} className="home__newin" />;

  if (campaign && media) {
    return (
      <div className="home">
        <h1 className="sr-only">Amerapelle — a world of style, a signature of luxury</h1>
        <HomeMediaPanel panel={media.hero} motion="zoom" priority label="Amerapelle" />
        <HomeIntro page={intro} />
        <HomeMediaPanel panel={media.slides} motion="slides" label="The collection" />
        {carousel}
        <HomeMediaPanel panel={media.still} motion="none" label="Our story" />
        <ServiceCards settings={settings} />
      </div>
    );
  }

  // Only panels with a photo are shown — a collection without one stays off the home page until the admin adds it.
  const panels = homePanels(collections, null)
    .map((c) => toPanel(c))
    .filter((p) => p.image);
  const story = realImage(collections.find((c) => c.slug === "new-in")?.heroImageUrl);
  const [first, second, ...rest] = panels;
  return (
    <div className="home">
      <h1 className="sr-only">Amerapelle — a world of style, a signature of luxury</h1>
      {first && <HeroPanel panel={first} priority />}
      <HomeIntro page={intro} />
      {second && <HeroPanel panel={second} />}
      {carousel}
      {rest.map((p) => (
        <HeroPanel key={p.key} panel={p} />
      ))}
      {story && <StoryPanel image={story} />}
      <ServiceCards settings={settings} />
    </div>
  );
}
