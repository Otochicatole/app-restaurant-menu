import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, KeyRound, ShieldCheck, Store } from "lucide-react";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { AccountProfileForm, LogoutButton } from "@/modules/identity-access/ui";
import { prisma } from "@/platform/database/prisma";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: actor.organizationId },
    include: {
      _count: { select: { restaurants: true } },
    },
  });

  return (
    <div data-admin-panel className="min-h-screen bg-stone-50 text-stone-900">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link
            href="/admin/restaurants"
            className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a restaurantes
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-stone-500 sm:inline">
              {organization.name}
            </span>
            <LogoutButton compact />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                Mi cuenta
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  organization.status === "ACTIVE"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {organization.status === "ACTIVE" ? "Activa" : "Suspendida"}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-600">
              Datos de acceso y administración general compartidos por todos tus restaurantes.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-stone-200 bg-white p-6 lg:col-span-7">
            <div className="mb-5 flex items-start gap-3 border-b border-stone-100 pb-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Datos de la organización
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Nombre comercial de tu cuenta y correo electrónico de inicio de sesión.
                </p>
              </div>
            </div>

            <AccountProfileForm
              initialName={organization.name}
              initialEmail={actor.email}
            />
          </section>

          <aside className="space-y-5 lg:col-span-5">
            <section className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">
                    Seguridad y contraseña
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Actualizá tu contraseña de acceso. Al guardar una nueva clave se cerrarán las
                    demás sesiones abiertas.
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-stone-100 pt-4">
                <Link
                  href="/admin/account/password"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Cambiar contraseña
                </Link>
              </div>
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700">
                    <Store className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900">
                      Locales incluidos
                    </h2>
                    <p className="text-xs text-stone-500">
                      {organization._count.restaurants} de {organization.maxRestaurants}{" "}
                      disponibles
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/restaurants"
                  className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
                >
                  Administrar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
