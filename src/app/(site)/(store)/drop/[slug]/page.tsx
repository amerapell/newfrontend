import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DropTakeover } from "@/components/motion/DropTakeover";
import { catalogApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { dropTitle } from "@/lib/drop";
import { getSettings } from "@/lib/server-data";

export const revalidate = 30;
export function generateStaticParams() {
  return [];
}

const splitName = (name: string) => {
  const [label, ...rest] = name.split(/\s+[—/]\s+/);
  return { label, rest: rest.join(" — ") };
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await safe(catalogApi.collection(slug, { pageSize: 1 }), null);
  if (!page) return { title: "Drop" };
  const s = await getSettings();
  const title = s.drop?.collectionSlug === slug ? `${splitName(page.collection.name).label} — ${dropTitle(splitName(page.collection.name).label, s.drop.title)}` : page.collection.name;
  return {
    title,
    description: page.collection.description ?? "A limited drop from Amerapelle. No restocks.",
    alternates: { canonical: `${SITE_URL}/drop/${slug}` },
    openGraph: { title: `${title} · Amerapelle`, description: page.collection.description ?? undefined, url: `${SITE_URL}/drop/${slug}`, images: page.collection.heroImageUrl ? [page.collection.heroImageUrl] : undefined },
  };
}

export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page, settings] = await Promise.all([safe(catalogApi.collection(slug, { pageSize: 48, sort: "newest" }), null), getSettings()]);
  if (!page) notFound();
  const { label, rest } = splitName(page.collection.name);
  const title = settings.drop?.collectionSlug === slug ? dropTitle(label, settings.drop.title) : rest || page.collection.name;
  return <DropTakeover collection={page.collection} label={label} title={title} products={page.products.items} />;
}
