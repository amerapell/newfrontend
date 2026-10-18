import type { Metadata } from "next";
import { ContentPage } from "@/components/home/ContentPage";
import { Markdown } from "@/components/ui/Markdown";
import { contentApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";

export const revalidate = 300;
export const metadata: Metadata = { title: "About", description: "AMERAPELLE is a Lagos-based luxury multi-brand fashion house, bringing together sophisticated fashion, statement handbags, footwear and accessories.", alternates: { canonical: `${SITE_URL}/about` } };

export default async function AboutPage() {
  const page = await safe(contentApi.page("about"), null);
  return (
    <ContentPage title="About Amerapelle">
      {page ? <Markdown source={page.bodyMarkdown} /> : <p>AMERAPELLE is a Lagos-based luxury multi-brand fashion house, bringing together a distinctive selection of sophisticated fashion, statement handbags, footwear, and accessories.</p>}
    </ContentPage>
  );
}
