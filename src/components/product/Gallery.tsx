"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/chrome/Icons";
import { useDialog } from "@/components/chrome/useDialog";
import type { IconKind } from "@/lib/product";
import type { ProductImage as Img } from "@/lib/types";
import { ProductImage } from "./ProductImage";

const MAX = 8;

/**
 * PDP stage gallery (§7 Product).
 *  Desktop: vertical 53×66 thumbnails at the gutter (active underlined) + the active image, large and
 *  contained on the --stage ground. Clicking the image opens the zoom viewer.
 *  Mobile: full-width 4:5 horizontal swipe gallery with thin progress dashes.
 * `fadeKey` changes (colour switch) re-run a quiet fade.
 */
export function Gallery({ name, images, kind, fadeKey }: { name: string; images: Img[]; kind: IconKind; fadeKey: string }) {
  const list = (images.length ? images : [{ url: "", alt: name }]).slice(0, MAX);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [mIndex, setMIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(0);
    setMIndex(0);
    track.current?.scrollTo({ left: 0 });
  }, [fadeKey]);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (el) setMIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const img = list[Math.min(active, list.length - 1)];

  return (
    <>
      <div className="stage hide-mobile">
        {list.length > 1 && (
          <ul className="stage__thumbs" aria-label="Images">
            {list.map((t, i) => (
              <li key={`${t.url}-${i}`}>
                <button type="button" className={`stage__thumb${i === active ? " is-on" : ""}`} aria-label={`Show image ${i + 1} of ${list.length}`} aria-pressed={i === active} onClick={() => setActive(i)}>
                  <ProductImage src={t.url} alt="" kind={kind} sizes="60px" iconSize={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button key={`${fadeKey}-${active}`} type="button" className="stage__main fade-in" onClick={() => setZoom(active)} aria-label={`Zoom: ${img.alt || name}`}>
          <ProductImage src={img.url} alt={img.alt || name} kind={kind} fit="contain" scale={img.scale} priority={active === 0} sizes="(max-width: 1440px) 50vw, 720px" iconSize={120} />
        </button>
      </div>

      <div className="mgallery show-mobile">
        <div key={fadeKey} className="mgallery__track fade-in" ref={track} onScroll={onScroll} role="region" aria-label="Product images" tabIndex={0}>
          {list.map((t, i) => (
            <button key={`${t.url}-${i}`} type="button" className="mgallery__slide" onClick={() => setZoom(i)} aria-label={`Zoom image ${i + 1}`}>
              <ProductImage src={t.url} alt={t.alt || name} kind={kind} fit="contain" scale={t.scale} priority={i === 0} sizes="100vw" iconSize={96} />
            </button>
          ))}
        </div>
        {list.length > 1 && (
          <div className="mgallery__dashes" aria-hidden>
            {list.map((_, i) => (
              <span key={i} className={i === mIndex ? "is-on" : ""} />
            ))}
          </div>
        )}
      </div>

      <ZoomViewer images={list} start={zoom} onClose={() => setZoom(null)} name={name} kind={kind} />
    </>
  );
}

/** Full-screen zoom viewer: --stage ground, every image stacked to scroll through, "×" close. */
function ZoomViewer({ images, start, onClose, name, kind }: { images: Img[]; start: number | null; onClose: () => void; name: string; kind: IconKind }) {
  const open = start !== null;
  const ref = useDialog(open, onClose);
  useEffect(() => {
    if (!open) return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-zoom="${start}"]`);
    el?.scrollIntoView({ block: "start" });
  }, [open, start, ref]);
  if (!open) return null;
  return (
    <div ref={ref} className="zoom" role="dialog" aria-modal="true" aria-label={`${name} — images`}>
      <button type="button" className="zoom__close" aria-label="Close" onClick={onClose} data-autofocus>
        <CloseIcon />
      </button>
      <div className="zoom__list">
        {images.map((img, i) => (
          <div key={`${img.url}-${i}`} className="zoom__item" data-zoom={i}>
            <ProductImage src={img.url} alt={img.alt || name} kind={kind} fit="contain" sizes="100vw" iconSize={160} />
          </div>
        ))}
      </div>
    </div>
  );
}
