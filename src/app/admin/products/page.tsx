import { getProducts } from "@/features/products/backend/services/product.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import Link from "next/link";
import { ProductListClient } from "./ProductListClient";

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New Product
        </Link>
      </div>
      <div className="mt-6">
        <ProductListClient products={products} />
      </div>
    </AdminLayout>
  );
}
