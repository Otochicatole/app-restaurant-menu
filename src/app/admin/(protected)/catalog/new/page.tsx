import { createCatalogProduct, listGroups, updateCatalogProduct } from "@/modules/catalog/server";
import { ProductEditor } from "@/modules/catalog/ui";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";

export default async function NewProductPage() {
  const account = await requireTenantAdmin();
  const groups = await listGroups({ tenantId: account.tenantId });

  return (
    <div className="space-y-8">
        <AdminPageHeader eyebrow="Catálogo" title="Nuevo producto" description="Agregá un producto a uno de los grupos de tu menú." />
        <AdminCard className="max-w-xl p-6 sm:p-8">
          <ProductEditor
            groups={groups.map(({ id, name }) => ({ id, name }))}
            createProduct={createCatalogProduct}
            updateProduct={updateCatalogProduct}
            submitLabel="Crear producto"
          />
        </AdminCard>
    </div>
  );
}
