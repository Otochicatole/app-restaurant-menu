import { getAdminDashboard } from "@/modules/admin-dashboard/server";
import { AdminCard, AdminPageHeader, AdminStatCard, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import Link from "next/link";
import { ArrowRight, BookOpen, FolderPlus, Home, Pencil, Star } from "lucide-react";
import { requireTenantAdmin } from "@/modules/identity-access/server";

export default async function AdminDashboard() {
  const account = await requireTenantAdmin();
  const dashboard = await getAdminDashboard(account.tenantId);

  return (
    <div className="space-y-8">
        <AdminPageHeader
          eyebrow="Buenos días"
          title="Resumen del menú"
          description="Una vista rápida del contenido y las herramientas principales de tu menú."
          actions={<>
            <Link href="/admin/home-page" className={adminSecondaryButtonClass}><Pencil size={16} /> Editar página</Link>
            <Link href="/admin/catalog" className={adminPrimaryButtonClass}><BookOpen size={16} /> Abrir catálogo</Link>
          </>}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Catálogo" value={dashboard.productCount} detail={`${dashboard.groupCount} grupos administrados desde aquí`} href="/admin/catalog" />
          <AdminStatCard label="Grupos" value={dashboard.groupCount} detail="Organizá las secciones del catálogo" href="/admin/catalog" accent="amber" />
          <AdminStatCard label="Destacados" value={`${dashboard.highlightedCount}/3`} detail="Elegí productos para destacar" href="/admin/featured-products" accent="terracotta" />
          <AdminStatCard label="Página principal" value="Lista" detail="Actualizá el encabezado público" href="/admin/home-page" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <AdminCard className="overflow-hidden">
            <div className="border-b border-zinc-100 px-6 py-5 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Contenido publicado</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-950">Vista previa de la página</h2>
            </div>
            <div className="bg-emerald-950 px-6 py-10 text-white sm:px-10">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Encabezado público</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{dashboard.header.title}</p>
              <p className="mt-3 text-base text-emerald-100">{dashboard.header.description}</p>
              <Link href="/admin/home-page" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-amber-100"><Home size={16} /> Personalizar encabezado</Link>
            </div>
          </AdminCard>
          <AdminCard className="p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Acciones rápidas</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-950">Seguí avanzando</h2>
            <div className="mt-6 space-y-2">
              <Link href="/admin/catalog" className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"><span className="flex items-center gap-3"><BookOpen size={16} /> Administrar catálogo</span><ArrowRight size={16} /></Link>
              <Link href="/admin/catalog" className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"><span className="flex items-center gap-3"><FolderPlus size={16} /> Crear un grupo</span><ArrowRight size={16} /></Link>
              <Link href="/admin/featured-products" className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"><span className="flex items-center gap-3"><Star size={16} /> Configurar destacados</span><ArrowRight size={16} /></Link>
            </div>
          </AdminCard>
        </div>
    </div>
  );
}
