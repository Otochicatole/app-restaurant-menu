import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCanvasMenu, getPublicMenu, getPublicMenuMetadata, getPublicMenuModeCached } from "@/modules/public-menu/server";
import { PublicCanvasScreen, PublicMenuScreen } from "@/modules/public-menu/ui";
import { NotFoundError } from "@/platform/application/errors";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const canvas = await getPublicCanvasMenu((await params).slug);
    if (canvas) return { title: canvas.profile.name, description: canvas.profile.description, openGraph: { title: canvas.profile.name, description: canvas.profile.description, type: "website" } };
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
  const slug = (await params).slug;
  const mode = await getPublicMenuModeCached(slug);
  if (mode === "canvas") {
    const canvas = await getPublicCanvasMenu(slug);
    if (canvas) return <PublicCanvasScreen menu={canvas} />;
  }
  if (mode === "preparation") return <PreparationScreen />;
  const menu = await requirePublicMenu(slug);
  return <PublicMenuScreen menu={menu} />;
}

function PreparationScreen() {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-[#F3EEDC] px-6 text-center text-[#3A4824]"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#AB5641]">Menú digital</p><h1 className="mt-4 text-4xl font-semibold">Carta en preparación</h1><p className="mt-3 text-sm text-[#3A4824]/70">Este restaurante todavía no publicó su diseño.</p></div></main>;
}

async function requirePublicMenu(slug: string) {
  try {
    return await getPublicMenu(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
