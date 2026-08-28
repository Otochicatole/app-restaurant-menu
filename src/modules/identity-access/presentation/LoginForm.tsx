"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope, LoginView } from "../contracts";

export interface LoginFormProps {
  onSuccess?: (data: LoginView) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = (await response.json()) as ApiEnvelope<LoginView>;
      if (!result.success) {
        setError(result.error.message || "No se pudo iniciar sesión");
        return;
      }

      if (onSuccess) onSuccess(result.data);
      else if (result.data.role === "SUPER_ADMIN") router.push("/superadmin");
      else if (result.data.mustChangePassword) router.push("/admin/account/password");
      else router.push("/admin");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Volvé a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Correo electrónico
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          disabled={loading}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
          placeholder="admin@restaurant.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Contraseña
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="current-password"
          disabled={loading}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
          placeholder="Ingresá tu contraseña"
        />
      </div>
      <p aria-live="polite" className={error ? "text-sm text-red-600" : "sr-only"}>
        {error ?? ""}
      </p>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
      >
        {loading ? "Ingresando..." : <><LogIn size={16} /> Iniciar sesión</>}
      </button>
    </form>
  );
}
