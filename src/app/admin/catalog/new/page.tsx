import { getGroups } from "@/features/groups/backend/services/group.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { ProductForm } from "@/features/products/frontend/components/ProductForm";
import { createProduct } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminCard, AdminPageHeader } from "@/shared/frontend/components/admin/AdminUI";

export default async function NewProductPage() {
  const groups = await getGroups();

  async function handleSubmit(data: {
    name: string;
    description: string;
    price: number;
    groupId: string;
  }) {
    "use server";
    try {
      await ensureAdmin();
      const product = await createProduct(data);
      return { success: true, data: product };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to create product" } };
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Catalog" title="New product" description="Add a product to one of your menu groups." />
        <AdminCard className="max-w-xl p-6 sm:p-8">
          <ProductForm
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            onSubmit={handleSubmit}
            submitLabel="Create product"
          />
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
