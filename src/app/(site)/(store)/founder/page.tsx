import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL } from "@/lib/env";

const DESCRIPTION = "Meet Toni Denise Bryant, Founder & CEO of AMERAPELLE — from Los Angeles to Lagos, a passion for fashion and a vision for luxury.";

export const metadata: Metadata = {
  title: "Our Founder",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/founder` },
  openGraph: { title: "Meet our Founder & CEO — Toni Denise Bryant", description: DESCRIPTION, images: ["/founder/toni-denise-bryant.jpg"] },
};

export default function FounderPage() {
  return (
    <article className="founder">
      <header className="founder__head">
        <p className="founder__eyebrow">Meet our Founder &amp; CEO</p>
        <h1 className="founder__name">Toni Denise Bryant</h1>
        <p className="founder__role">The Visionary Behind AMERAPELLE</p>
      </header>

      <div className="founder__body">
        <figure className="founder__photo">
          <Image src="/founder/toni-denise-bryant.jpg" alt="Toni Denise Bryant, Founder and CEO of AMERAPELLE" width={1024} height={1024} sizes="(max-width: 767px) 100vw, 44vw" priority />
        </figure>

        <div className="founder__story">
          <p className="founder__lede">From Los Angeles to Lagos — A Passion for Fashion, A Vision for Luxury.</p>
          <p>Every iconic brand begins with a story, and the story of AMERAPELLE begins with a woman whose passion for fashion transcends borders.</p>
          <p>Originally from Los Angeles, California, Toni Denise Bryant has always been inspired by the beauty of fashion, the power of personal style, and the confidence that comes from looking exceptional.</p>
          <p>With a deep appreciation for beautiful clothing, sophisticated designs, and timeless elegance, Toni envisioned creating a fashion destination that would bring together international style, individuality, and a truly elevated shopping experience.</p>
          <p>From that vision, AMERAPELLE was born.</p>

          <section className="founder__section">
            <h2 className="founder__h2">The Inspiration Behind the Name</h2>
            <p className="founder__formula" aria-label="America plus Apparels equals Amerapelle">
              <span>AMERICA</span> <span className="founder__op">+</span> <span>APPARELS</span> <span className="founder__op">=</span> <span>AMERAPELLE</span>
            </p>
            <p>The name AMERAPELLE is a reflection of Toni&rsquo;s identity and passion.</p>
            <p><strong>AMERICA</strong> represents her roots, heritage, and the international perspective that inspires her vision.</p>
            <p><strong>APPARELS</strong> represents her love for beautiful clothing, exceptional fashion, and the art of dressing with elegance.</p>
            <p>Together, these inspirations gave birth to AMERAPELLE — a name that embodies the connection between American inspiration and a world of sophisticated fashion.</p>
          </section>

          <section className="founder__section">
            <h2 className="founder__h2">Building a Fashion Destination</h2>
            <p>Driven by her vision, Toni established AMERAPELLE in Lagos, Nigeria, as a luxury multi-brand fashion house offering carefully curated clothing, statement handbags, sophisticated footwear, and distinctive accessories.</p>
            <p>Her ambition extends beyond selling fashion. She seeks to create a destination where customers can discover exceptional pieces, express their individuality, and enjoy a shopping experience defined by elegance and attentive service.</p>
          </section>

          <section className="founder__section">
            <h2 className="founder__h2">A Legacy of Style</h2>
            <p>For Toni Denise Bryant, fashion is more than an industry. It is a passion, a form of self-expression, and an opportunity to inspire confidence.</p>
            <p>Through AMERAPELLE, she continues to bring her vision to life — connecting cultures, celebrating individuality, and redefining the experience of luxury fashion.</p>
          </section>
        </div>
      </div>

      <footer className="founder__close">
        <p className="founder__brand">AMERAPELLE</p>
        <p className="founder__motto">Born from Passion. Inspired by America. Defined by Elegance.</p>
        <Link href="/c/new-in" className="btn btn--primary">Discover the collection</Link>
      </footer>
    </article>
  );
}
