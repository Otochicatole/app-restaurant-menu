import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenu, getPublicMenuMetadata } from "@/modules/public-menu/server";
import { PublicMenuScreen } from "@/modules/public-menu/ui";
import { NotFoundError } from "@/platform/application/errors";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const metadata = await getPublicMenuMetadata((await params).slug);
    return {
      title: metadata.title,
      description: metadata.description,
      openGraph: { title: metadata.title, description: metadata.description, type: "website" },
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { title: "Menú no disponible", robots: { index: false, follow: false } };
    }
    throw error;
  }
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const menu = await requirePublicMenu((await params).slug);
  return <PublicMenuScreen menu={menu} />;
}

async function requirePublicMenu(slug: string) {
  try {
    return await getPublicMenu(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
