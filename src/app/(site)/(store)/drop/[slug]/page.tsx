import { permanentRedirect } from "next/navigation";

/** Drops are switched off: old /drop/… links (Instagram posts, emails) open the normal collection page. */
export default async function DropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/c/${slug}`);
}
