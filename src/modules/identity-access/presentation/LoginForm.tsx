"use client";

import { CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
        <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#3d4a3e]">
          Correo electrónico
        </label>
        <div className="group relative mt-2">
          <Mail aria-hidden="true" size={17} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7d877b] transition-colors group-focus-within:text-[#253621]" />
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            disabled={loading}
            className="block w-full rounded-xl border border-zinc-300 bg-white py-3.5 pl-11 pr-4 text-sm text-[#141d14] outline-none transition duration-150 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="nombre@restaurante.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#3d4a3e]">
          Contraseña
        </label>
        <div className="group relative mt-2">
          <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7d877b] transition-colors group-focus-within:text-[#253621]" />
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            disabled={loading}
            className="block w-full rounded-xl border border-zinc-300 bg-white py-3.5 pl-11 pr-12 text-sm text-[#141d14] outline-none transition duration-150 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Ingresá tu contraseña"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
            aria-pressed={showPassword}
            disabled={loading}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#253621] disabled:opacity-50"
          >
            {showPassword ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
      <div aria-live="polite" className={error ? "flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800" : "sr-only"}>
        {error && <CircleAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />}
        <span>{error ?? ""}</span>
      </div>
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#162315] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-[#0f180f] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#253621]/30 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {loading ? <><LoaderCircle className="animate-spin" size={17} /> Preparando tu espacio…</> : <><span>Iniciar sesión</span><LogIn size={17} /></>}
      </button>
    </form>
  );
}
