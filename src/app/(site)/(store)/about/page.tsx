import type { Metadata } from "next";
import { ContentPage } from "@/components/home/ContentPage";
import { Markdown } from "@/components/ui/Markdown";
import { contentApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";

export const revalidate = 300;
export const metadata: Metadata = { title: "About", description: "Amerapelle is a Lagos label — tailoring, leather and silk in limited runs, cut in Lagos.", alternates: { canonical: `${SITE_URL}/about` } };

export default async function AboutPage() {
  const page = await safe(contentApi.page("about"), null);
  return (
    <ContentPage title="About Amerapelle" lede="Quiet luxury, cut in Lagos. Tailoring, leather and silk in limited runs.">
      {page ? <Markdown source={page.bodyMarkdown} /> : <p>Amerapelle is a Lagos luxury label. Every piece is made in a limited, numbered run.</p>}
    </ContentPage>
  );
}
