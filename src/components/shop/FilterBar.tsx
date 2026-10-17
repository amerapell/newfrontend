"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ChevronDown } from "@/components/chrome/Icons";
import { useSettings } from "@/context/SettingsContext";
import { naira } from "@/lib/format";
import type { Facets, SortKey } from "@/lib/types";

export function useQueryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (patch: Record<string, string | null>, path = pathname) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    return `${path}${qs ? `?${qs}` : ""}`;
  };
  const set = (patch: Record<string, string | null>, path?: string) => {
    const url = href(patch, path);
    if (path && path !== pathname) router.push(url);
    else router.replace(url, { scroll: false });
  };
  return { params, set, href };
}

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

const PRICES: { id: string; label: string; min: number | null; max: number | null }[] = [
  { id: "lt75", label: `Under ${naira(75_000_00)}`, min: null, max: 75_000_00 },
  { id: "75-150", label: `${naira(75_000_00)} – ${naira(150_000_00)}`, min: 75_000_00, max: 150_000_00 },
  { id: "gt150", label: `${naira(150_000_00)} and above`, min: 150_000_00, max: null },
];

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const priceId = (min: string | null, max: string | null) => PRICES.find((p) => String(p.min ?? "") === (min ?? "") && String(p.max ?? "") === (max ?? ""))?.id ?? (min || max ? "custom" : null);

function isMobile() {
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
}

/** 14px square checkbox row (§6 Inputs). */
function Check({ checked, onChange, children, name }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; name?: string }) {
  return (
    <label className="fcheck">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="fcheck__box" aria-hidden />
      <span className="fcheck__label">{children}</span>
    </label>
  );
}

