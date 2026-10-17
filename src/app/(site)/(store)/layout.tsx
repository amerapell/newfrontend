import { PromoBar } from "@/components/chrome/PromoBar";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PromoBar />
      <Header />
      <main id="main" tabIndex={-1} className="store-main">
        {children}
      </main>
      <Footer />
    </>
  );
}
