"use client";
import { Drawer } from "@/components/ui/Drawer";
import { useUI } from "@/context/UIContext";
import type { SizeGuideKind } from "@/lib/types";

const CLOTHING = [
  ["XS", "6", "34", "2", "80", "62", "88"],
  ["S", "8", "36", "4", "84", "66", "92"],
  ["M", "10", "38", "6", "88", "70", "96"],
  ["L", "12", "40", "8", "93", "75", "101"],
  ["XL", "14", "42", "10", "98", "80", "106"],
];
const SHOES = [
  ["36", "3", "5.5", "23.0"],
  ["37", "4", "6.5", "23.7"],
  ["38", "5", "7.5", "24.4"],
  ["39", "6", "8.5", "25.1"],
  ["40", "6.5", "9", "25.7"],
  ["41", "7.5", "10", "26.4"],
  ["42", "8", "10.5", "27.0"],
  ["43", "9", "11.5", "27.7"],
  ["44", "9.5", "12", "28.3"],
];

/** PDP-5 size guide table per category (clothing in cm, shoes EU/UK/US). */
export function SizeGuideTable({ kind }: { kind: SizeGuideKind }) {
  const shoes = kind === "SHOES";
  const head = shoes ? ["EU", "UK", "US", "Foot (cm)"] : ["Size", "UK", "EU", "US", "Bust", "Waist", "Hip"];
  const rows = shoes ? SHOES : CLOTHING;
  return (
    <div className="size-guide">
      <p>{shoes ? "Shoes are in EU sizes. Measure your foot from heel to longest toe, standing." : "Most pieces fit true to size. Body measurements in centimetres."}</p>
      <div className="size-guide__scroll">
        <table className="size-table">
          <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="t-small t-grey">Between sizes? Ask a stylist on WhatsApp — we reply fast.</p>
    </div>
  );
}

/** Stand-alone size guide drawer (opened from anywhere through UIContext.openSizeGuide). */
export function SizeGuideModal() {
  const { sizeGuide, openSizeGuide } = useUI();
  const open = sizeGuide === "CLOTHING" || sizeGuide === "SHOES";
  return (
    <Drawer open={open} onClose={() => openSizeGuide(null)} title="Size guide">
      {sizeGuide && <SizeGuideTable kind={sizeGuide} />}
    </Drawer>
  );
}
