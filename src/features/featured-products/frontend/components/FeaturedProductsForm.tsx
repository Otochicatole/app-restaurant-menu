"use client";

import { useState } from "react";

interface FeaturedProductsFormProps {
  products: { id: string; name: string; groupName: string; price: number }[];
  featured: (string | null)[];
  onSave: (featured: (string | null)[]) => Promise<{ success: boolean; error?: { message: string } }>;
}

export function FeaturedProductsForm({ products, featured, onSave }: FeaturedProductsFormProps) {
  const [selected, setSelected] = useState<(string | null)[]>(featured);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updatePosition = (position: number, productId: string) => {
    setSelected((current) => current.map((value, index) => (index === position ? productId || null : value)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await onSave(selected);
      if (!result.success) setError(result.error?.message ?? "Failed to save featured products");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Select up to 3 products to feature on the menu page, then save all positions together.
      </div>
      {[1, 2, 3].map((position) => {
        const productId = selected[position - 1] ?? "";
        const currentProduct = productId ? products.find((product) => product.id === productId) : null;

        return (
          <div key={position} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Position #{position}</p>
              {currentProduct && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Configured</span>}
            </div>
            <select
              value={productId}
              onChange={(event) => updatePosition(position - 1, event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">-- Empty position --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.groupName} - ${product.price.toFixed(2)})
                </option>
              ))}
            </select>
            {currentProduct && <p className="mt-2 text-sm text-zinc-500">Current: {currentProduct.name} - ${currentProduct.price.toFixed(2)}</p>}
          </div>
        );
      })}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end border-t border-zinc-100 pt-5">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
