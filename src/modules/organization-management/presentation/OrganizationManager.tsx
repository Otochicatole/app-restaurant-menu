"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  Check,
  ExternalLink,
  KeyRound,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  Store,
  Trash2,
  X,
} from "lucide-react";
import type { ActionResult } from "@/platform/application/action-result";
import { matchesNormalizedSearch } from "@/platform/text/search";
import {
  RESTAURANT_FEATURE_CATALOG,
  featureFlagsFromRestaurant,
  hasRestaurantFeature,
  type RestaurantFeatureFlags,
  type RestaurantFeatureKey,
  type RestaurantSummary,
} from "@/modules/restaurant-management/contracts";
import type { OrganizationListItem } from "../contracts";

type OrganizationActionResult = ActionResult<{ temporaryPassword?: string }>;

type OrganizationActions = {
  create: (form: FormData) => Promise<OrganizationActionResult>;
  update: (form: FormData) => Promise<OrganizationActionResult>;
  status: (form: FormData) => Promise<OrganizationActionResult>;
  resetPassword: (form: FormData) => Promise<OrganizationActionResult>;
  remove: (form: FormData) => Promise<OrganizationActionResult>;
  restaurantOptions: (form: FormData) => Promise<OrganizationActionResult>;
};

const PLAN_PRESETS: readonly {
  id: string;
  label: string;
  flags: RestaurantFeatureFlags;
}[] = [
  {
    id: "menu-only",
    label: "Solo Menú",
    flags: { menu: true, landing: false, reservations: false, floorManagement: false, inventory: false },
  },
  {
    id: "web-reservations",
    label: "Web + Reservas",
    flags: { menu: true, landing: true, reservations: true, floorManagement: false, inventory: false },
  },
  {
    id: "floor-suite",
    label: "Salón Completo",
    flags: { menu: true, landing: false, reservations: true, floorManagement: true, inventory: false },
  },
  {
    id: "full-suite",
    label: "Full Suite",
    flags: { menu: true, landing: true, reservations: true, floorManagement: true, inventory: true },
  },
];

const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none";

function flagsEqual(a: RestaurantFeatureFlags, b: RestaurantFeatureFlags): boolean {
  return (
    a.menu === b.menu &&
    a.landing === b.landing &&
    a.reservations === b.reservations &&
    a.floorManagement === b.floorManagement &&
    a.inventory === b.inventory
  );
}

