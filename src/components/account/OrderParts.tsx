import { ProductImage } from "@/components/product/ProductImage";
import { ORDER_STATUS_LABEL, longDate, naira } from "@/lib/format";
import { iconKind } from "@/lib/product";
import type { Order } from "@/lib/types";
import { addressLines } from "@/lib/countries";

/** Minimal progress: a row of steps, each with a 1px rule on top (ink once reached), 14px label, 12px soft description. */
export function Progress({ steps, reached, declined, label = "Progress" }: { steps: { label: string; desc?: string }[]; reached: number; declined?: boolean; label?: string }) {
  return (
    <ol className="cm-progress" aria-label={label} style={{ ["--steps" as string]: steps.length }}>
      {steps.map((s, k) => {
        const done = k < reached;
        const current = k === reached - 1;
        return (
          <li key={s.label} className={`cm-progress__step${done ? " is-done" : ""}${current && declined ? " is-declined" : ""}`} aria-current={current ? "step" : undefined}>
            <span className="cm-progress__label">
              {s.label}
              <span className="sr-only">{done ? (current && declined ? " — declined" : " — done") : " — to come"}</span>
            </span>
            {s.desc && <span className="cm-progress__desc">{current && declined ? "Declined" : s.desc}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="cm-lines cm-lines--static" aria-label="Items">
      {order.items.map((i) => (
        <li key={i.id} className="cm-line">
          <span className="cm-line__img">
            <ProductImage src={i.imageUrl} alt="" kind={iconKind({ material: null, name: i.name })} iconSize={24} sizes="80px" />
          </span>
          <div className="cm-line__body">
            <div className="cm-line__top">
              <div className="cm-line__info">
                <span className="cm-line__name">{i.name}</span>
                <span className="cm-soft">{[i.colour, i.size].filter(Boolean).join(" / ")}{i.quantity > 1 ? ` · Qty ${i.quantity}` : ""}</span>
                {!i.exchangeable && <span className="cm-small cm-soft">Final sale — not exchangeable</span>}
              </div>
              <span className="cm-line__price tnum">{naira(i.unitKobo * i.quantity)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const PROVIDER: Record<string, string> = { PAYSTACK: "Paystack", BACHS: "Bachs", CREDIT: "Exchange credit" };

export function OrderTotals({ order }: { order: Order }) {
  return (
    <div className="cm-rows">
      <div className="cm-row"><span>Subtotal</span><span className="tnum">{naira(order.subtotalKobo)}</span></div>
      {order.discountKobo > 0 && <div className="cm-row"><span>Promo</span><span className="tnum">−{naira(order.discountKobo)}</span></div>}
      <div className="cm-row"><span>Delivery · {order.delivery.name}</span><span className="tnum">{order.deliveryKobo ? naira(order.deliveryKobo) : "Free"}</span></div>
      {order.creditAppliedKobo > 0 && <div className="cm-row"><span>Exchange credit</span><span className="tnum">−{naira(order.creditAppliedKobo)}</span></div>}
      <div className="cm-row cm-row--total"><span>Total</span><span className="tnum">{naira(order.amountDueKobo)}</span></div>
    </div>
  );
}

/** Status, date, payment and address as a label / value list. */
export function OrderMeta({ order }: { order: Order }) {
  const a = order.delivery.address;
  return (
    <dl className="cm-dl">
      <div><dt>Status</dt><dd>{ORDER_STATUS_LABEL[order.status]}</dd></div>
      <div><dt>Placed</dt><dd>{longDate(order.createdAt)}</dd></div>
      {order.payment?.provider && (
        <div>
          <dt>Payment</dt>
          <dd>{PROVIDER[order.payment.provider] ?? "Card"}{order.payment.reference ? <span className="cm-soft"> · {order.payment.reference}</span> : null}</dd>
        </div>
      )}
      <div>
        <dt>{a ? "Deliver to" : "Collection"}</dt>
        <dd>
          {a ? (
            <>
              {a.fullName}
              {addressLines(a).map((l) => (
                <span key={l}><br />{l}</span>
              ))}
              {a.landmark && <><br /><span className="cm-soft">Near {a.landmark}</span></>}
            </>
          ) : (
            order.delivery.name
          )}
        </dd>
      </div>
      {order.delivery.trackingNumber && (
        <div>
          <dt>Tracking</dt>
          <dd>
            <span className="tnum">{order.delivery.trackingNumber}</span>
            {order.delivery.trackingUrl && (
              <>
                <br />
                <a href={order.delivery.trackingUrl} target="_blank" rel="noopener noreferrer" className="u-link">Track your parcel on DHL</a>
              </>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}
