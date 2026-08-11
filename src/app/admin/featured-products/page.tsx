import { getProducts } from "@/features/products/backend/services/product.service";
import { getFeaturedProducts, setFeaturedProduct, removeFeaturedProduct } from "@/features/featured-products/backend/services/featured-product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { FeaturedProductsForm } from "@/features/featured-products/frontend/components/FeaturedProductsForm";

export default async function AdminFeaturedProductsPage() {
  const [products, featured] = await Promise.all([getProducts(), getFeaturedProducts()]);

  async function handleSet(position: number, productId: string) {
    "use server";
    try {
      await ensureAdmin();
      await setFeaturedProduct(position, productId);
      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to set featured product" } };
    }
  }

  async function handleRemove(position: number) {
    "use server";
    try {
      await ensureAdmin();
      await removeFeaturedProduct(position);
      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to remove featured product" } };
    }
  }

  const featuredIds = featured.map((f) => f?.product.id ?? null);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-zinc-900">Featured Products</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Select up to 3 products to highlight on the menu.
      </p>
      <div className="mt-6 max-w-lg bg-white rounded-lg border border-zinc-200 p-6">
        <FeaturedProductsForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            groupName: p.groupName ?? "",
            price: p.price,
          }))}
          featured={featuredIds}
          onSet={handleSet}
          onRemove={handleRemove}
        />
      </div>
    </AdminLayout>
  );
}
