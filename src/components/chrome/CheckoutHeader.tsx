import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ArrowIcon } from "./Icons";

/** Checkout chrome (§7): "⟵ Back to bag" left, logo centred, "Secure checkout" 13px right. */
export function CheckoutHeader() {
  return (
    <header className="co-header">
      <Link href="/bag" className="co-header__back">
        <ArrowIcon dir="left" />
        <span className="hide-mobile">Back to bag</span>
        <span className="sr-only show-mobile">Back to bag</span>
      </Link>
      <Link href="/" className="co-header__logo" aria-label="Amerapelle — home">
        <Logo size={40} className="hide-mobile" />
        <Logo size={28} className="show-mobile" />
      </Link>
      <span className="co-header__secure t-small">Secure checkout</span>
    </header>
  );
}
