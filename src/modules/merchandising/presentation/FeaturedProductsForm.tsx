"use client";

import { Save } from "lucide-react";
import {
  useHighlightEditor,
  type HighlightEditorProps,
} from "./use-highlight-editor";

export function FeaturedProductsForm({ products, featured, onSave }: HighlightEditorProps) {
  const controller = useHighlightEditor({ featured, onSave });

  return (
    <form onSubmit={controller.handleSubmit} className="space-y-4" aria-busy={controller.saving}>
      <div id="highlight-help" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Seleccioná hasta 3 productos para destacar en el menú y guardá todas las posiciones juntas. Un producto no puede ocupar más de una posición.
      </div>
      {[0, 1, 2].map((position) => {
        const productId = controller.selected[position] ?? "";
        const currentProduct = productId ? products.find((product) => product.id === productId) : null;
        const labelId = `highlight-position-${position + 1}`;

        return (
          <div key={position} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label id={labelId} htmlFor={`highlight-select-${position + 1}`} className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Posición #{position + 1}</label>
              {currentProduct && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Configurado</span>}
            </div>
            <select
              id={`highlight-select-${position + 1}`}
              value={productId}
              aria-labelledby={labelId}
              aria-describedby="highlight-help"
              onChange={(event) => controller.updatePosition(position, event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">-- Posición vacía --</option>
              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                  disabled={controller.isSelectedElsewhere(product.id, position)}
                >
                  {product.name} ({product.groupName} - ${product.price.toFixed(2)})
                </option>
              ))}
            </select>
            {currentProduct && <p className="mt-2 text-sm text-zinc-500">Actual: {currentProduct.name} - ${currentProduct.price.toFixed(2)}</p>}
          </div>
        );
      })}
      <div aria-live="polite" className="min-h-5">
        {controller.error && <p role="alert" className="text-sm text-red-600">{controller.error}</p>}
        {controller.successMessage && <p role="status" className="text-sm text-emerald-700">{controller.successMessage}</p>}
      </div>
      <div className="flex justify-end border-t border-zinc-100 pt-5">
        <button
          type="submit"
          disabled={controller.saving}
          className="flex flex-row items-center gap-2 rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {controller.saving ? "Guardando..." : <><Save size={15} /> Guardar cambios</>}
        </button>
      </div>
    </form>
  );
}

