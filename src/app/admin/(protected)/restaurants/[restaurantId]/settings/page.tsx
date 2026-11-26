import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Lock, Type, UserRound } from "lucide-react";
import {
  RESTAURANT_FEATURE_CATALOG,
  hasRestaurantFeature,
  requireRestaurantContext,
} from "@/modules/restaurant-management/server";
import { menuEditor, requireActiveMenuProject } from "@/modules/menu-editor/server";
import { RestaurantProfileForm } from "@/modules/menu-editor/ui";

export const metadata: Metadata = { title: "Ajustes" };

export default async function RestaurantSettingsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId, restaurant, organizationName } =
    await requireRestaurantContext((await params).restaurantId);
  const project = await requireActiveMenuProject(restaurantId);
  const profile = await menuEditor.getProfile(restaurantId, project.id);

  const menuEnabled = hasRestaurantFeature(restaurant, "menu");
  const landingEnabled = hasRestaurantFeature(restaurant, "landing");
  const quotaMb = Math.max(
    1,
    Math.round(restaurant.assetQuotaBytes / (1024 * 1024)),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Ajustes de {restaurant.name}
            </h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                restaurant.status === "ACTIVE"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {restaurant.status === "ACTIVE" ? "Operativo" : "Suspendido"}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Identidad pública del local, tipografías del editor y estado de tu plan en{" "}
            <span className="font-medium text-stone-800">{organizationName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {menuEnabled && (
            <a
              href={`/m/${profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Ver carta <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {landingEnabled && (
            <a
              href={`/l/${profile.landingSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Ver landing <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-stone-200 bg-white p-6 lg:col-span-7">
          <div className="mb-5 border-b border-stone-100 pb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Identidad y enlaces públicos
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Nombre comercial, descripción visible y slugs para compartir tu carta y sitio web.
            </p>
          </div>
          <RestaurantProfileForm
            key={restaurantId}
            restaurantId={restaurantId}
            initialData={profile}
            menuEnabled={menuEnabled}
            landingEnabled={landingEnabled}
          />
        </section>

        <aside className="space-y-5 lg:col-span-5">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3.5">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Módulos de tu plan
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Cuota de archivos: {quotaMb} MB
                </p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-stone-100">
              {RESTAURANT_FEATURE_CATALOG.map((feature) => {
                const enabled = hasRestaurantFeature(restaurant, feature.key);
                return (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">{feature.label}</p>
                    </div>
                    {enabled ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <Check className="h-3 w-3" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        <Lock className="h-3 w-3" />
                        No incluido
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {menuEnabled && (
            <Link
              href={`/admin/restaurants/${encodeURIComponent(restaurantId)}/settings/fonts`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700">
                  <Type className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    Biblioteca de fuentes
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Subí tipografías personalizadas (.woff2, .ttf) para el editor de carta.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-700" />
            </Link>
          )}

          <Link
            href="/admin/account"
            className="group flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  Cuenta de la organización
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  El correo y la contraseña pertenecen a {organizationName}.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-700" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
