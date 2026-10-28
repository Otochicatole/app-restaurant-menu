"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RestaurantProfile } from "../contracts";
import { AdminModal } from "@/ui/admin/AdminUI";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
export function RestaurantProfileForm({ restaurantId, initialData }: { restaurantId: string; initialData: RestaurantProfile }) {
 const router = useRouter();
 const [data, setData] = useState(initialData);
 const [baseline, setBaseline] = useState(initialData);
 const [confirm, setConfirm] = useState(false);
 const [password, setPassword] = useState("");
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState("");
 const [error, setError] = useState("");
 const sensitive = data.slug !== baseline.slug || data.landingSlug !== baseline.landingSlug;
 async function persist() {
  setSaving(true); setError(""); setMessage("");
  try {
   const response = await fetch("/api/restaurants/" + encodeURIComponent(restaurantId) + "/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, ...(sensitive ? { currentPassword: password } : {}) }) });
   const payload = await response.json();
   if (!response.ok || !payload.success) throw new Error(payload.error?.message || "No se pudo guardar el restaurante.");
   setData(payload.data); setBaseline(payload.data); setConfirm(false); setPassword(""); setMessage("Cambios guardados."); router.refresh();
  } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
  finally { setSaving(false); }
 }
 const fieldClass = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15";
 return <><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (sensitive) { setError(""); setConfirm(true); } else void persist(); }}>
  <label className="block text-sm font-medium text-zinc-700">Nombre del restaurante<input className={fieldClass} required maxLength={100} value={data.name} disabled={saving} onChange={(event) => setData({ ...data, name: event.target.value })} /></label>
  <label className="block text-sm font-medium text-zinc-700">Descripción pública<textarea className={fieldClass} maxLength={500} value={data.publicDescription} disabled={saving} onChange={(event) => setData({ ...data, publicDescription: event.target.value })} /></label>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="block text-sm font-medium text-zinc-700">Enlace de la carta<input className={fieldClass} required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={data.slug} disabled={saving} onChange={(event) => setData({ ...data, slug: event.target.value.toLowerCase() })} /><span className="mt-1 block text-xs text-zinc-500">/m/{data.slug}</span></label>
   <label className="block text-sm font-medium text-zinc-700">Enlace de la landing<input className={fieldClass} required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={data.landingSlug} disabled={saving} onChange={(event) => setData({ ...data, landingSlug: event.target.value.toLowerCase() })} /><span className="mt-1 block text-xs text-zinc-500">/l/{data.landingSlug}</span></label>
  </div>
  {error && !confirm && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-green-800">{message}</p>}
  <button className={adminPrimaryButtonClass} disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar"}</button>
 </form><AdminModal open={confirm} title="Confirmá los cambios" description="Vas a cambiar los enlaces públicos de este restaurante. Los enlaces anteriores dejarán de funcionar." onClose={() => { if (!saving) { setConfirm(false); setPassword(""); } }}>
  <label className="block text-sm font-medium text-zinc-700">Contraseña actual<input autoFocus type="password" autoComplete="current-password" className={fieldClass} value={password} disabled={saving} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && password.trim()) void persist(); }} /></label>
  {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  <div className="mt-5 flex justify-end gap-2"><button type="button" className={adminSecondaryButtonClass} disabled={saving} onClick={() => { setConfirm(false); setPassword(""); }}>Cancelar</button><button type="button" className={adminPrimaryButtonClass} disabled={saving || !password.trim()} onClick={() => void persist()}>{saving ? "Guardando…" : "Confirmar y guardar"}</button></div>
 </AdminModal></>;
}
