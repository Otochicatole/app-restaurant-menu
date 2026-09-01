"use client";

import { useState } from "react";

export function RestaurantProfileForm({ initialData, slug, email }: { initialData: { name: string; publicDescription: string }; slug: string; email: string }) {
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState("");
  return <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); setStatus("Guardando..."); const response = await fetch("/api/account/restaurant-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const payload = await response.json(); setStatus(response.ok && payload.success ? "Guardado" : payload.error?.message ?? "No se pudo guardar"); }}>
    <label className="block text-sm font-medium text-zinc-700">Nombre del restaurante<input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} /></label>
    <label className="block text-sm font-medium text-zinc-700">Descripción pública<textarea className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-2" value={data.publicDescription} onChange={(event) => setData({ ...data, publicDescription: event.target.value })} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-zinc-700">Slug público<input className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500" value={slug} readOnly /></label><label className="block text-sm font-medium text-zinc-700">Correo de acceso<input className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500" value={email} readOnly /></label></div>
    <div className="flex items-center justify-end"><button className="rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Guardar {status && `· ${status}`}</button></div>
  </form>;
}
