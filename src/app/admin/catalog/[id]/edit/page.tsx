import { getGroups } from "@/features/groups/backend/services/group.service";
import { getProductById, updateProduct } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { ProductForm } from "@/features/products/frontend/components/ProductForm";
import { notFound } from "next/navigation";
import { AdminCard, AdminPageHeader } from "@/shared/frontend/components/admin/AdminUI";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const [product, groups] = await Promise.all([
    getProductById(id).catch(() => null),
    getGroups(),
  ]);

  if (!product) notFound();

  async function handleSubmit(data: {
    name: string;
    description: string;
    price: number;
    groupId: string;
  }) {
    "use server";
    try {
      await ensureAdmin();
      const updated = await updateProduct(id, data);
      return { success: true, data: updated };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to update product" } };
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Catalog" title={`Edit ${product.name}`} description="Update the product details used across your menu." />
        <AdminCard className="max-w-xl p-6 sm:p-8">
          <ProductForm
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            initialData={{
              name: product.name,
              description: product.description,
              price: product.price,
              groupId: product.groupId,
            }}
            onSubmit={handleSubmit}
            submitLabel="Save changes"
          />
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
