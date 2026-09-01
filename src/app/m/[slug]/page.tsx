import { notFound } from "next/navigation";
import { getPublicCanvasMenu, getPublicMenuMetadata, getPublicMenuStatusCached } from "@/modules/public-menu/server";
import { PublicCanvasScreen } from "@/modules/public-menu/ui";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const metadata = await getPublicMenuMetadata((await params).slug);
  return metadata ?? { title: "Carta no encontrada", description: "La carta solicitada no existe." };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const status = await getPublicMenuStatusCached(slug);
  if (!status) notFound();
  if (status === "preparation") return <PreparationScreen />;
  const canvas = await getPublicCanvasMenu(slug);
  if (!canvas) notFound();
  return <PublicCanvasScreen menu={canvas} />;
}

function PreparationScreen() {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-[#F3EEDC] px-6 text-center text-[#3A4824]"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#AB5641]">Menú digital</p><h1 className="mt-4 text-4xl font-semibold">Carta en preparación</h1><p className="mt-3 text-sm text-[#3A4824]/70">Este restaurante todavía no publicó su diseño.</p></div></main>;
}
