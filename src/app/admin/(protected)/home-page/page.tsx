import { menuCustomization, updateMenuHeaderAction } from "@/modules/menu-customization/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { HomePageForm } from "@/modules/menu-customization/ui";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";

export default async function AdminHomePage() {
  const account = await requireTenantAdmin();
  const homePage = await menuCustomization.getHeader(account.tenantId);

  return (
    <div className="space-y-8">
        <AdminPageHeader eyebrow="Contenido de marca" title="Página principal" description="Definí la primera impresión que reciben tus clientes al abrir el menú." />
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <AdminCard className="overflow-hidden">
            <div className="bg-emerald-950 px-6 py-8 text-white sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Vista previa</p>
              <p className="mt-12 text-4xl font-semibold tracking-tight">{homePage.title}</p>
              <p className="mt-3 text-sm text-emerald-100">{homePage.description}</p>
            </div>
            <div className="px-6 py-5 text-sm leading-6 text-zinc-500 sm:px-8">Este contenido se muestra en el centro del encabezado público del menú.</div>
          </AdminCard>
          <AdminCard className="p-6 sm:p-8">
            <HomePageForm
              initialData={{ title: homePage.title, description: homePage.description }}
              onSubmit={updateMenuHeaderAction}
              submitLabel="Guardar cambios"
            />
          </AdminCard>
        </div>
    </div>
  );
}
