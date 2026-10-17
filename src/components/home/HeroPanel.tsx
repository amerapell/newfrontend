import Link from "next/link";
import { Photo } from "@/components/ui/Photo";

export type HeroPanelData = {
  key: string;
  title: string;
  linkLabel: string;
  href: string;
  image: string | null;
};

/**
 * Home hero panel (§7): full-viewport photo (100vh desktop, 80vh mobile), caption bottom-left at the gutter —
 * 26px white title + underlined 14px white link, over a subtle bottom gradient. No image → --placeholder
 * ground with ink text.
 */
export function HeroPanel({ panel, priority, as: Tag = "h2" }: { panel: HeroPanelData; priority?: boolean; as?: "h1" | "h2" }) {
  const dark = !!panel.image;
  return (
    <section className={`hero${dark ? " hero--photo on-dark" : " hero--empty"}`} aria-label={panel.title}>
      <Link href={panel.href} className="hero__media" tabIndex={-1} aria-hidden>
        <Photo src={panel.image} alt="" priority={priority} sizes="100vw" />
      </Link>
      <div className="hero__cap">
        <Tag className="hero__title">{panel.title}</Tag>
        <Link href={panel.href} className="u-link hero__link">{panel.linkLabel}</Link>
      </div>
    </section>
  );
}
