import type { ReactNode } from "react";

/** Content pages (§7): centred 680px column, 26px H1, body 14px / 1.6. */
export function ContentPage({ title, lede, children, wide }: { title: ReactNode; lede?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <article className={`content${wide ? " content--wide" : ""}`}>
      <header className="content__head">
        <h1 className="t-display">{title}</h1>
        {lede && <p className="content__lede">{lede}</p>}
      </header>
      {children}
    </article>
  );
}
