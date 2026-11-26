import { notFound } from "next/navigation";
import { getPublicCanvasMenu, getPublicMenuMetadata, getPublicMenuStatusCached } from "@/modules/public-menu/server";
import { PublicCanvasScreen } from "@/modules/public-menu/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-stone-50 px-5 text-center text-stone-900">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-7 sm:p-10">
        <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
          Menú digital
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          Carta en preparación
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
          El equipo de cocina y sala está preparando su propuesta. Pronto estará disponible en este enlace.
        </p>
      </div>
    </main>
  );
}
