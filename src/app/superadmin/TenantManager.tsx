"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TenantRow = { id: string; name: string; slug: string; status: "ACTIVE" | "SUSPENDED"; createdAt: string; email: string; lastLoginAt: string | null };
type Result = { success: boolean; error?: string; temporaryPassword?: string };

export function TenantManager({ tenants, createTenant, updateTenant, toggleTenant, resetPassword, deleteTenant }: {
  tenants: TenantRow[];
  createTenant: (formData: FormData) => Promise<Result>;
  updateTenant: (formData: FormData) => Promise<Result>;
  toggleTenant: (formData: FormData) => Promise<Result>;
  resetPassword: (formData: FormData) => Promise<Result>;
  deleteTenant: (formData: FormData) => Promise<Result>;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: (formData: FormData) => Promise<Result>, formData: FormData) {
    setLoading(true); setNotice(null);
    const result = await action(formData);
    setLoading(false);
    if (!result.success) { setNotice(result.error ?? "No se pudo completar la operación"); return; }
    if (result.temporaryPassword) { setTemporaryPassword(result.temporaryPassword); router.refresh(); }
    else window.location.reload();
  }

  return <div className="space-y-8">
    {notice && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{notice}</div>}
    {temporaryPassword && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p className="font-bold">Contraseña temporal (guardala ahora)</p><code className="mt-3 block rounded-lg bg-white px-3 py-2 text-base">{temporaryPassword}</code><button onClick={() => setTemporaryPassword(null)} className="mt-3 text-xs font-bold uppercase tracking-wide">Cerrar</button></div>}
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Nuevo cliente</p>
      <form action={(formData) => run(createTenant, formData)} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto]"><input name="name" required placeholder="Nombre del negocio" className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /><input name="email" type="email" required placeholder="Correo de acceso" className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="slug-publico" className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /><button disabled={loading} className="rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Crear cuenta</button></form>
    </div>
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm"><div className="border-b border-zinc-100 px-6 py-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Clientes</p><h2 className="mt-2 text-xl font-semibold">Menús administrados</h2></div><div className="divide-y divide-zinc-100">
      {tenants.map((tenant) => <div key={tenant.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.2fr_1.2fr_0.8fr_auto] lg:items-center"><div><p className="font-semibold text-zinc-950">{tenant.name}</p><p className="text-sm text-zinc-500">{tenant.email}</p><form action={(formData) => run(updateTenant, formData)} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={tenant.id} /><input name="name" defaultValue={tenant.name} className="w-36 rounded-lg border border-zinc-200 px-2 py-1 text-xs" /><input name="email" type="email" defaultValue={tenant.email} className="w-48 rounded-lg border border-zinc-200 px-2 py-1 text-xs" /><button className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold">Guardar</button></form></div><div><Link href={`/m/${tenant.slug}`} target="_blank" className="text-sm font-semibold text-emerald-700 hover:underline">/m/{tenant.slug}</Link><p className="text-xs text-zinc-400">{tenant.lastLoginAt ? `Último acceso: ${new Date(tenant.lastLoginAt).toLocaleString("es-AR")}` : "Sin ingresos todavía"}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tenant.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>{tenant.status === "ACTIVE" ? "Activo" : "Suspendido"}</span><div className="flex flex-wrap gap-2"><form action={(formData) => run(toggleTenant, formData)}><input type="hidden" name="id" value={tenant.id} /><input type="hidden" name="status" value={tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} /><button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold">{tenant.status === "ACTIVE" ? "Suspender" : "Reactivar"}</button></form><form action={(formData) => run(resetPassword, formData)}><input type="hidden" name="id" value={tenant.id} /><button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold">Resetear clave</button></form><form action={async (formData) => { if (window.confirm(`Borrar definitivamente ${tenant.slug}?`)) await run(deleteTenant, formData); }}><input type="hidden" name="id" value={tenant.id} /><input type="hidden" name="slug" value={tenant.slug} /><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Borrar</button></form></div></div>)}
      {tenants.length === 0 && <p className="px-6 py-10 text-sm text-zinc-500">Todavía no hay clientes.</p>}
    </div></div>
  </div>;
}
