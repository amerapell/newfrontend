"use client";
import { useState } from "react";
import { FieldBox, SelectBox, TextAreaBox } from "@/components/ui/Field";
import { contentApi } from "@/lib/api";
import { apiMessage, toE164NG } from "@/lib/format";

/** PG-3 contact form → POST /contact (emails admin). */
export function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "Order question", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  if (state === "ok")
    return (
      <div className="cm-form" role="status">
        <p className="t-title">Thank you.</p>
        <p>We&apos;ve got your message and will reply within one working day. For anything urgent, WhatsApp is fastest.</p>
      </div>
    );
  return (
    <form
      className="cm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || !f.message.trim()) {
          setState("err");
          setMsg("Add your name, a valid email and a message.");
          return;
        }
        if (f.phone && !toE164NG(f.phone)) {
          setState("err");
          setMsg("Enter a Nigerian phone number, or leave it blank.");
          return;
        }
        setState("busy");
        try {
          await contentApi.contact({ name: f.name.trim(), email: f.email.trim(), phone: f.phone ? toE164NG(f.phone)! : undefined, subject: f.subject, message: f.message.trim() });
          setState("ok");
        } catch (x) {
          setState("err");
          setMsg(apiMessage(x));
        }
      }}
    >
      <p className="cm-small cm-auth__req">*Required fields</p>
      <div className="cm-fields">
        <FieldBox label="Name*" autoComplete="name" value={f.name} onChange={set("name")} required />
        <FieldBox label="Email*" type="email" autoComplete="email" value={f.email} onChange={set("email")} required />
        <FieldBox label="Phone (optional)" type="tel" autoComplete="tel-national" value={f.phone} onChange={set("phone")} />
        <SelectBox label="Subject" value={f.subject} onChange={set("subject")}>
          {["Order question", "Sizing & fit", "Exchange", "Delivery", "Press & collaborations", "Something else"].map((s) => <option key={s}>{s}</option>)}
        </SelectBox>
        <TextAreaBox full label="Message*" rows={5} value={f.message} onChange={set("message")} required />
      </div>
      {state === "err" && <p className="cm-error" role="alert">{msg}</p>}
      <button className="btn btn--primary btn--block" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send message"}</button>
    </form>
  );
}
