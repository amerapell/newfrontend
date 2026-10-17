"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FieldBox, SelectBox, TextAreaBox, CheckRow } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { adminApi, uploadImage } from "@/lib/api";
import { apiMessage, longDate, naira, slugify } from "@/lib/format";
import type { AdminProduct, AdminProductInput, Colour, ProductStatus, SizeGuideKind, Variant } from "@/lib/types";
import { AdminHead, useAdmin, useAsync } from "./AdminShell";

/** Design v3 §8: image slots by convention. */
export const IMAGE_SLOTS = ["Product shot (shown in grids)", "Worn / detail (shown on hover and as featured piece)"];

const STATUS: ProductStatus[] = ["LIVE", "DRAFT", "ARCHIVED"];

function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const toast = useToast();
  const { onError } = useAdmin();
  const { data, loading, reload } = useAsync(() => adminApi.products({ q: q || undefined, status: status || undefined }), [q, status]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  return (
    <>
      <AdminHead
        index={`Products · ${data?.total ?? "…"}`}
        title={<>Your <em>pieces</em></>}
        actions={
          <>
            <button
              className="btn btn--ghost"
              onClick={async () => {
                try {
                  download(`amerapelle-stock-${new Date().toISOString().slice(0, 10)}.csv`, await adminApi.exportStock());
                } catch (e) {
                  onError(e);
                  toast.show({ message: apiMessage(e), tone: "error" });
                }
              }}
            >
              Export stock CSV
            </button>
            <label className="btn btn--ghost">
              Import stock CSV
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const r = await adminApi.importStock(f);
                    setImportMsg(`Updated ${r.updated} variants.${r.errors.length ? ` ${r.errors.length} problem rows: ${r.errors.slice(0, 3).join("; ")}` : ""}`);
                    void reload();
                  } catch (x) {
                    setImportMsg(apiMessage(x));
                  } finally {
                    if (fileRef.current) fileRef.current.value = "";
                  }
                }}
              />
            </label>
            <Link href="/admin/products/new" className="btn btn--short">New product +</Link>
          </>
        }
      />
      {importMsg && <div className="notice">{importMsg} <span className="mono-xs">CSV COLUMNS: sku,product,colour,size,stock</span></div>}
      <div className="admin-filters">
        <input className="admin-input" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>No.</th><th>Piece</th><th>Status</th><th className="num">Price</th><th className="num">Stock</th><th className="num">Available</th><th className="num">Variants</th><th>Updated</th><th /></tr>
        </thead>
        <tbody>
          {loading && !data && <tr><td colSpan={9} className="mono-label">Loading…</td></tr>}
          {data?.items.map((p) => (
            <tr key={p.id}>
              <td className="mono-xs">{p.number}</td>
              <td><Link href={`/admin/products/${p.id}`} className="ap-link">{p.name}</Link></td>
              <td><span className={`status-pill status-pill--${p.status.toLowerCase()}`}>{p.status}</span></td>
              <td className="num tnum">{naira(p.priceKobo)}</td>
              <td className="num tnum">{p.stock}</td>
              <td className={`num tnum${p.available <= 2 ? " red" : ""}`}>{p.available}</td>
              <td className="num tnum">{p.variantCount}</td>
              <td className="mono-xs">{longDate(p.updatedAt)}</td>
              <td className="num"><Link href={`/p/${p.slug}`} target="_blank" className="mono-xs">View ↗</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

const SIZE_PRESETS: Record<string, string[]> = {
  Clothing: ["XS", "S", "M", "L", "XL"],
  Menswear: ["S", "M", "L", "XL", "XXL"],
  "Shoes (EU)": ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
};

/** GET /admin/products/:id returns the Product shape + admin fields — map it onto the editable input. */
function toInput(p: AdminProduct): AdminProductInput {
  return {
    name: p.name,
    slug: p.slug,
    number: p.number.replace(/^No\.\s*/i, ""),
    description: p.description,
    details: p.details ?? "",
    care: p.care ?? "",
    material: p.material ?? "",
    sizeGuide: p.sizeGuide,
    exchangeable: p.exchangeable,
    featured: p.featured ?? false,
    status: p.status,
    collectionIds: p.collectionIds,
    colours: p.options.colours,
    sizes: p.options.sizes,
    basePriceKobo: p.basePriceKobo,
    compareAtKobo: p.compareAtKobo,
    images: (p.imagesDetailed ?? p.images).map((i) => ({ url: i.url, alt: i.alt, colour: "colour" in i ? i.colour : null })),
  };
}

const emptyInput: AdminProductInput = {
  name: "", slug: "", number: "", description: "", details: "", care: "", material: "", sizeGuide: "CLOTHING", exchangeable: true, featured: false,
  status: "DRAFT", collectionIds: [], colours: [], sizes: [], basePriceKobo: 0, compareAtKobo: null, images: [],
};

/** ADM-1/2: create/edit, multi-image Cloudinary upload, variant matrix sizes × colours, per-variant price/compare-at/stock. */
export function ProductEditor({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { onError } = useAdmin();
  const cols = useAsync(() => adminApi.collections(), []);
  const existing = useAsync<AdminProduct | null>(() => (id ? adminApi.product(id) : Promise.resolve(null)), [id]);
  const [form, setForm] = useState<AdminProductInput | null>(id ? null : emptyInput);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [newColour, setNewColour] = useState<Colour>({ name: "", hex: "#16161a" });
  const [newSize, setNewSize] = useState("");

  if (id && existing.data && !form) {
    setForm(toInput(existing.data));
    setVariants(existing.data.variants);
  }
  if (!form) return <p className="mono-label">{existing.error ?? "LOADING…"}</p>;

  const set = <K extends keyof AdminProductInput>(k: K, v: AdminProductInput[K]) => setForm((f) => ({ ...f!, [k]: v }));
  const matrix = (form.colours.length ? form.colours.map((c) => c.name) : ["—"]).flatMap((c) => (form.sizes.length ? form.sizes : ["One size"]).map((s) => `${c} / ${s}`));

  const save = async () => {
    setErr(null);
    if (!form.name.trim() || !form.number.trim() || form.basePriceKobo <= 0) return setErr("Name, number and a price are required.");
    setBusy(true);
    try {
      const body = { ...form, slug: form.slug || slugify(form.name), number: `No. ${form.number.replace(/^No\.\s*/i, "")}`, images: form.images.filter((i) => i.url) };
      if (id) {
        const p = await adminApi.updateProduct(id, body);
        setForm(toInput(p));
        setVariants(p.variants);
        toast.show({ message: "Saved." });
      } else {
        const p = await adminApi.createProduct(body);
        toast.show({ message: "Product created — now set stock per variant." });
        router.replace(`/admin/products/${p.id}`);
      }
    } catch (e) {
      onError(e);
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 8 - form.images.length);
    setUploading(list.length);
    for (const f of list) {
      try {
        const url = await uploadImage(f);
        setForm((x) => ({ ...x!, images: [...x!.images, { url, alt: x!.name || f.name.replace(/\.\w+$/, ""), colour: null }] }));
      } catch (e) {
        toast.show({ message: apiMessage(e, `Couldn't upload ${f.name}`), tone: "error" });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const moveImage = (i: number, d: number) =>
    setForm((x) => {
      const imgs = x!.images.slice();
      const j = i + d;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x!, images: imgs };
    });

  return (
    <>
      <AdminHead
        index={id ? `Products / no. ${form.number}` : "Products / new"}
        title={id ? form.name || "Untitled" : <>New <em>piece</em></>}
        actions={
          <>
            {id && existing.data && <Link href={`/p/${existing.data.slug}`} target="_blank" className="btn btn--ghost">View ↗</Link>}
            {id && form.status !== "ARCHIVED" && (
              <button
                className="btn btn--ghost"
                onClick={async () => {
                  if (!confirm("Archive this product? It disappears from the store.")) return;
                  try {
                    await adminApi.archiveProduct(id);
                    set("status", "ARCHIVED");
                    toast.show({ message: "Archived." });
                  } catch (e) {
                    onError(e);
                    toast.show({ message: apiMessage(e), tone: "error" });
                  }
                }}
              >
                Archive
              </button>
            )}
            <button className="btn btn--short" onClick={save} disabled={busy}>{busy ? "Saving…" : id ? "Save changes" : "Create product"}</button>
          </>
        }
      />
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="admin-form">
        <section className="admin-card">
          <div className="mono-label admin-card__head">Basics</div>
          <div className="field-grid field-grid--200">
            <FieldBox full label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <FieldBox label="NUMBER · e.g. 014" value={form.number} onChange={(e) => set("number", e.target.value.replace(/^No\.\s*/i, ""))} />
            <FieldBox label="Slug" value={form.slug ?? ""} placeholder={slugify(form.name)} onChange={(e) => set("slug", slugify(e.target.value))} />
            <FieldBox full label="MATERIAL · CATEGORY — e.g. Lamb leather · Outerwear" value={form.material} onChange={(e) => set("material", e.target.value)} />
            <SelectBox label="Status" value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
              {STATUS.map((s) => <option key={s}>{s}</option>)}
            </SelectBox>
            <SelectBox label="Size guide" value={form.sizeGuide} onChange={(e) => set("sizeGuide", e.target.value as SizeGuideKind)}>
              <option value="CLOTHING">Clothing</option>
              <option value="SHOES">Shoes (EU/UK/US)</option>
              <option value="NONE">None</option>
            </SelectBox>
            <FieldBox label="Base price ₦" inputMode="numeric" value={form.basePriceKobo ? String(form.basePriceKobo / 100) : ""} onChange={(e) => set("basePriceKobo", Math.round(Number(e.target.value.replace(/\D/g, "")) * 100))} />
            <FieldBox label="Compare-at ₦ · optional (sale)" inputMode="numeric" value={form.compareAtKobo ? String(form.compareAtKobo / 100) : ""} onChange={(e) => set("compareAtKobo", e.target.value ? Math.round(Number(e.target.value.replace(/\D/g, "")) * 100) : null)} />
            <TextAreaBox full label="Description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            <TextAreaBox full label="Details · cut, fit, finish" rows={2} value={form.details} onChange={(e) => set("details", e.target.value)} />
            <TextAreaBox full label="Material & care" rows={2} value={form.care} onChange={(e) => set("care", e.target.value)} />
          </div>
          <CheckRow checked={form.exchangeable} onChange={(v) => set("exchangeable", v)} id="exch" sub="Uncheck for final-sale pieces (e.g. jewellery) — hides the exchange button">Exchangeable</CheckRow>
          <CheckRow checked={!!form.featured} onChange={(v) => set("featured", v)} id="featured" sub="Shown large (centred, half width) after every 8 pieces in collection grids, using image 2">Featured piece in listings</CheckRow>
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Collections</div>
          <div className="chip-row">
            {cols.data?.map((c) => {
              const on = form.collectionIds.includes(c.id);
              return (
                <button key={c.id} type="button" className={`chip${on ? " chip--on" : ""}`} aria-pressed={on} onClick={() => set("collectionIds", on ? form.collectionIds.filter((x) => x !== c.id) : [...form.collectionIds, c.id])}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Images · {form.images.length} / 8</div>
          <p className="t-small t-grey">Image 1 is the product shot on the plain ground; image 2 is the worn / detail shot. Drag order with the arrows.</p>
          <div className="img-grid">
            {form.images.map((img, i) => (
              <div key={img.url + i} className="img-grid__item">
                <span className="img-grid__slot">{IMAGE_SLOTS[i] ?? `Detail ${i - 1}`}</span>
                <div className="img-grid__thumb">
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt} />
                  ) : (
                    <span className="mono-xs admin-noimg">No file</span>
                  )}
                </div>
                <input className="admin-input" aria-label="Alt text" value={img.alt} onChange={(e) => set("images", form.images.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} placeholder="Alt text (e.g. Back)" />
                <select className="admin-input" aria-label="Colour" value={img.colour ?? ""} onChange={(e) => set("images", form.images.map((x, k) => (k === i ? { ...x, colour: e.target.value || null } : x)))}>
                  <option value="">All colours</option>
                  {form.colours.map((c) => <option key={c.name}>{c.name}</option>)}
                </select>
                <div className="row gap-8">
                  <button type="button" className="u-link" onClick={() => moveImage(i, -1)} aria-label="Move left">⟵</button>
                  <button type="button" className="u-link" onClick={() => moveImage(i, 1)} aria-label="Move right">⟶</button>
                  <button type="button" className="u-link" onClick={() => set("images", form.images.filter((_, k) => k !== i))}>Remove</button>
                </div>
              </div>
            ))}
            {form.images.length < 8 && (
              <label className="img-grid__add">
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
                <span className="serif">+</span>
                <span className="mono-xs">{uploading ? `Uploading ${uploading}…` : form.images.length < 2 ? `Upload ${IMAGE_SLOTS[form.images.length].split(" (")[0].toLowerCase()}` : "Upload images"}</span>
              </label>
            )}
          </div>
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Options → variant matrix ({matrix.length})</div>
          <div className="stack gap-12">
            <div>
              <span className="mono-xs">Colours</span>
              <div className="chip-row">
                {form.colours.map((c) => (
                  <span key={c.name} className="chip chip--on">
                    <span className="dot10" style={{ background: c.hex }} /> {c.name}
                    <button type="button" aria-label={`Remove ${c.name}`} onClick={() => set("colours", form.colours.filter((x) => x.name !== c.name))}>×</button>
                  </span>
                ))}
                <span className="row gap-8">
                  <input className="admin-input admin-input--sm" placeholder="Colour name" value={newColour.name} onChange={(e) => setNewColour({ ...newColour, name: e.target.value })} aria-label="New colour name" />
                  <input type="color" value={newColour.hex} onChange={(e) => setNewColour({ ...newColour, hex: e.target.value })} aria-label="New colour hex" />
                  <button type="button" className="btn btn--ghost" onClick={() => { if (newColour.name.trim() && !form.colours.some((c) => c.name === newColour.name.trim())) { set("colours", [...form.colours, { name: newColour.name.trim(), hex: newColour.hex }]); setNewColour({ name: "", hex: newColour.hex }); } }}>Add</button>
                </span>
              </div>
            </div>
            <div>
              <span className="mono-xs">Sizes</span>
              <div className="chip-row">
                {Object.entries(SIZE_PRESETS).map(([k, v]) => (
                  <button key={k} type="button" className="chip" onClick={() => set("sizes", v)}>{k}</button>
                ))}
                <button type="button" className="chip" onClick={() => set("sizes", [])}>One size</button>
              </div>
              <div className="chip-row">
                {form.sizes.map((s) => (
                  <span key={s} className="chip chip--on">
                    {s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => set("sizes", form.sizes.filter((x) => x !== s))}>×</button>
                  </span>
                ))}
                <span className="row gap-8">
                  <input className="admin-input admin-input--sm" placeholder="Add size" value={newSize} onChange={(e) => setNewSize(e.target.value)} aria-label="New size" />
                  <button type="button" className="btn btn--ghost" onClick={() => { if (newSize.trim() && !form.sizes.includes(newSize.trim())) { set("sizes", [...form.sizes, newSize.trim()]); setNewSize(""); } }}>Add</button>
                </span>
              </div>
            </div>
            <p className="mono-xs">Saving generates one variant (SKU) per colour × size. existing variants keep their stock.</p>
            {!id && <div className="chip-row">{matrix.map((m) => <span key={m} className="chip">{m}</span>)}</div>}
          </div>
        </section>

        {id && <VariantTable variants={variants} onChange={setVariants} />}
      </div>
    </>
  );
}

function VariantTable({ variants, onChange }: { variants: Variant[]; onChange: (v: Variant[]) => void }) {
  const toast = useToast();
  const { onError } = useAdmin();
  const [draft, setDraft] = useState<Record<string, { price?: string; compare?: string; stock?: string }>>({});
  const save = async (v: Variant) => {
    const d = draft[v.id];
    if (!d) return;
    try {
      const updated = await adminApi.updateVariant(v.id, {
        priceKobo: d.price != null ? Math.round(Number(d.price) * 100) : undefined,
        compareAtKobo: d.compare != null ? (d.compare ? Math.round(Number(d.compare) * 100) : null) : undefined,
        stock: d.stock != null ? Number(d.stock) : undefined,
      });
      onChange(variants.map((x) => (x.id === v.id ? { ...x, ...updated } : x)));
      setDraft((x) => {
        const n = { ...x };
        delete n[v.id];
        return n;
      });
      toast.show({ message: `${v.sku} saved.` });
    } catch (e) {
      onError(e);
      toast.show({ message: apiMessage(e), tone: "error" });
    }
  };
  return (
    <section className="admin-card">
      <div className="mono-label admin-card__head">Variants · price / compare-at / stock</div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr><th>SKU</th><th>Colour</th><th>Size</th><th className="num">Price ₦</th><th className="num">Compare-at ₦</th><th className="num">Stock</th><th className="num">Avail.</th><th /></tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const d = draft[v.id] ?? {};
              const upd = (k: "price" | "compare" | "stock", val: string) => setDraft((x) => ({ ...x, [v.id]: { ...x[v.id], [k]: val.replace(/[^\d]/g, "") } }));
              return (
                <tr key={v.id}>
                  <td className="mono-xs">{v.sku}</td>
                  <td>{v.colourHex && <span className="dot10" style={{ background: v.colourHex }} />} {v.colour ?? "—"}</td>
                  <td>{v.size ?? "One size"}</td>
                  <td className="num"><input className="admin-input admin-input--num" inputMode="numeric" aria-label={`${v.sku} price`} value={d.price ?? String(v.priceKobo / 100)} onChange={(e) => upd("price", e.target.value)} /></td>
                  <td className="num"><input className="admin-input admin-input--num" inputMode="numeric" aria-label={`${v.sku} compare-at`} value={d.compare ?? (v.compareAtKobo ? String(v.compareAtKobo / 100) : "")} onChange={(e) => upd("compare", e.target.value)} /></td>
                  <td className="num"><input className="admin-input admin-input--num" inputMode="numeric" aria-label={`${v.sku} stock`} value={d.stock ?? String(v.stock)} onChange={(e) => upd("stock", e.target.value)} /></td>
                  <td className={`num tnum${v.available <= 2 ? " red" : ""}`}>{v.available}</td>
                  <td className="num">{draft[v.id] && <button className="btn btn--ghost" onClick={() => save(v)}>Save</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
