import Link from "next/link";
import { Providers } from "@/context/Providers";
import { getCollections, getNavCategories, getSettings } from "@/lib/server-data";
import { PromoBar } from "@/components/chrome/PromoBar";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { SearchDrawer } from "@/components/chrome/SearchDrawer";
import { MobileMenu } from "@/components/chrome/MobileMenu";
import { BagDrawer } from "@/components/cart/BagDrawer";

export default async function NotFound() {
  const [settings, collections, navCategories] = await Promise.all([getSettings(), getCollections(), getNavCategories()]);
  return (
    <Providers settings={settings} collections={collections} navCategories={navCategories}>
      <PromoBar />
      <Header />
      <main id="main" tabIndex={-1} className="nf container">
        <p className="t-small t-grey">Error 404</p>
        <h1 className="t-display">This page can&apos;t be found.</h1>
        <p>The piece may have sold out, or the link may be wrong. There&apos;s plenty more in the store.</p>
        <div className="nf__links">
          <Link href="/c/new-in" className="btn btn--primary">Discover New In</Link>
          <Link href="/" className="u-link">Back to the home page</Link>
        </div>
      </main>
      <Footer />
      <SearchDrawer />
      <MobileMenu />
      <BagDrawer />
    </Providers>
  );
}
