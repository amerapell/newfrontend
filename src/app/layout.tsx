import type { Metadata, Viewport } from "next";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/ui.css";
import "../styles/chrome.css";
import "../styles/shop.css";
/* page styles (design-v3 "Maison") */
import "../styles/home.css";
import "../styles/product.css";
import "../styles/content.css";
import "../styles/motion.css";
import "../styles/commerce.css";
import "../styles/admin.css";
import { fontVars } from "./fonts";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Amerapelle — Quiet luxury, loud entrance", template: "%s · Amerapelle" },
  description: "Lagos luxury fashion: tailoring, leather and silk in limited runs. Delivered across Nigeria. Exchange, not refund.",
  applicationName: "Amerapelle",
  openGraph: { type: "website", siteName: "Amerapelle", locale: "en_NG", url: SITE_URL },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#fffffa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" style={fontVars}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
