import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Layers, Store } from "lucide-react";
import { organizationManagement } from "@/modules/organization-management/server";
import { menuTemplates } from "@/modules/menu-editor/server";
import { landingManagement } from "@/modules/landing-management/server";
import {
  RESTAURANT_FEATURE_CATALOG,
  hasRestaurantFeature,
} from "@/modules/restaurant-management/contracts";

export const metadata: Metadata = { title: "Superadmin" };

export default async function SuperAdminPage() {
  const [organizations, pendingMenu, pendingLanding] = await Promise.all([
    organizationManagement.listOrganizations(),
    menuTemplates.listForSuperadmin({ tab: "pending", query: "", page: 1, pageSize: 1 }),
    landingManagement.listTemplatesForSuperadmin({ tab: "pending", query: "", page: 1, pageSize: 1 }),
  ]);

  const allRestaurants = organizations.flatMap((org) => org.restaurants);
  const activeRestaurants = allRestaurants.filter((r) => r.status === "ACTIVE").length;
  const activeOrganizations = organizations.filter((o) => o.status === "ACTIVE").length;
  const pendingTemplates = pendingMenu.total + pendingLanding.total;

  const featureAdoption = RESTAURANT_FEATURE_CATALOG.map((feature) => {
    const enabledCount = allRestaurants.filter((r) =>
      hasRestaurantFeature(r, feature.key),
    ).length;
    const percentage =
      allRestaurants.length > 0
        ? Math.round((enabledCount / allRestaurants.length) * 100)
        : 0;
    return { ...feature, enabledCount, percentage };
  });

  const avgModules =
    allRestaurants.length > 0
      ? (
          featureAdoption.reduce((acc, item) => acc + item.enabledCount, 0) /
          allRestaurants.length
        ).toFixed(1)
      : "0.0";

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Panel de plataforma
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Estado comercial de clientes, adopción de módulos por local y moderación de plantillas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/superadmin/templates"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            <Layers className="h-4 w-4" />
            Plantillas ({pendingTemplates} pend.)
          </Link>
          <Link
            href="/superadmin/clients"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            <Building2 className="h-4 w-4" />
            Administrar clientes
          </Link>
        </div>
      </header>

      <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Organizaciones"
          value={String(organizations.length)}
          detail={`${activeOrganizations} activas`}
        />
        <KpiCard
          title="Locales registrados"
          value={String(allRestaurants.length)}
          detail={`${activeRestaurants} operativos`}
        />
        <KpiCard
          title="Módulos por local"
          value={avgModules}
          detail={`Promedio sobre ${RESTAURANT_FEATURE_CATALOG.length} disponibles`}
        />
        <KpiCard
          title="Plantillas pendientes"
          value={String(pendingTemplates)}
          detail={`${pendingMenu.total} menú · ${pendingLanding.total} landing`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-stone-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Adopción por módulo comercial
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Locales habilitados sobre un total de {allRestaurants.length}.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {featureAdoption.map((item) => (
              <div key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-800">{item.label}</span>
                  <span className="tabular-nums text-xs font-medium text-stone-600">
                    {item.enabledCount} / {allRestaurants.length} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-stone-900 transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white lg:col-span-7">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Clientes recientes</h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Últimas organizaciones registradas y sus módulos activos.
              </p>
            </div>
            <Link
              href="/superadmin/clients"
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {organizations.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              No hay organizaciones registradas todavía.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {organizations.slice(0, 6).map((org) => {
                const enabledKeys = RESTAURANT_FEATURE_CATALOG.filter((feature) =>
                  org.restaurants.some((r) => hasRestaurantFeature(r, feature.key)),
                );
                return (
                  <div
                    key={org.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-stone-900">{org.name}</p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            org.status === "ACTIVE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {org.status === "ACTIVE" ? "Activa" : "Suspendida"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {org.email} · <Store className="inline h-3 w-3" /> {org.restaurants.length}{" "}
                        {org.restaurants.length === 1 ? "local" : "locales"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {enabledKeys.length === 0 ? (
                        <span className="text-xs text-stone-400">Sin módulos</span>
                      ) : (
                        enabledKeys.map((feat) => (
                          <span
                            key={feat.key}
                            className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                          >
                            {feat.shortLabel}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium text-stone-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-stone-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
