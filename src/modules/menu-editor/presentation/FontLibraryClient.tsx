"use client";

import { useState } from "react";
import { SYSTEM_FONT_FAMILIES, type MenuAssetView } from "../contracts";
import { adminPrimaryButtonClass } from "@/ui/admin/AdminPrimitives";

export function FontLibraryClient({ restaurantId, initialAssets }: { restaurantId: string; initialAssets: MenuAssetView[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [message, setMessage] = useState("");
  const fontFaces = assets
    .map(
      (asset) =>
        `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}");font-display:swap;}`,
    )
    .join("");

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: fontFaces }} />

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
          Fuentes disponibles sin subir
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SYSTEM_FONT_FAMILIES.map((family) => (
            <div
              key={family}
              className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs"
              style={{ fontFamily: family }}
            >
              <p className="text-base font-medium text-zinc-900">{family}</p>
              <p
                className="mt-0.5 text-xs text-zinc-500"
                style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
              >
                Disponible en el inspector de texto
              </p>
            </div>
          ))}
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const file = form.get("file");
          if (!(file instanceof File)) return;
          form.set("kind", "FONT");
          setMessage("Subiendo...");
          const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/editor/assets`, { method: "POST", body: form });
          const payload = await response.json();
          if (response.ok && payload.success) {
            setAssets((items) => [payload.data, ...items]);
            setMessage("Fuente agregada");
            event.currentTarget.reset();
          } else {
            setMessage(payload.error?.message ?? "No se pudo subir");
          }
        }}
      >
        <label className="flex-1 text-sm font-medium text-zinc-700">
          Nombre
          <input
            name="name"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15"
            placeholder="Fuente de marca"
            required
          />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Archivo
          <input
            name="file"
            className="mt-1 block text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200"
            type="file"
            accept=".woff,.woff2,.ttf,.otf"
            required
          />
        </label>
        <button className={adminPrimaryButtonClass} type="submit">
          Subir fuente
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        {message ||
          "Formatos admitidos: WOFF, WOFF2, TTF y OTF. Máximo 10 MB por fuente y dentro de la cuota del restaurante."}
      </p>

      {assets.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white shadow-xs">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div style={{ fontFamily: `editor-font-${asset.id}` }}>
                <p className="text-sm font-semibold text-zinc-900">{asset.name}</p>
                <p
                  className="text-xs text-zinc-500"
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                >
                  {asset.mimeType} · {Math.ceil(asset.byteSize / 1024)} KB
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-red-600 transition hover:text-red-800"
                onClick={async () => {
                  const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/editor/assets/${encodeURIComponent(asset.id)}`, { method: "DELETE" });
                  if (response.ok) {
                    setAssets((items) => items.filter((item) => item.id !== asset.id));
                  } else {
                    setMessage("No se puede eliminar una fuente en uso");
                  }
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
