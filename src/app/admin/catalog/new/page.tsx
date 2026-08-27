import { getGroups } from "@/features/groups/backend/services/group.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { ProductForm } from "@/features/products/frontend/components/ProductForm";
import { createProduct } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminCard, AdminPageHeader } from "@/shared/frontend/components/admin/AdminUI";

export default async function NewProductPage() {
  const account = await ensureAdmin();
  const groups = await getGroups(account.tenantId!);

  async function handleSubmit(data: {
    name: string;
    description: string;
    price: number;
    groupId: string;
  }) {
    "use server";
    try {
      const current = await ensureAdmin();
      const product = await createProduct(data, current.tenantId!, current.tenantSlug!);
      return { success: true, data: product };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "No se pudo crear el producto" } };
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Catálogo" title="Nuevo producto" description="Agregá un producto a uno de los grupos de tu menú." />
        <AdminCard className="max-w-xl p-6 sm:p-8">
          <ProductForm
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            onSubmit={handleSubmit}
            submitLabel="Crear producto"
          />
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
