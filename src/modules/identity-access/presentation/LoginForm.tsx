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
        <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d584e]">
          Correo electrónico
        </label>
        <div className="group relative mt-2">
          <Mail aria-hidden="true" size={17} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9189] transition-colors group-focus-within:text-[#7a55a8]" />
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            disabled={loading}
            className="block w-full rounded-2xl border border-[#26351f]/12 bg-white/65 py-3.5 pl-11 pr-4 text-sm text-[#172019] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition duration-200 placeholder:text-[#92988f] hover:border-[#26351f]/25 focus:border-[#8a61b6] focus:bg-white focus:ring-4 focus:ring-[#cfb1fc]/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="nombre@restaurante.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d584e]">
          Contraseña
        </label>
        <div className="group relative mt-2">
          <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9189] transition-colors group-focus-within:text-[#7a55a8]" />
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            disabled={loading}
            className="block w-full rounded-2xl border border-[#26351f]/12 bg-white/65 py-3.5 pl-11 pr-12 text-sm text-[#172019] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition duration-200 placeholder:text-[#92988f] hover:border-[#26351f]/25 focus:border-[#8a61b6] focus:bg-white focus:ring-4 focus:ring-[#cfb1fc]/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Ingresá tu contraseña"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
            aria-pressed={showPassword}
            disabled={loading}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#767e76] transition hover:bg-[#3a4824]/8 hover:text-[#27351f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a61b6] disabled:opacity-50"
          >
            {showPassword ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
      <div aria-live="polite" className={error ? "flex items-start gap-2.5 rounded-xl border border-[#b74f3e]/20 bg-[#fff5f1] px-3.5 py-3 text-sm leading-5 text-[#9a3e31]" : "sr-only"}>
        {error && <CircleAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />}
        <span>{error ?? ""}</span>
      </div>
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="flex w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,#24351f_0%,#3a4824_58%,#7652a4_145%)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_38px_-19px_rgba(27,45,25,0.9)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_45px_-18px_rgba(27,45,25,0.8)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfb1fc]/40 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {loading ? <><LoaderCircle className="animate-spin" size={17} /> Preparando tu espacio…</> : <><span>Iniciar sesión</span><LogIn size={17} /></>}
      </button>
    </form>
  );
}