function Section({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const id = useId();
  return (
    <div className={`facc${open ? " is-open" : ""}`}>
      <button type="button" className="facc__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span>
          {title}
          {count ? <span className="facc__count"> ({count})</span> : null}
        </span>
        <span className="facc__sign" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      <div id={id} className="facc__body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}

type Draft = { category: string | null; sizes: string[]; colours: string[]; price: string | null; inStock: boolean };

/** §6 Filter drawer: Category, Size, Colour, Price, Availability; Apply writes the URL query. */
export function FilterDrawer({ open, onClose, facets, slug, total }: { open: boolean; onClose: () => void; facets: Facets; slug?: string; total: number }) {
  const { params, set } = useQueryNav();
  const { collections } = useSettings();
  const read = (): Draft => ({
    category: slug ?? null,
    sizes: list(params.get("size")),
    colours: list(params.get("colour")),
    price: priceId(params.get("minKobo"), params.get("maxKobo")),
    inStock: params.get("inStock") === "true",
  });
  const [d, setD] = useState<Draft>(read);
  // re-sync the draft whenever the drawer opens (URL may have changed)
  const qs = params.toString();
  useEffect(() => {
    if (open) setD(read());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, qs, slug]);

  const categories = collections.filter((c) => !c.isDrop);
  const toggleIn = (arr: string[], v: string, on: boolean) => (on ? Array.from(new Set([...arr, v])) : arr.filter((x) => x !== v));

  const apply = () => {
    const pr = PRICES.find((p) => p.id === d.price);
    const keepCustom = d.price === "custom";
    set(
      {
        size: d.sizes.join(",") || null,
        colour: d.colours.join(",") || null,
        minKobo: pr ? (pr.min != null ? String(pr.min) : null) : keepCustom ? params.get("minKobo") : null,
        maxKobo: pr ? (pr.max != null ? String(pr.max) : null) : keepCustom ? params.get("maxKobo") : null,
        inStock: d.inStock ? "true" : null,
      },
      slug && d.category && d.category !== slug ? `/c/${d.category}` : undefined,
    );
    onClose();
  };
  const clear = () => {
    setD({ category: slug ?? null, sizes: [], colours: [], price: null, inStock: false });
    set({ size: null, colour: null, minKobo: null, maxKobo: null, inStock: null });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filter"
      meta={`${total} ${total === 1 ? "item" : "items"}`}
      className="filter-drawer"
      footer={
        <div className="drawer-actions">
          <button type="button" className="btn btn--primary btn--block" onClick={apply}>Apply</button>
          <button type="button" className="btn btn--secondary btn--block" onClick={clear}>Clear filters</button>
        </div>
      }
    >
      {slug && categories.length > 0 && (
        <Section title="Category">
          <div className="fopts" role="group" aria-label="Category">
            {categories.map((c) => (
              <Check key={c.slug} checked={d.category === c.slug} onChange={(on) => setD({ ...d, category: on ? c.slug : slug })}>
                {c.name}
              </Check>
            ))}
          </div>
        </Section>
      )}
      {facets.sizes.length > 0 && (
        <Section title="Size" count={d.sizes.length} defaultOpen={d.sizes.length > 0}>
          <div className="fopts fopts--grid" role="group" aria-label="Size">
            {facets.sizes.map((s) => (
              <Check key={s} checked={d.sizes.includes(s)} onChange={(on) => setD({ ...d, sizes: toggleIn(d.sizes, s, on) })}>
                {s}
              </Check>
            ))}
          </div>
        </Section>
      )}
      {facets.colours.length > 0 && (
        <Section title="Colour" count={d.colours.length} defaultOpen={d.colours.length > 0}>
          <div className="fopts" role="group" aria-label="Colour">
            {facets.colours.map((c) => (
              <Check key={c.name} checked={d.colours.includes(c.name)} onChange={(on) => setD({ ...d, colours: toggleIn(d.colours, c.name, on) })}>
                <span className="fopts__bar" style={{ background: c.hex }} aria-hidden />
                {c.name}
              </Check>
            ))}
          </div>
        </Section>
      )}
      <Section title="Price" count={d.price ? 1 : 0} defaultOpen={!!d.price}>
        <div className="fopts" role="group" aria-label="Price">
          {PRICES.map((p) => (
            <Check key={p.id} checked={d.price === p.id} onChange={(on) => setD({ ...d, price: on ? p.id : null })}>
              {p.label}
            </Check>
          ))}
        </div>
      </Section>
      <Section title="Availability" count={d.inStock ? 1 : 0} defaultOpen={d.inStock}>
        <div className="fopts" role="group" aria-label="Availability">
          <Check checked={d.inStock} onChange={(on) => setD({ ...d, inStock: on })}>
            In stock only
          </Check>
        </div>
      </Section>
    </Drawer>
  );
}

/** Sort: dropdown on desktop, drawer on mobile (§6). */
function SortControl() {
  const { params, set } = useQueryNav();
  const sort = (params.get("sort") as SortKey | null) ?? "newest";
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        wrap.current?.querySelector<HTMLElement>(".sort__btn")?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.setTimeout(() => wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const choose = (k: SortKey) => {
    set({ sort: k === "newest" ? null : k });
    setMenu(false);
    setDrawer(false);
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>(".sort__opt") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };
  const options = (
    <>
      {SORTS.map((s) => (
        <button key={s.key} type="button" role="menuitemradio" aria-checked={s.key === sort} className={`sort__opt${s.key === sort ? " is-on" : ""}`} onClick={() => choose(s.key)}>
          {s.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="sort" ref={wrap}>
      <button
        type="button"
        className="sort__btn tool-btn"
        aria-haspopup="true"
        aria-expanded={menu || drawer}
        aria-controls={menu ? listId : undefined}
        onClick={() => (isMobile() ? setDrawer(true) : setMenu((v) => !v))}
      >
        Sort by <ChevronDown className={menu ? "is-flipped" : ""} />
        {sort !== "newest" && <span className="sr-only">, {SORTS.find((s) => s.key === sort)?.label}</span>}
      </button>
      {menu && (
        <div id={listId} className="sort__menu" role="menu" aria-label="Sort by" onKeyDown={onMenuKey}>
          {options}
        </div>
      )}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Sort by">
        <div className="sort__list" role="menu" aria-label="Sort by">
          {options}
        </div>
      </Drawer>
    </div>
  );
}

/** Sticky count / filter bar (§6): "24 items" left, "Filter | Sort by ⌄" right. */
export function FilterBar({ facets, slug, total }: { facets: Facets; slug?: string; total: number }) {
  const { params } = useQueryNav();
  const [open, setOpen] = useState(false);
  const active =
    list(params.get("size")).length + list(params.get("colour")).length + (params.get("minKobo") || params.get("maxKobo") ? 1 : 0) + (params.get("inStock") === "true" ? 1 : 0);
  return (
    <div className="toolbar">
      <span className="toolbar__count" aria-live="polite">
        {total} {total === 1 ? "item" : "items"}
      </span>
      <div className="toolbar__actions">
        <button type="button" className="tool-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          Filter{active > 0 && <span className="toolbar__active"> ({active})</span>}
          {active > 0 && <span className="sr-only"> active</span>}
        </button>
        <span className="toolbar__sep" aria-hidden />
        <SortControl />
      </div>
      <FilterDrawer open={open} onClose={() => setOpen(false)} facets={facets} slug={slug} total={total} />
    </div>
  );
}
