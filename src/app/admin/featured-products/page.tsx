import { getProducts } from "@/features/products/backend/services/product.service";
import { getFeaturedProducts, setFeaturedProduct, removeFeaturedProduct } from "@/features/featured-products/backend/services/featured-product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { FeaturedProductsForm } from "@/features/featured-products/frontend/components/FeaturedProductsForm";
import { AdminCard, AdminPageHeader } from "@/shared/frontend/components/admin/AdminUI";

export default async function AdminFeaturedProductsPage() {
  const [products, featured] = await Promise.all([getProducts(), getFeaturedProducts()]);

  async function handleSave(featuredIds: (string | null)[]) {
    "use server";
    try {
      await ensureAdmin();
      await Promise.all(
        featuredIds.map((productId, index) => {
          const position = index + 1;
          return productId ? setFeaturedProduct(position, productId) : removeFeaturedProduct(position);
        }),
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "No se pudieron guardar los productos destacados" } };
    }
  }

  const featuredIds = featured.map((f) => f?.product.id ?? null);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Menú público" title="Productos destacados" description="Elegí hasta tres productos para destacar en el centro de tu menú." />
        <AdminCard className="max-w-3xl p-6 sm:p-8">
          <FeaturedProductsForm
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              groupName: p.groupName ?? "",
              price: p.price,
            }))}
            featured={featuredIds}
            onSave={handleSave}
          />
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
