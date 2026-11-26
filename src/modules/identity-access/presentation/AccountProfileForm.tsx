"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import type { ApiEnvelope } from "../contracts";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 disabled:bg-stone-50 disabled:text-stone-500";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50";

export function AccountProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [savedName, setSavedName] = useState(initialName);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{
    error: boolean;
    message: string;
  } | null>(null);

  const emailChanged = email.trim().toLowerCase() !== savedEmail.toLowerCase();
  const dirty = emailChanged || name.trim() !== savedName.trim();

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setNotice(null);
        try {
          const response = await fetch("/api/account/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              currentPassword: password,
            }),
          });
          const result = (await response.json()) as ApiEnvelope<{
            name: string;
            email: string;
          }>;
          if (!result.success) {
            setNotice({ error: true, message: result.error.message });
            return;
          }
          setName(result.data.name);
          setSavedName(result.data.name);
          setEmail(result.data.email);
          setSavedEmail(result.data.email);
          setPassword("");
          setNotice({ error: false, message: "Cuenta actualizada." });
          router.refresh();
        } catch {
          setNotice({
            error: true,
            message: "No pudimos conectar con el servidor. Volvé a intentarlo.",
          });
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="grid gap-1.5 text-xs font-medium text-stone-700">
        Nombre de la organización
        <input
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          className={fieldClass}
        />
      </label>

      <label className="grid gap-1.5 text-xs font-medium text-stone-700">
        Correo de acceso
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          className={fieldClass}
        />
      </label>

      {emailChanged && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-amber-900">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Para cambiar el correo de acceso, confirmá tu contraseña actual.
          </p>
          <label className="grid gap-1.5 text-xs font-medium text-stone-700">
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              className={fieldClass}
            />
          </label>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className={`rounded-lg border px-3.5 py-2.5 text-xs ${
            notice.error
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {notice.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <span className="text-xs text-stone-500">
          {dirty ? "Tenés cambios sin guardar." : "Datos al día."}
        </span>
        <button disabled={pending || !dirty} className={primaryButtonClass}>
          {pending ? "Guardando…" : "Guardar cuenta"}
        </button>
      </div>
    </form>
  );
}
