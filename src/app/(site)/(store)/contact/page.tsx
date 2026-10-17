import type { Metadata } from "next";
import { ContentPage } from "@/components/home/ContentPage";
import { ContactForm } from "@/components/home/ContactForm";
import { getSettings } from "@/lib/server-data";
import { whatsappLink } from "@/lib/product";
import { SITE_URL } from "@/lib/env";

export const revalidate = 300;
export const metadata: Metadata = { title: "Contact", description: "WhatsApp, phone, email or visit the Amerapelle store in Lagos.", alternates: { canonical: `${SITE_URL}/contact` } };

export default async function ContactPage() {
  const s = await getSettings();
  const map = s.pickupAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.pickupAddress)}` : null;
  const ig = s.instagramUrl ? "@" + s.instagramUrl.replace(/\/$/, "").split("/").pop() : null;
  return (
    <ContentPage title="Contact us" lede="A stylist answers on WhatsApp, usually within minutes during opening hours.">
      <dl className="details-list">
        <div>
          <dt>WhatsApp</dt>
          <dd><a href={whatsappLink(s.whatsappNumber, "Hi Amerapelle, ")} className="u-link" target="_blank" rel="noopener noreferrer">Message a stylist</a></dd>
        </div>
        {s.contactPhone && (
          <div><dt>Phone</dt><dd><a href={`tel:${s.contactPhone}`}>{s.contactPhone}</a></dd></div>
        )}
        {s.contactEmail && (
          <div><dt>Email</dt><dd><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></dd></div>
        )}
        {s.instagramUrl && (
          <div><dt>Instagram</dt><dd><a href={s.instagramUrl} target="_blank" rel="noopener noreferrer">{ig}</a></dd></div>
        )}
        <div>
          <dt>Visit</dt>
          <dd>
            {s.pickupAddress || "Lagos, Nigeria"}
            {s.openingHours && <><br /><span className="t-grey">{s.openingHours}</span></>}
            {map && <><br /><a href={map} className="u-link" target="_blank" rel="noopener noreferrer">Get directions</a></>}
          </dd>
        </div>
      </dl>
      <section className="content__section" aria-labelledby="msg-h">
        <h2 id="msg-h" className="t-title">Send a message</h2>
        <ContactForm />
      </section>
    </ContentPage>
  );
}
