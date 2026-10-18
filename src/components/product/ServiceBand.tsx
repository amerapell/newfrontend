import Link from "next/link";

/** Service band (§7 Product): --stage ground, three columns of short promises with underlined links. */
export function ServiceBand({ exchangeDays }: { exchangeDays: number }) {
  const items = [
    { title: "Delivery across Nigeria", text: "Lagos in 1–3 working days, every other state in 3–5.", link: "Delivery", href: "/policies/delivery" },
    { title: "Exchange, never a refund", text: `Unworn pieces can be exchanged for store credit within ${exchangeDays} days.`, link: "How exchanges work", href: "/policies/exchanges" },
    { title: "Curated with care", text: "Fashion, statement handbags, footwear and accessories, chosen for quality and finish.", link: "Our story", href: "/about" },
  ];
  return (
    <section className="band" aria-label="Our services">
      <ul className="band__cols">
        {items.map((i) => (
          <li key={i.title}>
            <h3>{i.title}</h3>
            <p>{i.text}</p>
            <Link href={i.href} className="u-link">{i.link}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
