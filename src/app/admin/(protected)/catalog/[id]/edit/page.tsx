import { notFound } from "next/navigation";
import { getProduct, listGroups, updateCatalogProduct } from "@/modules/catalog/server";
import { ProductEditor } from "@/modules/catalog/ui";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, account] = await Promise.all([params, requireTenantAdmin()]);
  const [product, groups] = await Promise.all([
    getProduct({ tenantId: account.tenantId, tenantSlug: account.tenantSlug, productId: id }).catch(() => null),
    listGroups({ tenantId: account.tenantId }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-8">
        <AdminPageHeader eyebrow="Catálogo" title={`Editar ${product.name}`} description="Actualizá los datos del producto que se muestran en tu menú." />
        <AdminCard className="max-w-xl p-6 sm:p-8">
          <ProductEditor
            groups={groups.map(({ id: groupId, name }) => ({ id: groupId, name }))}
            product={product}
            updateProduct={updateCatalogProduct}
            submitLabel="Guardar cambios"
          />
        </AdminCard>
    </div>
  );
}
