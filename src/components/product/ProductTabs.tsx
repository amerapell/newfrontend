"use client";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useSettings } from "@/context/SettingsContext";
import { naira } from "@/lib/format";
import { fabricOf } from "@/lib/product";
import type { DeliveryZone, Product } from "@/lib/types";

/** Splits "Boxy cropped shape, dropped shoulder. 38 × 28 × 14 cm." into features + a dimensions line. */
function splitDetails(details: string | null) {
  if (!details) return { features: [] as string[], dimensions: null as string | null };
  const dim = details.match(/\d+(?:[.,]\d+)?\s*(?:×|x)\s*\d+(?:\s*(?:×|x)\s*\d+)?\s*(?:cm|mm)/i)?.[0] ?? null;
  const rest = dim ? details.replace(dim, "") : details;
  const features = rest
    .split(/[.;]\s*|,\s+(?=[a-z0-9])/i)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter((s) => s.length > 1)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return { features, dimensions: dim };
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ptabs__block">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

/**
 * Below-the-stage tabs (§7): Product details · Composition & care · Delivery & exchanges. Content in two
 * columns — list sections with 1px rules on the left, the spec table on the right.
 */
export function ProductTabs({ product: p, zones }: { product: Product; zones: DeliveryZone[] }) {
  const { settings } = useSettings();
  const [tab, setTab] = useState(0);
  const id = useId();
  const { features, dimensions } = splitDetails(p.details);
  const collection = p.collections.find((c) => !["new-in", "sale"].includes(c.slug)) ?? p.collections[0];
  const ref = p.number.replace(/^No\.?\s*/i, "");

  const panels: { label: string; body: ReactNode }[] = [
    {
      label: "Product details",
      body: (
        <>
          {features.length > 0 && (
            <Block title="Features">
              <ul className="ptabs__list">{features.map((f) => <li key={f}>{f}</li>)}</ul>
            </Block>
          )}
          {dimensions && <Block title="Dimensions"><p>{dimensions.replace(/\s*x\s*/gi, " × ")}</p></Block>}
          {!features.length && !dimensions && <Block title="Description"><p>{p.description}</p></Block>}
        </>
      ),
    },
    {
      label: "Composition & care",
      body: (
        <>
          <Block title="Composition"><p>{fabricOf(p.material) || "See the label inside."}</p></Block>
          <Block title="Care"><p>{p.care ?? "Care instructions are on the label inside."}</p></Block>
        </>
      ),
    },
    {
      label: "Delivery & exchanges",
      body: (
        <>
          <Block title="Delivery">
            {zones.length ? (
              <ul className="ptabs__zones">
                {zones.map((z) => (
                  <li key={z.id}>
                    <span>{z.name}</span>
                    <span className="t-grey">{z.etaText.charAt(0) + z.etaText.slice(1).toLowerCase()}</span>
                    <span className="tnum">{z.feeKobo ? naira(z.feeKobo) : "Free"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Delivered worldwide — across Nigeria, and abroad by DHL Express. Fees and timings are shown at checkout.</p>
            )}
          </Block>
          <Block title="Exchanges">
            <p>
              {p.exchangeable
                ? `Unworn pieces with their tags can be exchanged for store credit within ${settings.exchangeWindowDays} days of delivery. `
                : "This piece is final sale and can't be exchanged. "}
              <Link href="/policies/exchanges" className="u-link">Exchange policy</Link>
            </p>
          </Block>
        </>
      ),
    },
  ];

  return (
    <section className="ptabs container" aria-label="Product information">
      <div className="tabs" role="tablist">
        {panels.map((t, i) => (
          <button key={t.label} id={`${id}-t${i}`} type="button" role="tab" aria-selected={tab === i} aria-controls={`${id}-p${i}`} className={`tab${tab === i ? " is-on" : ""}`} onClick={() => setTab(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${id}-p${tab}`} role="tabpanel" aria-labelledby={`${id}-t${tab}`} className="ptabs__panel">
        <div className="ptabs__main">{panels[tab].body}</div>
        <table className="spec-table">
          <tbody>
            {collection && <tr><th scope="row">Collection</th><td><Link href={`/c/${collection.slug}`}>{collection.name}</Link></td></tr>}
            {p.material && <tr><th scope="row">Material</th><td>{fabricOf(p.material)}</td></tr>}
            <tr><th scope="row">Reference</th><td>No. {ref}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
