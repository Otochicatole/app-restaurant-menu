"use client";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

export function AccountProfileForm({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const fieldClass = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15";
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setNotice(null);
    try {
      const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, currentPassword: password }) });
      const result = await response.json() as ApiEnvelope<{ name: string; email: string }>;
      if (!result.success) { setNotice({ error: true, message: result.error.message }); return; }
      setName(result.data.name); setEmail(result.data.email); setSavedEmail(result.data.email); setPassword(""); setNotice({ error: false, message: "Cuenta actualizada." });
    } catch { setNotice({ error: true, message: "No pudimos conectar con el servidor. Volvé a intentarlo." }); }
    finally { setPending(false); }
  }}>
    <label className="grid gap-2 text-sm font-medium">Nombre de la organización<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={pending} className={fieldClass} /></label>
    <label className="grid gap-2 text-sm font-medium">Correo de acceso<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} className={fieldClass} /></label>
    {email.trim().toLowerCase() !== savedEmail && <label className="grid gap-2 text-sm font-medium">Contraseña actual<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} className={fieldClass} /></label>}
    {notice && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-900"}`}>{notice.message}</p>}
    <button disabled={pending} className="rounded-xl bg-[#182618] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#253621] disabled:opacity-50">{pending ? "Guardando…" : "Guardar cuenta"}</button>
  </form>;
}
