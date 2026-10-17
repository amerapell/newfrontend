"use client";
import Link from "next/link";
import { useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { Modal } from "@/components/ui/Modal";
import { StepTracker } from "@/components/ui/StepTracker";
import { TextAreaBox } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { adminApi } from "@/lib/api";
import { EXCHANGE_STATUS_LABEL, ORDER_STATUS_LABEL, apiMessage, longDate, naira, plural } from "@/lib/format";
import { iconKind } from "@/lib/product";
import type { AdminExchangeDetail, ExchangeStatus } from "@/lib/types";
import { AdminHead, useAdmin, useAsync } from "./AdminShell";

type Action = "approve" | "decline" | "receive" | "complete";

const FLOW: { status: ExchangeStatus; label: string; desc: string }[] = [
  { status: "REQUESTED", label: "Requested", desc: "Customer submitted" },
  { status: "APPROVED", label: "Approved", desc: "Return details emailed" },
  { status: "ITEM_RECEIVED", label: "Item received", desc: "Checked and restocked" },
  { status: "CREDIT_ISSUED", label: "Credit issued", desc: "Value added as credit" },
  { status: "COMPLETED", label: "Completed", desc: "Exchange closed" },
];

/** Which actions the backend state machine allows from each status (EXC-7). */
const ACTIONS: Record<ExchangeStatus, Action[]> = {
  REQUESTED: ["approve", "decline"],
  APPROVED: ["receive", "decline"],
  ITEM_RECEIVED: [],
  CREDIT_ISSUED: ["complete"],
  COMPLETED: [],
  DECLINED: [],
};

const DAY = 86_400_000;

function tracker(ex: AdminExchangeDetail) {
  const at = (s: ExchangeStatus) => [...ex.history].reverse().find((h) => h.status === s);
  const stamp = (s: ExchangeStatus, fallback: string) => {
    const h = at(s);
    return h ? longDate(h.at) : fallback;
  };
  if (ex.status === "DECLINED") {
    // Show the steps it actually passed through, then Declined as the terminal step.
    const passed = FLOW.filter((f) => at(f.status));
    const declined = at("DECLINED");
    const steps = [
      ...passed.map((f) => ({ label: f.label, desc: stamp(f.status, f.desc) })),
      { label: "Declined", desc: declined ? longDate(declined.at) : "Closed" },
    ];
    return { steps, reached: steps.length, declined: true };
  }
  const reached = FLOW.findIndex((f) => f.status === ex.status) + 1;
  return { steps: FLOW.map((f) => ({ label: f.label, desc: stamp(f.status, f.desc) })), reached, declined: false };
}

export function ExchangeAdminDetail({ id }: { id: string }) {
  const { data: ex, error, reload } = useAsync(() => adminApi.exchange(id), [id]);
  const toast = useToast();
  const { onError } = useAdmin();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);

  if (error) return <p className="form-error">{error}</p>;
  if (!ex) return <p className="mono-label">Loading…</p>;

  const value = ex.items.reduce((n, i) => n + i.valueKobo, 0);
  const pieces = ex.items.reduce((n, i) => n + i.quantity, 0);
  const t = tracker(ex);
  const actions = ACTIONS[ex.status];
  const dayOfWindow = ex.deliveredAt ? Math.max(1, Math.ceil((new Date(ex.createdAt).getTime() - new Date(ex.deliveredAt).getTime()) / DAY)) : null;
  const windowOpenNow = !!ex.exchangeableUntil && Date.now() <= new Date(ex.exchangeableUntil).getTime();
  const lastNote = [...ex.history].reverse().find((h) => h.note && h.status !== "REQUESTED");

  const COPY: Record<Action, { title: string; button: string; body: string; ok: string; noteLabel: string; danger?: boolean }> = {
    approve: {
      title: `Approve ${ex.number}?`,
      button: "Approve exchange",
      body: `The customer is emailed return instructions with the store address. Nothing is restocked or credited until you mark the item received.`,
      ok: "Approved · return instructions emailed",
      noteLabel: "Note to customer (optional)",
    },
    decline: {
      title: `Decline ${ex.number}?`,
      button: "Decline exchange",
      body: "This closes the request. The customer is emailed the reason below and can send a new request while their exchange window is open.",
      ok: "Declined · customer emailed",
      noteLabel: "Reason (emailed to the customer)",
      danger: true,
    },
    receive: {
      title: `Mark ${ex.number} received?`,
      button: `Mark received · issue ${naira(value)}`,
      body: `Only confirm once ${plural(pieces, "piece has", "pieces have")} come back unworn with tags. This restocks ${plural(pieces, "unit", "units")} and immediately issues ${naira(value)} exchange credit to ${ex.customer.email}, who is emailed. Credit can't be taken back from here.`,
      ok: "Received · credit issued and stock restored",
      noteLabel: "Note to customer (optional)",
    },
    complete: {
      title: `Complete ${ex.number}?`,
      button: "Complete exchange",
      body: `Closes the exchange. Order ${ex.orderNumber} is marked exchanged once it has no other open exchanges.`,
      ok: "Completed",
      noteLabel: "Internal note on the timeline (optional)",
    },
  };

  const open = (a: Action) => {
    setAction(a);
    setNote("");
    setNoteError(null);
  };
  const confirm = async () => {
    if (!action) return;
    if (action === "decline" && !note.trim()) {
      setNoteError("Give the customer a reason for declining");
      return;
    }
    setBusy(true);
    try {
      await adminApi.exchangeAction(ex.id, action, note.trim() || undefined);
      toast.show({ message: COPY[action].ok });
      setAction(null);
      await reload();
    } catch (e) {
      onError(e);
      toast.show({ message: apiMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const ACTION_LABEL: Record<Action, string> = { approve: "Approve", decline: "Decline", receive: `Mark item received · issue ${naira(value)}`, complete: "Complete" };

  return (
    <>
      <AdminHead
        index={`Exchanges / ${ex.number} · Requested ${longDate(ex.createdAt)}`}
        title={
          <span className="ex-admin__title">
            {ex.number}
            <span className={`status-pill status-pill--${ex.status.toLowerCase()}`}>{EXCHANGE_STATUS_LABEL[ex.status]}</span>
          </span>
        }
        actions={<Link href="/admin/exchanges" className="btn btn--ghost">← All exchanges</Link>}
      />

      <div className="admin-grid ex-admin__grid">
        <section className="admin-card admin-card--wide">
          <div className="mono-label admin-card__head">Status</div>
          <StepTracker steps={t.steps} reached={t.reached} declined={t.declined} />
          {ex.status === "DECLINED" && lastNote?.note && (
            <div className="notice notice--red">
              <span className="mono-xs">Reason given</span>
              <br />
              {lastNote.note}
            </div>
          )}
          {ex.creditKobo > 0 && (
            <div className="notice row between wrap gap-12">
              <span>
                <span className="mono-xs">Credit issued</span>
                <br />
                {naira(ex.creditKobo)} exchange credit to {ex.customer.email}
              </span>
              <span className="serif ex-admin__credit tnum">{naira(ex.creditKobo)}</span>
            </div>
          )}
          {ex.status === "ITEM_RECEIVED" && (
            <div className="notice notice--red">Item received but credit has not been issued yet. Refresh in a moment; if it stays here, check the server logs.</div>
          )}
          {actions.length > 0 && (
            <div className="row gap-12 wrap ex-admin__actions">
              {actions.map((a) => (
                <button key={a} className={a === "decline" ? "btn btn--ghost" : "btn btn--short"} onClick={() => open(a)} disabled={busy}>
                  {ACTION_LABEL[a]}
                </button>
              ))}
            </div>
          )}
          {ex.status === "APPROVED" && (
            <p className="mono-xs">Marking received restocks {plural(pieces, "unit", "units")} and issues {naira(value)} credit in one step.</p>
          )}
          {(ex.status === "COMPLETED" || ex.status === "DECLINED") && <p className="mono-xs">Closed · no further actions.</p>}
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Customer</div>
          <dl className="order-meta">
            <div><dt className="mono-xs">Name</dt><dd>{ex.customer.name ?? "—"}</dd></div>
            <div><dt className="mono-xs">Email</dt><dd><a className="ap-link" href={`mailto:${ex.customer.email}`}>{ex.customer.email}</a></dd></div>
            <div><dt className="mono-xs">Phone</dt><dd>{ex.customer.phone ? <a className="ap-link" href={`tel:${ex.customer.phone}`}>{ex.customer.phone}</a> : "—"}</dd></div>
            <div><dt className="mono-xs">Account</dt><dd>{ex.customer.userId ? "Account holder — credit lands on their account" : "Guest — credit is held against this email"}</dd></div>
          </dl>
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Order · delivery window</div>
          <dl className="order-meta">
            <div>
              <dt className="mono-xs">Order</dt>
              <dd>
                {ex.orderId ? <Link href={`/admin/orders/${ex.orderId}`} className="ap-link">{ex.orderNumber}</Link> : ex.orderNumber}{" "}
                <span className={`status-pill status-pill--${ex.orderStatus.toLowerCase()}`}>{ORDER_STATUS_LABEL[ex.orderStatus]}</span>
              </dd>
            </div>
            <div><dt className="mono-xs">Delivered</dt><dd>{ex.deliveredAt ? longDate(ex.deliveredAt) : "No delivery date recorded"}</dd></div>
            <div>
              <dt className="mono-xs">Exchange window · {ex.exchangeWindowDays} days</dt>
              <dd>
                {ex.exchangeableUntil ? <>Until {longDate(ex.exchangeableUntil)}{windowOpenNow ? "" : " · now closed"}</> : "—"}
              </dd>
            </div>
          </dl>
          {ex.requestedWithinWindow ? (
            <div className="notice">
              Requested {dayOfWindow ? <>on day {Math.min(dayOfWindow, ex.exchangeWindowDays)} of {ex.exchangeWindowDays}</> : ""} — <b>within the exchange window</b>.
            </div>
          ) : (
            <div className="notice notice--red">Requested <b>outside the exchange window</b>.</div>
          )}
        </section>

        <section className="admin-card admin-card--wide">
          <div className="mono-label admin-card__head">Pieces being exchanged · {pieces}</div>
          <div className="table-scroll">
            <table className="admin-table ex-admin__items">
              <thead>
                <tr><th aria-label="Image" /><th>Piece</th><th className="num">Qty</th><th className="num ex-admin__paid">Paid each</th><th className="num">Credit value</th></tr>
              </thead>
              <tbody>
                {ex.items.map((i) => (
                  <tr key={i.orderItemId}>
                    <td className="ex-admin__thumbcell">
                      <span className="ex-admin__thumb"><ProductImage src={i.imageUrl} alt="" kind={iconKind({ material: null, name: i.name })} iconSize={20} sizes="56px" /></span>
                    </td>
                    <td>
                      <span className="serif ex-admin__name">{i.name}</span>
                      <div className="mono-xs">{[i.number, i.colour, i.size, i.sku].filter(Boolean).join(" · ") || "—"}</div>
                    </td>
                    <td className="num">× {i.quantity}</td>
                    <td className="num tnum ex-admin__paid">{i.paidUnitKobo !== null ? naira(i.paidUnitKobo) : "—"}</td>
                    <td className="num tnum">{naira(i.valueKobo)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="ex-admin__totallabel"><b>Credit value</b> <span className="mono-xs">· What the customer paid, after discounts</span></td>
                  <td className="ex-admin__paid" aria-hidden />
                  <td className="num tnum"><b>{naira(value)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Reason</div>
          <p className="serif ex-admin__reason">{ex.reason}</p>
          {ex.note ? <blockquote className="ex-admin__quote">“{ex.note}”</blockquote> : <p className="muted">No note from the customer.</p>}
        </section>

        <section className="admin-card">
          <div className="mono-label admin-card__head">Photos · {ex.photoUrls.length}</div>
          {ex.photoUrls.length ? (
            <div className="ex-admin__photos">
              {ex.photoUrls.map((u, k) => (
                <button key={u} type="button" className="ex-admin__photo" onClick={() => setPhoto(k)} aria-label={`Open photo ${k + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Customer photo ${k + 1}`} />
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">The customer didn&apos;t upload photos.</p>
          )}
        </section>

        <section className="admin-card admin-card--wide">
          <div className="mono-label admin-card__head">Timeline</div>
          <ol className="ex-admin__timeline">
            {ex.history.map((h, k) => (
              <li key={k}>
                <span className="mono-xs">{longDate(h.at)} · {new Date(h.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                <span><b>{EXCHANGE_STATUS_LABEL[h.status]}</b>{h.note ? ` — ${h.note}` : ""}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Modal open={action !== null} onClose={() => !busy && setAction(null)} title={action ? COPY[action].title : ""}>
        {action && (
          <>
            <p>{COPY[action].body}</p>
            <TextAreaBox
              label={COPY[action].noteLabel}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError(null);
              }}
              error={noteError ?? undefined}
              rows={3}
              maxLength={2000}
              full
            />
            <div className="row gap-12 wrap">
              <button className={`btn btn--short${COPY[action].danger ? " btn--danger" : ""}`} disabled={busy} onClick={confirm}>
                {busy ? "Working…" : COPY[action].button}
              </button>
              <button className="btn btn--ghost" disabled={busy} onClick={() => setAction(null)}>Cancel</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title={`Photo ${(photo ?? 0) + 1} of ${ex.photoUrls.length}`} wide>
        {photo !== null && (
          <>
            <div className="ex-admin__large">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ex.photoUrls[photo]} alt={`Customer photo ${photo + 1}`} />
            </div>
            <div className="row between wrap gap-12">
              <a href={ex.photoUrls[photo]} target="_blank" rel="noopener noreferrer" className="ap-link small-link">Open original ↗</a>
              {ex.photoUrls.length > 1 && (
                <span className="row gap-8">
                  <button className="btn btn--ghost" onClick={() => setPhoto((photo + ex.photoUrls.length - 1) % ex.photoUrls.length)}>← Prev</button>
                  <button className="btn btn--ghost" onClick={() => setPhoto((photo + 1) % ex.photoUrls.length)}>Next →</button>
                </span>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
