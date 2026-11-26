import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { FontLibraryClient } from "@/modules/menu-editor/ui";

export const metadata: Metadata = { title: "Fuentes" };

export default async function RestaurantFontsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId, restaurant } = await requireRestaurantContext(
    (await params).restaurantId,
  );
  const fonts = await menuEditor.listAssets(restaurantId, "FONT");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <Link
            href={`/admin/restaurants/${encodeURIComponent(restaurantId)}/settings`}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a ajustes
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Biblioteca de fuentes
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Tipografías disponibles para el editor de{" "}
            <span className="font-medium text-stone-800">{restaurant.name}</span>.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <FontLibraryClient
          key={restaurantId}
          restaurantId={restaurantId}
          initialAssets={fonts}
        />
      </section>
    </div>
  );
}
