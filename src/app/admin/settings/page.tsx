import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { AdminCard, AdminPageHeader } from "@/shared/frontend/components/admin/AdminUI";
import Link from "next/link";
import { ArrowRight, KeyRound, Type } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader
          eyebrow="Configuración"
          title="Ajustes"
          description="Personalizá la apariencia y el comportamiento de tu menú."
        />

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
                <p className="text-base font-semibold text-zinc-950">Tipografía del menú</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Elegí la fuente del menú público o instalá la tuya.
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
    </AdminLayout>
  );
}
