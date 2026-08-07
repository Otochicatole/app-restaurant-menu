import { getProductCount } from "@/features/products/backend/services/product.service";
import { getGroupCount } from "@/features/groups/backend/services/group.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import Link from "next/link";

export default async function AdminDashboard() {
  const [productCount, groupCount] = await Promise.all([
    getProductCount(),
    getGroupCount(),
  ]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500">Products</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{productCount}</p>
          <Link
            href="/admin/products"
            className="mt-2 inline-block text-sm text-zinc-600 underline"
          >
            Manage products
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500">Groups</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{groupCount}</p>
          <Link
            href="/admin/groups"
            className="mt-2 inline-block text-sm text-zinc-600 underline"
          >
            Manage groups
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
