import { Providers } from "@/context/Providers";
import { getCollections, getNavCategories, getSettings } from "@/lib/server-data";
import { CookieNotice } from "@/components/chrome/CookieNotice";
import { SearchDrawer } from "@/components/chrome/SearchDrawer";
import { MobileMenu } from "@/components/chrome/MobileMenu";
import { BagDrawer } from "@/components/cart/BagDrawer";
import { SizeGuideModal } from "@/components/product/SizeGuideModal";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, collections, navCategories] = await Promise.all([getSettings(), getCollections(), getNavCategories()]);
  return (
    <Providers settings={settings} collections={collections} navCategories={navCategories}>
      {children}
      <SearchDrawer />
      <MobileMenu />
      <BagDrawer />
      <SizeGuideModal />
      <CookieNotice />
    </Providers>
  );
}
