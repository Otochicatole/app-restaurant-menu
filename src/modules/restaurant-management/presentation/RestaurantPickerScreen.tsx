"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ExternalLink,
  Plus,
  Search,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import { LogoutButton } from "@/modules/identity-access/ui";
import { matchesNormalizedSearch } from "@/platform/text/search";
import { AdminModal } from "@/ui/admin/AdminUI";
import {
  RESTAURANT_FEATURE_CATALOG,
  hasRestaurantFeature,
  type RestaurantWorkspace,
} from "../contracts";
import type { RestaurantActionResult } from "./actions";

type Action = (form: FormData) => Promise<RestaurantActionResult>;

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50";

export function RestaurantPickerScreen({
  workspace,
  selectRestaurant,
  createRestaurant,
  deleteRestaurants,
}: {
  workspace: RestaurantWorkspace;
  selectRestaurant: Action;
  createRestaurant: Action;
  deleteRestaurants: Action;
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  const filteredRestaurants = useMemo(() => {
    return workspace.restaurants.filter((restaurant) => {
      if (statusFilter !== "ALL" && restaurant.status !== statusFilter) return false;
      if (!search.trim()) return true;
      return matchesNormalizedSearch(search, [
        restaurant.name,
        restaurant.slug,
        restaurant.landingSlug,
        restaurant.publicDescription,
      ]);
    });
  }, [workspace.restaurants, search, statusFilter]);

  function run(action: Action, form: FormData) {
    startTransition(async () => {
      setNotice(null);
      try {
        const result = await action(form);
        if (!result.success) setNotice(result.error.message);
        else {
          setDeleting(null);
          setCreating(false);
          setPassword("");
        }
      } catch (error) {
        unstable_rethrow(error);
        setNotice("No pudimos conectar con el servidor. Volvé a intentarlo.");
      }
    });
  }

  return (
    <div data-admin-panel className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900">
                {workspace.organizationName}
              </p>
              <p className="text-xs text-stone-500">
                {workspace.restaurants.length} de {workspace.maxRestaurants}{" "}
                {workspace.maxRestaurants === 1 ? "restaurante" : "restaurantes"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/account"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <UserRound className="h-3.5 w-3.5" />
              Mi cuenta
            </Link>
            <LogoutButton compact />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Tus restaurantes
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Elegí un local para administrar los módulos habilitados en tu plan.
            </p>
          </div>

          {workspace.canCreateRestaurant ? (
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setCreating(true);
              }}
              className={primaryButtonClass}
            >
              <Plus className="h-4 w-4" />
              Agregar restaurante
            </button>
          ) : (
            <span className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
              Cupo completo ({workspace.restaurants.length}/{workspace.maxRestaurants})
            </span>
          )}
        </header>

        {notice && !creating && deleting === null && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            {notice}
          </div>
        )}

        {workspace.restaurants.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o slug…"
                aria-label="Buscar restaurantes"
                className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar por estado"
              className="inline-flex self-start rounded-lg border border-stone-200 bg-white p-1"
            >
              {(
                [
                  ["ALL", "Todos"],
                  ["ACTIVE", "Operativos"],
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
        )}

        <section aria-label="Restaurantes" className="grid gap-4 md:grid-cols-2">
          {filteredRestaurants.map((restaurant) => {
            const showMenu = hasRestaurantFeature(restaurant, "menu");
            const showLanding = hasRestaurantFeature(restaurant, "landing");
            const activeFeatures = RESTAURANT_FEATURE_CATALOG.filter((feat) =>
              hasRestaurantFeature(restaurant, feat.key),
            );

            return (
              <article
                key={restaurant.id}
                className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Store className="h-4 w-4 shrink-0 text-stone-400" />
                        <h2 className="truncate text-base font-semibold text-stone-900">
                          {restaurant.name}
                        </h2>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            restaurant.status === "ACTIVE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {restaurant.status === "ACTIVE" ? "Operativo" : "Suspendido"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-stone-500">
                        /{restaurant.slug}
                        {restaurant.publicDescription ? ` · ${restaurant.publicDescription}` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Eliminar ${restaurant.name}`}
                      onClick={() => {
                        setDeleting([restaurant.id]);
                        setPassword("");
                        setNotice(null);
                      }}
                      className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {activeFeatures.length === 0 ? (
                      <span className="text-xs text-stone-400">Sin módulos habilitados</span>
                    ) : (
                      activeFeatures.map((feat) => (
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

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-stone-600">
                    {showMenu && (
                      <a
                        href={`/m/${restaurant.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium hover:text-stone-900"
                      >
                        Ver carta <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {showLanding && (
                      <a
                        href={`/l/${restaurant.landingSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium hover:text-stone-900"
                      >
                        Ver landing <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {restaurant.status === "ACTIVE" ? (
                    <form action={(form) => run(selectRestaurant, form)}>
                      <input type="hidden" name="restaurantId" value={restaurant.id} />
                      <button disabled={pending} className={primaryButtonClass}>
                        Abrir <ArrowRight className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <span className="font-medium text-amber-800">Acceso suspendido</span>
                  )}
                </div>
              </article>
            );
          })}

          {workspace.restaurants.length === 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-8 text-center md:col-span-2">
              <Store className="mx-auto h-8 w-8 text-stone-300" />
              <h2 className="mt-3 text-base font-semibold text-stone-900">
                Todavía no hay restaurantes
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Creá el primero para comenzar. Cada local tendrá su propio espacio de trabajo.
              </p>
            </div>
          )}

          {workspace.restaurants.length > 0 && filteredRestaurants.length === 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-8 text-center md:col-span-2">
              <p className="text-sm font-medium text-stone-900">
                No hay restaurantes que coincidan con tu búsqueda
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Probá limpiar el buscador o cambiar el filtro de estado.
              </p>
            </div>
          )}
        </section>

        {!workspace.canCreateRestaurant && (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
            Alcanzaste el límite de {workspace.maxRestaurants} restaurantes de tu cuenta. Pedile al
            administrador de la plataforma que amplíe tu cupo si necesitás agregar más locales.
          </p>
        )}

        {workspace.restaurants.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/40 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-red-900">Eliminar todos los restaurantes</p>
              <p className="text-xs text-red-700">
                Acción irreversible que borra todos los locales, cartas, reservas y archivos.
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setDeleting(workspace.restaurants.map((restaurant) => restaurant.id));
                setPassword("");
                setNotice(null);
              }}
              className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar todos los restaurantes
            </button>
          </div>
        )}

        <AdminModal
          open={creating && workspace.canCreateRestaurant}
          title="Agregar restaurante"
          onClose={() => {
            if (!pending) {
              setCreating(false);
              setNotice(null);
            }
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(createRestaurant, new FormData(event.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                Nombre
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Restaurante Centro"
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-stone-700">
                Slug público
                <input
                  name="slug"
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="restaurante-centro"
                  className={fieldClass}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-stone-700">
              Descripción
              <input
                name="publicDescription"
                defaultValue="Menú digital"
                maxLength={500}
                className={fieldClass}
              />
            </label>
            <p className="text-xs leading-relaxed text-stone-500">
              Se creará un espacio inicial con menú digital. El administrador de la plataforma podrá
              habilitar módulos adicionales según tu plan.
            </p>
            {notice && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                {notice}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setCreating(false);
                  setNotice(null);
                }}
                className={secondaryButtonClass}
              >
                Cancelar
              </button>
              <button disabled={pending} className={primaryButtonClass}>
                {pending ? "Creando…" : "Crear y abrir"}
              </button>
            </div>
          </form>
        </AdminModal>

        <AdminModal
          open={deleting !== null}
          title={deleting?.length === 1 ? "Eliminar restaurante" : "Eliminar restaurantes"}
          onClose={() => {
            if (!pending) {
              setDeleting(null);
              setNotice(null);
            }
          }}
        >
          <form action={(form) => run(deleteRestaurants, form)} className="space-y-4">
            <p className="text-sm leading-6 text-stone-600">
              Se eliminarán definitivamente{" "}
              <span className="font-medium text-stone-900">
                {deleting
                  ?.map(
                    (id) =>
                      workspace.restaurants.find((restaurant) => restaurant.id === id)?.name,
                  )
                  .join(", ")}
              </span>
              , incluyendo sus cartas, landings, reservas, eventos, plantillas y archivos. Esta
              acción no se puede deshacer.
            </p>
            {deleting?.map((id) => (
              <input key={id} type="hidden" name="restaurantId" value={id} />
            ))}
            <label className="grid gap-1.5 text-xs font-medium text-stone-700">
              Contraseña actual
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            {notice && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                {notice}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleting(null)}
                className={secondaryButtonClass}
              >
                Cancelar
              </button>
              <button
                disabled={pending || !password.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </form>
        </AdminModal>
      </main>
    </div>
  );
}
