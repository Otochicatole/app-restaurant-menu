import { getGroups } from "@/features/groups/backend/services/group.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { ProductForm } from "@/features/products/frontend/components/ProductForm";
import { createProduct } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";

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
      <h1 className="text-2xl font-bold text-zinc-900">New Product</h1>
      <div className="mt-6 max-w-lg bg-white rounded-lg border border-zinc-200 p-6">
        <ProductForm
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          onSubmit={handleSubmit}
          submitLabel="Create Product"
        />
      </div>
    </AdminLayout>
  );
}
