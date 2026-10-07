"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

const inputClassName =
  "block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3.5 text-sm text-zinc-900 outline-none transition duration-200 placeholder:text-zinc-400 hover:border-zinc-300 hover:bg-white focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-200/80 disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "block text-xs font-medium text-zinc-700";

export function ChangePasswordForm({
  successPath = "/admin",
  className = "",
}: {
  successPath?: string;
  className?: string;
}) {
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
    <form onSubmit={submit} className={`space-y-4 ${className}`.trim()}>
      <div>
        <label htmlFor="currentPassword" className={labelClassName}>
          Contraseña actual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          disabled={loading}
          placeholder="Tu contraseña actual"
          className={`${inputClassName} mt-1.5`}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className={labelClassName}>
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
          disabled={loading}
          placeholder="Mínimo 12 caracteres"
          className={`${inputClassName} mt-1.5`}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClassName}>
          Repetí la nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
          disabled={loading}
          placeholder="Confirmá la nueva contraseña"
          className={`${inputClassName} mt-1.5`}
        />
      </div>

      <div
        aria-live="polite"
        className={
          error
            ? "flex items-start gap-2.5 rounded-xl border border-red-200/80 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800"
            : "sr-only"
        }
      >
        {error && <CircleAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />}
        <span>{error ?? ""}</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoaderCircle className="animate-spin" size={17} />
            Guardando…
          </>
        ) : (
          "Guardar contraseña"
        )}
      </button>
    </form>
  );
}
