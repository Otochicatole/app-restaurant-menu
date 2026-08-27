"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";

interface LoginFormProps {
  onSuccess?: (data: { role?: string; mustChangePassword?: boolean }) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (onSuccess) onSuccess(data.data ?? {});
        else if (data.data?.role === "SUPER_ADMIN") router.push("/superadmin");
        else if (data.data?.mustChangePassword) router.push("/admin/account/password");
        else router.push("/admin");
      } else {
        setError(data.error?.message ?? "No se pudo iniciar sesión");
      }
    } catch {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

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
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
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
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          placeholder="Ingresá tu contraseña"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
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