export function OrganizationManager({
  organizations,
  actions,
}: {
  organizations: OrganizationListItem[];
  actions: OrganizationActions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [featureFilter, setFeatureFilter] = useState<"ALL" | RestaurantFeatureKey>("ALL");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"modules" | "account">("modules");
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      if (statusFilter !== "ALL" && org.status !== statusFilter) return false;
      if (
        featureFilter !== "ALL" &&
        !org.restaurants.some((r) => hasRestaurantFeature(r, featureFilter))
      ) {
        return false;
      }
      if (!search.trim()) return true;
      return matchesNormalizedSearch(search, [
        org.name,
        org.email,
        org.slug,
        ...org.restaurants.flatMap((r) => [r.name, r.slug, r.landingSlug]),
      ]);
    });
  }, [organizations, search, statusFilter, featureFilter]);

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  );

  function openDrawer(orgId: string, tab: "modules" | "account" = "modules") {
    setSelectedOrgId(orgId);
    setDrawerTab(tab);
    setNotice(null);
  }

  function runAction(
    fn: () => Promise<OrganizationActionResult>,
    onSuccess: (result: OrganizationActionResult) => string,
  ) {
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setNotice({ kind: "error", text: result.error.message });
        return;
      }
      setNotice({ kind: "ok", text: onSuccess(result) });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Clientes y planes
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Administrá cuentas de clientes, cuotas y módulos comerciales habilitados por local.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </header>

      {notice && !selectedOrg && !createOpen && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, email, slug o local…"
                aria-label="Buscar clientes"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Filtrar por estado"
                className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1"
              >
                {(
                  [
                    ["ALL", "Todos"],
                    ["ACTIVE", "Activos"],
                    ["SUSPENDED", "Suspendidos"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === value
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-stone-500">Módulo activo:</span>
            <button
              type="button"
              onClick={() => setFeatureFilter("ALL")}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                featureFilter === "ALL"
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              Todos
            </button>
            {RESTAURANT_FEATURE_CATALOG.map((feature) => (
              <button
                key={feature.key}
                type="button"
                onClick={() => setFeatureFilter(feature.key)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  featureFilter === feature.key
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {feature.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-2 text-sm font-medium text-stone-900">
              No se encontraron organizaciones
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Probá limpiar los filtros o creá un nuevo cliente para comenzar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map((org) => {
              const enabledFeatures = RESTAURANT_FEATURE_CATALOG.filter((feature) =>
                org.restaurants.some((r) => hasRestaurantFeature(r, feature.key)),
              );
              return (
                <div
                  key={org.id}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-stone-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-stone-900">{org.name}</h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          org.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {org.status === "ACTIVE" ? "Activa" : "Suspendida"}
                      </span>
                      <span className="text-xs text-stone-400">/{org.slug}</span>
                    </div>

                    <p className="text-xs text-stone-500">
                      {org.email} ·{" "}
                      <span className="font-medium text-stone-700">
                        {org.restaurants.length}/{org.maxRestaurants}
                      </span>{" "}
                      locales
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {enabledFeatures.length === 0 ? (
                        <span className="text-[11px] text-stone-400">Sin módulos habilitados</span>
                      ) : (
                        enabledFeatures.map((feat) => (
                          <span
                            key={feat.key}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            {feat.shortLabel}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDrawer(org.id, "modules")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Administrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedOrg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Administrar ${selectedOrg.name}`}
          className="fixed inset-0 z-50 flex justify-end bg-stone-950/30 backdrop-blur-[1px]"
        >
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-stone-900">
                    {selectedOrg.name}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      selectedOrg.status === "ACTIVE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {selectedOrg.status === "ACTIVE" ? "Activa" : "Suspendida"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-stone-500">{selectedOrg.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrgId(null)}
                aria-label="Cerrar panel"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-stone-200 px-6 py-2.5">
              <div role="tablist" className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === "modules"}
                  onClick={() => setDrawerTab("modules")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    drawerTab === "modules"
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Módulos y locales ({selectedOrg.restaurants.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === "account"}
                  onClick={() => setDrawerTab("account")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    drawerTab === "account"
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Cuenta y seguridad
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {notice && (
                <div
                  role={notice.kind === "error" ? "alert" : "status"}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    notice.kind === "error"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {notice.text}
                </div>
              )}

              {drawerTab === "modules" ? (
                selectedOrg.restaurants.length === 0 ? (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
                    Esta organización todavía no tiene locales creados.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {selectedOrg.restaurants.map((restaurant) => (
                      <RestaurantFeatureCard
                        key={`${restaurant.id}-${restaurant.menuEnabled}-${restaurant.landingEnabled}-${restaurant.reservationsEnabled}-${restaurant.floorManagementEnabled}-${restaurant.inventoryEnabled}-${restaurant.status}-${restaurant.assetQuotaBytes}`}
                        organizationId={selectedOrg.id}
                        restaurant={restaurant}
                        pending={pending}
                        onSave={(formData) =>
                          runAction(
                            () => actions.restaurantOptions(formData),
                            () => `Configuración de "${restaurant.name}" guardada.`,
                          )
                        }
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  <form
                    action={(formData) =>
                      runAction(
                        () => actions.update(formData),
                        () => "Datos de la organización actualizados.",
                      )
                    }
                    className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/50 p-5"
                  >
                    <h3 className="text-sm font-semibold text-stone-900">Datos de cuenta</h3>
                    <input type="hidden" name="id" value={selectedOrg.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                        Nombre de la organización
                        <input
                          name="name"
                          defaultValue={selectedOrg.name}
                          required
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                        Email de acceso
                        <input
                          name="email"
                          type="email"
                          defaultValue={selectedOrg.email}
                          required
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                        Límite de locales
                        <input
                          name="maxRestaurants"
                          type="number"
                          min={1}
                          max={50}
                          defaultValue={selectedOrg.maxRestaurants}
                          required
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                      >
                        {pending ? "Guardando…" : "Guardar cambios"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3 rounded-xl border border-stone-200 p-5">
                    <h3 className="text-sm font-semibold text-stone-900">Acceso y estado</h3>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("id", selectedOrg.id);
                          fd.set(
                            "status",
                            selectedOrg.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                          );
                          runAction(
                            () => actions.status(fd),
                            () =>
                              selectedOrg.status === "ACTIVE"
                                ? "Organización suspendida."
                                : "Organización reactivada.",
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        <Power className="h-3.5 w-3.5" />
                        {selectedOrg.status === "ACTIVE" ? "Suspender cuenta" : "Activar cuenta"}
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("id", selectedOrg.id);
                          runAction(
                            () => actions.resetPassword(fd),
                            (res) =>
                              res.success && res.data?.temporaryPassword
                                ? `Nueva contraseña temporal: ${res.data.temporaryPassword}`
                                : "Contraseña restablecida.",
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Restablecer contraseña
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50/40 p-5">
                    <div>
                      <h3 className="text-sm font-semibold text-red-900">Eliminar cliente</h3>
                      <p className="mt-0.5 text-xs text-red-700">
                        Elimina permanentemente la organización, sus locales y archivos.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar permanentemente a "${selectedOrg.name}"?`)) {
                          return;
                        }
                        const fd = new FormData();
                        fd.set("id", selectedOrg.id);
                        runAction(
                          () => actions.remove(fd),
                          () => {
                            setSelectedOrgId(null);
                            return `Cliente "${selectedOrg.name}" eliminado.`;
                          },
                        );
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo cliente"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4 backdrop-blur-[1px]"
        >
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-base font-semibold text-stone-900">Nuevo cliente</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Cerrar modal"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {notice && (
              <div
                role={notice.kind === "error" ? "alert" : "status"}
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  notice.kind === "error"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                {notice.text}
              </div>
            )}

            <form
              action={(formData) =>
                runAction(
                  () => actions.create(formData),
                  (res) => {
                    setCreateOpen(false);
                    return res.success && res.data?.temporaryPassword
                      ? `Cliente creado. Contraseña temporal: ${res.data.temporaryPassword}`
                      : "Cliente creado.";
                  },
                )
              }
              className="mt-4 space-y-4"
            >
              <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                Nombre de la organización
                <input name="name" placeholder="Ej. Grupo Palermo" required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                Email administrador
                <input
                  name="email"
                  type="email"
                  placeholder="admin@restaurante.com"
                  required
                  className={inputClass}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                  Nombre del primer local
                  <input
                    name="restaurantName"
                    placeholder="Ej. Bistro Central"
                    required
                    className={inputClass}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                  Slug público
                  <input name="slug" placeholder="bistro-central" required className={inputClass} />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {pending ? "Creando…" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RestaurantFeatureCard({
  organizationId,
  restaurant,
  pending,
  onSave,
}: {
  organizationId: string;
  restaurant: RestaurantSummary;
  pending: boolean;
  onSave: (formData: FormData) => void;
}) {
  const [flags, setFlags] = useState<RestaurantFeatureFlags>(() =>
    featureFlagsFromRestaurant(restaurant),
  );
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">(restaurant.status);
  const [quotaMb, setQuotaMb] = useState(
    String(Math.max(1, Math.round(restaurant.assetQuotaBytes / (1024 * 1024)))),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", restaurant.id);
    fd.set("status", status);
    fd.set("menuEnabled", String(flags.menu));
    fd.set("landingEnabled", String(flags.landing));
    fd.set("reservationsEnabled", String(flags.reservations));
    fd.set("floorManagementEnabled", String(flags.floorManagement));
    fd.set("inventoryEnabled", String(flags.inventory));
    const parsedMb = Math.max(1, Number(quotaMb) || 1);
    fd.set("assetQuotaBytes", String(Math.min(2_147_483_647, parsedMb * 1024 * 1024)));
    onSave(fd);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-900">{restaurant.name}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                status === "ACTIVE"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {status === "ACTIVE" ? "Operativo" : "Suspendido"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <a
              href={`/m/${restaurant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-stone-900"
            >
              Menú <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`/l/${restaurant.landingSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-stone-900"
            >
              Landing <ExternalLink className="h-3 w-3" />
            </a>
            {flags.landing && (
              <Link
                href={`/superadmin/clients/${organizationId}/restaurants/${restaurant.id}/landing`}
                className="font-medium text-stone-700 underline underline-offset-4 hover:text-stone-900"
              >
                Editar landing
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-600">Presets rápidos de plan</p>
        <div className="flex flex-wrap gap-1.5">
          {PLAN_PRESETS.map((preset) => {
            const active = flagsEqual(flags, preset.flags);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setFlags({ ...preset.flags })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-stone-100 rounded-lg border border-stone-200">
        {RESTAURANT_FEATURE_CATALOG.map((feature) => {
          const checked = flags[feature.key];
          return (
            <div
              key={feature.key}
              className="flex items-center justify-between gap-4 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-900">{feature.label}</p>
                <p className="text-[11px] text-stone-500">{feature.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={feature.label}
                onClick={() =>
                  setFlags((prev) => ({ ...prev, [feature.key]: !prev[feature.key] }))
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  checked ? "bg-stone-900" : "bg-stone-200"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    checked ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-stone-700">
          Estado del local
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "ACTIVE" | "SUSPENDED")}
            className={inputClass}
          >
            <option value="ACTIVE">Operativo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-stone-700">
          Cuota de archivos (MB)
          <input
            type="number"
            min={1}
            max={2048}
            value={quotaMb}
            onChange={(e) => setQuotaMb(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar módulos y opciones"}
        </button>
      </div>
    </form>
  );
}
