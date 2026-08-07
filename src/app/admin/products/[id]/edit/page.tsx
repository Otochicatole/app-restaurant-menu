import { getGroups } from "@/features/groups/backend/services/group.service";
import { getProductById, updateProduct } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { ProductForm } from "@/features/products/frontend/components/ProductForm";
import { notFound } from "next/navigation";

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
      <h1 className="text-2xl font-bold text-zinc-900">Edit Product</h1>
      <div className="mt-6 max-w-lg bg-white rounded-lg border border-zinc-200 p-6">
        <ProductForm
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          initialData={{
            name: product.name,
            description: product.description,
            price: product.price,
            groupId: product.groupId,
          }}
          onSubmit={handleSubmit}
          submitLabel="Update Product"
        />
      </div>
    </AdminLayout>
  );
}
