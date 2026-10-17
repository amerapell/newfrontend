import Link from "next/link";
import { Photo, realImage } from "@/components/ui/Photo";

/** Mega-menu feature (§5): landscape 16:10 image (or --placeholder ground) with a 14px caption beneath. */
export function MegaFeature({ href, image, caption }: { href: string; image: string | null | undefined; caption: string }) {
  const src = realImage(image);
  if (!src) return null;
  return (
    <Link href={href} className="mega__feature">
      <span className="mega__img">
        <Photo src={src} alt="" sizes="20vw" />
      </span>
      <span className="mega__cap">{caption}</span>
    </Link>
  );
}
