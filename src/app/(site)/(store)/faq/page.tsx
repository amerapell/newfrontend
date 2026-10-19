import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/home/ContentPage";
import { Accordion } from "@/components/ui/Accordion";
import { contentApi, safe } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { slugify } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "FAQ", description: "Orders, delivery, payments, exchanges, sizing and authenticity.", alternates: { canonical: `${SITE_URL}/faq` } };

export default async function FaqPage() {
  const groups = await safe(contentApi.faq(), []);
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) => g.items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } }))),
  };
  return (
    <ContentPage title="Frequently asked questions" lede={<>Your satisfaction, our priority — every unworn piece can be exchanged for store credit. Still need help? <Link href="/contact" className="u-link">Contact us</Link>.</>}>
      {groups.map((g) => (
        <section key={g.group} id={slugify(g.group)} className="faq-group" aria-labelledby={`${slugify(g.group)}-h`}>
          <h2 id={`${slugify(g.group)}-h`} className="t-title">{g.group}</h2>
          <Accordion items={g.items.map((it) => ({ id: it.id, title: it.question, body: <p>{it.answer}</p> }))} />
        </section>
      ))}
      {!groups.length && <p>Our FAQ is being updated. Message us on WhatsApp in the meantime.</p>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </ContentPage>
  );
}
