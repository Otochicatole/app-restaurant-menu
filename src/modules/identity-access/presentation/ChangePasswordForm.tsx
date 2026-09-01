"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

export function ChangePasswordForm({ successPath = "/admin" }: { successPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
          confirmPassword: form.get("confirmPassword"),
        }),
      });
      const result = (await response.json()) as ApiEnvelope<null>;
      if (!result.success) {
        setError(result.error.message || "No se pudo cambiar la contraseña");
        return;
      }

      router.push(successPath);
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Volvé a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label htmlFor="currentPassword" className="sr-only">Contraseña actual</label>
      <input
        id="currentPassword"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        disabled={loading}
        placeholder="Contraseña actual"
        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm disabled:opacity-60"
      />
      <label htmlFor="newPassword" className="sr-only">Nueva contraseña</label>
      <input
        id="newPassword"
        name="newPassword"
        type="password"
        minLength={12}
        maxLength={128}
        required
        autoComplete="new-password"
        disabled={loading}
        placeholder="Nueva contraseña"
        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm disabled:opacity-60"
      />
      <label htmlFor="confirmPassword" className="sr-only">Repetí la nueva contraseña</label>
      <input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        minLength={12}
        maxLength={128}
        required
        autoComplete="new-password"
        disabled={loading}
        placeholder="Repetí la nueva contraseña"
        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm disabled:opacity-60"
      />
      <p aria-live="polite" className={error ? "text-sm text-red-600" : "sr-only"}>
        {error ?? ""}
      </p>
      <button
        disabled={loading}
        className="w-full rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
