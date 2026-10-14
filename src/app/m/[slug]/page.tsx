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
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f8f5ee] px-6 text-center text-[#1c2c1a]">
      <div className="max-w-md rounded-3xl border border-[#1c2c1a]/10 bg-white/75 p-8 shadow-sm backdrop-blur-xs sm:p-12">
        <span className="inline-flex rounded-full bg-[#eef3eb] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3d5934]">
          Menú digital
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#141d14] sm:text-4xl">
          Carta en preparación
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#556353]">
          El equipo de cocina y sala está preparando su propuesta. Pronto estará disponible en este enlace.
        </p>
      </div>
    </main>
  );
}
