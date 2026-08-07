"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/features/products/frontend/types";

interface ProductListClientProps {
  products: ProductDTO[];
}

export function ProductListClient({ products }: ProductListClientProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  };

  if (products.length === 0) {
    return <p className="text-zinc-500">No products yet.</p>;
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left font-medium text-zinc-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">Group</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">Price</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-zinc-100">
              <td className="px-4 py-3 text-zinc-900">{product.name}</td>
              <td className="px-4 py-3 text-zinc-600">{product.groupName}</td>
              <td className="px-4 py-3 text-zinc-900">${product.price.toFixed(2)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 mr-3"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
