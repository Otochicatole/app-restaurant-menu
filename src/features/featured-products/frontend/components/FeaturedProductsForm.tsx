"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface FeaturedProductsFormProps {
  products: { id: string; name: string; groupName: string; price: number }[];
  featured: (string | null)[];
}

type OnSubmitResult = Promise<{ success: boolean; error?: { message: string } }>;

interface FeaturedProductsFormInternalProps extends FeaturedProductsFormProps {
  onSet: (position: number, productId: string) => OnSubmitResult;
  onRemove: (position: number) => OnSubmitResult;
}

function FeaturedRow({
  position,
  productId,
  products,
  onSet,
  onRemove,
}: {
  position: number;
  productId: string | null;
  products: FeaturedProductsFormProps["products"];
  onSet: (position: number, productId: string) => OnSubmitResult;
  onRemove: (position: number) => OnSubmitResult;
}) {
  const [selected, setSelected] = useState(productId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentProduct = productId
    ? products.find((p) => p.id === productId)
    : null;

  const handleSave = async () => {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const result = await onSet(position, selected);
      if (!result.success) setError(result.error?.message ?? "Failed to save");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await onRemove(position);
      if (result.success) {
        setSelected("");
      } else {
        setError(result.error?.message ?? "Failed to remove");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-zinc-200 rounded-lg p-4">
      <p className="text-sm font-medium text-zinc-700 mb-2">Position #{position}</p>
      {currentProduct && !selected && (
        <p className="text-sm text-zinc-500 mb-2">
          Current: {currentProduct.name} ({currentProduct.groupName} — ${currentProduct.price.toFixed(2)})
        </p>
      )}
      <div className="flex gap-2 items-end">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">-- Select a product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.groupName} — ${p.price.toFixed(2)})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !selected}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "..." : "Set"}
        </button>
        {productId && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function FeaturedProductsForm({
  products,
  featured,
  onSet,
  onRemove,
}: FeaturedProductsFormInternalProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Select up to 3 products to feature on the menu page.
      </p>
      {[1, 2, 3].map((pos) => (
        <FeaturedRow
          key={pos}
          position={pos}
          productId={featured[pos - 1] ?? null}
          products={products}
          onSet={onSet}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
