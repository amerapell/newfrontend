"use client";
import { useEffect, useState } from "react";
import { exchangesApi } from "@/lib/api";
import { naira } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { Check } from "./Check";

/** Latest exchange that produced credit, e.g. "Exchange EX-2031" — shown under the credit toggle. */
export function useCreditSource() {
  const { status } = useAuth();
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "authed") return;
    // credit entry reasons are codes (EXCHANGE_CREDIT …); the exchange number comes from /me/exchanges
    exchangesApi
      .mine()
      .then((list) => {
        const e = list.find((x) => x.status === "CREDIT_ISSUED" || x.status === "COMPLETED");
        setSource(e ? `Exchange ${e.number}` : null);
      })
      .catch(() => {});
  }, [status]);
  return source;
}

/** Checkbox row: "Use ₦62,500 exchange credit" with a 12px source line. */
export function CreditToggle({ amountKobo, on, onChange, source, id = "use-credit" }: { amountKobo: number; on: boolean; onChange: (v: boolean) => void; source?: string | null; id?: string }) {
  return (
    <Check id={id} checked={on} onChange={onChange} sub={source ? `From ${source}` : undefined}>
      Use {naira(amountKobo)} exchange credit
    </Check>
  );
}
