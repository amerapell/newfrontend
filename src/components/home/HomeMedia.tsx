"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { usableImages } from "@/lib/home-media";
import type { HomeImage, HomePanel } from "@/lib/types";

const SLIDE_MS = 5000;
/** Wide campaign photos on a tall phone screen: keep the chosen side of the photo in view. */
const FOCUS: Record<HomeImage["focus"], string> = { left: "15% 50%", center: "50% 50%", right: "85% 50%" };

function Caption({ panel, as: Tag = "h2" }: { panel: HomePanel; as?: "h1" | "h2" }) {
  if (!panel.title && !panel.linkLabel) return null;
  return (
    <div className="hero__cap">
      {panel.title && <Tag className="hero__title">{panel.title}</Tag>}
      {panel.linkLabel && (
        <Link href={panel.href || "/"} className="u-link hero__link">
          {panel.linkLabel}
        </Link>
      )}
    </div>
  );
}

/**
 * Full-screen home photo panel (design v3 §7 hero, same caption and heights).
 *  motion="zoom"   one photo, slowly zooming in and out (the opening image, in place of a video)
 *  motion="slides" photos changing every 5 s with a cross-fade and a gentle zoom; bars bottom-right pick a slide
 *  motion="none"   one still photo
 * Reduced-motion visitors get still photos (the slideshow still changes, without zoom).
 */
export function HomeMediaPanel({ panel, motion, priority, label }: { panel: HomePanel; motion: "zoom" | "slides" | "none"; priority?: boolean; label: string }) {
  const images = usableImages(panel);
  const [active, setActive] = useState(0);
  const many = motion === "slides" && images.length > 1;

  useEffect(() => {
    if (!many) return;
    const t = window.setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % images.length);
    }, SLIDE_MS);
    return () => window.clearInterval(t);
  }, [many, images.length, active]);

  if (!images.length) return null;
  const shown = motion === "slides" ? images : images.slice(0, 1);
  return (
    <section className={`hero hero--photo on-dark hero--${motion}`} aria-label={panel.title || label} aria-roledescription={many ? "carousel" : undefined}>
      <Link href={panel.href || "/"} className="hero__media" tabIndex={-1} aria-hidden>
        {shown.map((img, i) => (
          <span key={img.url + i} className={`hero__frame${i === active ? " is-on" : ""}`}>
            <Photo src={img.url} alt="" sizes="100vw" priority={priority && i === 0} position={FOCUS[img.focus] ?? FOCUS.center} />
          </span>
        ))}
      </Link>
      <Caption panel={panel} />
      {many && (
        <div className="hero__dots" role="group" aria-label="Choose a photo">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              className={`hero__dot${i === active ? " is-on" : ""}`}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
