"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") }) });
    const data = await response.json();
    setLoading(false);
    if (!data.success) { setError(data.error?.message ?? "No se pudo cambiar la contraseña"); return; }
    router.push("/admin");
    router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-emerald-950 px-4 py-10"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Seguridad</p><h1 className="mt-3 text-3xl font-semibold text-zinc-950">Cambiá tu contraseña</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Usá al menos 12 caracteres. Este paso es obligatorio antes de administrar el menú.</p><form onSubmit={submit} className="mt-8 space-y-4"><input name="currentPassword" type="password" required placeholder="Contraseña actual" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" /><input name="newPassword" type="password" minLength={12} maxLength={128} required placeholder="Nueva contraseña" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" /><input name="confirmPassword" type="password" minLength={12} maxLength={128} required placeholder="Repetí la nueva contraseña" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" />{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Guardando..." : "Guardar contraseña"}</button></form></div></main>;
}
