import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";
import Link from "next/link";
import { ArrowRight, KeyRound, Type } from "lucide-react";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { RestaurantProfileForm } from "@/modules/menu-editor/ui";

export default async function AdminSettingsPage() {
  const actor = await requireTenantAdmin();
  const profile = await menuEditor.getProfile(actor.tenantId);
  return (
    <div className="space-y-8">
        <AdminPageHeader
          eyebrow="Configuración"
          title="Ajustes"
          description="Configurá la identidad pública y los recursos de tu carta."
        />

        <AdminCard className="p-6 sm:p-8"><RestaurantProfileForm initialData={profile} slug={actor.tenantSlug} email={actor.email} /></AdminCard>
        <AdminCard className="overflow-hidden">
          <Link
            href="/admin/settings/fonts"
            className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-emerald-50/40 sm:px-7"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <Type size={20} />
              </span>
              <div>
                <p className="text-base font-semibold text-zinc-950">Biblioteca de fuentes</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Subí fuentes propias y elegilas por objeto dentro del editor.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0 text-zinc-400" />
          </Link>

          <Link
            href="/admin/account/password"
            className="flex items-center justify-between gap-4 border-t border-zinc-100 px-6 py-5 transition hover:bg-emerald-50/40 sm:px-7"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <KeyRound size={20} />
              </span>
              <div>
                <p className="text-base font-semibold text-zinc-950">Cambiar contraseña</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Actualizá la contraseña de acceso a tu cuenta.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0 text-zinc-400" />
          </Link>
        </AdminCard>
    </div>
  );
}
