import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/home/ContentPage";
import { Markdown } from "@/components/ui/Markdown";
import { contentApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { longDate } from "@/lib/format";

export const revalidate = 300;
const SLUGS = ["delivery", "exchanges", "privacy", "terms"] as const;
const TITLES: Record<string, string> = { delivery: "Delivery", exchanges: "Exchanges", privacy: "Privacy", terms: "Terms of sale" };

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await safe(contentApi.page(slug), null);
  return { title: page?.title ?? TITLES[slug] ?? "Policy", alternates: { canonical: `${SITE_URL}/policies/${slug}` } };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUGS.includes(slug as (typeof SLUGS)[number])) notFound();
  const page = await safe(contentApi.page(slug), null);
  return (
    <ContentPage title={page?.title ?? TITLES[slug]} lede={page ? `Last updated ${longDate(page.updatedAt)}.` : undefined}>
      <nav aria-label="Policies" className="tabs content__tabs">
        {SLUGS.map((s) => (
          <Link key={s} href={`/policies/${s}`} className={`tab${s === slug ? " is-on" : ""}`} aria-current={s === slug ? "page" : undefined}>
            {TITLES[s]}
          </Link>
        ))}
      </nav>
      {page ? <Markdown source={page.bodyMarkdown} /> : <p>This page is being updated. Please check back shortly or contact us.</p>}
    </ContentPage>
  );
}
