"use client";

import { useEffect, useRef, useState } from "react";
import { AdminModal } from "@/ui/admin/AdminUI";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";

type ProfileFormData = {
  name: string;
  publicDescription: string;
  slug: string;
  email: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function RestaurantProfileForm({
  initialData,
  slug,
  email,
}: {
  initialData: { name: string; publicDescription: string };
  slug: string;
  email: string;
}) {
  const [baseline, setBaseline] = useState({ slug, email: email.toLowerCase() });
  const [data, setData] = useState<ProfileFormData>({
    name: initialData.name,
    publicDescription: initialData.publicDescription,
    slug,
    email,
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const resetTimer = useRef<number | null>(null);

  const sensitiveChanged =
    data.slug !== baseline.slug || data.email.trim().toLowerCase() !== baseline.email;

  useEffect(() => {
    return () => {
      if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const updateField = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    if (saveState === "saved" || saveState === "error") {
      setSaveState("idle");
      setFormError(null);
    }
  };

  const closeConfirm = () => {
    if (saveState === "saving") return;
    setShowConfirm(false);
    setCurrentPassword("");
    setConfirmError(null);
  };

  const persist = async (password?: string) => {
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    setSaveState("saving");
    setFormError(null);
    setConfirmError(null);
    try {
      const response = await fetch("/api/account/restaurant-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(password ? { currentPassword: password } : {}),
        }),
      });
      const payload = await response.json();
      if (response.ok && payload.success) {
        const saved = payload.data as ProfileFormData;
        setData({
          name: saved.name,
          publicDescription: saved.publicDescription,
          slug: saved.slug,
          email: saved.email,
        });
        setBaseline({ slug: saved.slug, email: saved.email.toLowerCase() });
        setCurrentPassword("");
        setShowConfirm(false);
        setConfirmError(null);
        setSaveState("saved");
        resetTimer.current = window.setTimeout(() => setSaveState("idle"), 2000);
        return;
      }
      const message = payload.error?.message ?? "No se pudo guardar";
      if (showConfirm || password) {
        setSaveState("error");
        setConfirmError(message);
      } else {
        setSaveState("error");
        setFormError(message);
      }
    } catch {
      const message = "No se pudo guardar";
      if (showConfirm || password) {
        setSaveState("error");
        setConfirmError(message);
      } else {
        setSaveState("error");
        setFormError(message);
      }
    }
  };

  const buttonLabel =
    saveState === "saving" && !showConfirm
      ? "Guardando…"
      : saveState === "saved"
        ? "Guardado"
        : "Guardar";

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (saveState === "saving") return;
          if (sensitiveChanged) {
            setConfirmError(null);
            setCurrentPassword("");
            setShowConfirm(true);
            return;
          }
          void persist();
        }}
      >
        <label className="block text-sm font-medium text-zinc-700">
          Nombre del menú
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            value={data.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            maxLength={100}
            disabled={saveState === "saving"}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Descripción pública
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            value={data.publicDescription}
            onChange={(event) => updateField("publicDescription", event.target.value)}
            maxLength={500}
            disabled={saveState === "saving"}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Slug público
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              value={data.slug}
              onChange={(event) => updateField("slug", event.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Solo minúsculas, números y guiones"
              disabled={saveState === "saving"}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-400">/m/{data.slug || "…"}</span>
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Correo de acceso
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              value={data.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
              disabled={saveState === "saving"}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-400">
              Correo de ingreso a la cuenta
            </span>
          </label>
        </div>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:items-center">
          {formError && (
            <p role="alert" className="text-sm text-red-600 sm:mr-auto">
              {formError}
            </p>
          )}
          <button
            className="rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={saveState === "saving"}
          >
            {buttonLabel}
          </button>
        </div>
      </form>

      <AdminModal
        open={showConfirm}
        title="Confirmá los cambios"
        description="Vas a modificar el slug o el correo. Ingresá tu contraseña para continuar."
        onClose={closeConfirm}
      >
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
          {data.slug !== baseline.slug && (
            <p>
              <span className="font-semibold text-zinc-700">Slug:</span>{" "}
              <span className="font-mono text-zinc-500 line-through">/m/{baseline.slug}</span>
              {" → "}
              <span className="font-mono text-zinc-900">/m/{data.slug}</span>
            </p>
          )}
          {data.email.trim().toLowerCase() !== baseline.email && (
            <p>
              <span className="font-semibold text-zinc-700">Correo:</span>{" "}
              <span className="text-zinc-500 line-through">{baseline.email}</span>
              {" → "}
              <span className="text-zinc-900">{data.email.trim().toLowerCase()}</span>
            </p>
          )}
        </div>

        <label className="mt-4 grid gap-1.5 text-xs font-semibold text-zinc-600">
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              if (confirmError) setConfirmError(null);
            }}
            disabled={saveState === "saving"}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50"
            placeholder="Confirmá tu contraseña"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (currentPassword.trim() && saveState !== "saving") {
                  void persist(currentPassword);
                }
              }
            }}
          />
        </label>

        {confirmError && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {confirmError}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={saveState === "saving"} onClick={closeConfirm} className={adminSecondaryButtonClass}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={saveState === "saving" || !currentPassword.trim()}
            onClick={() => void persist(currentPassword)}
            className={adminPrimaryButtonClass}
          >
            {saveState === "saving" ? "Guardando…" : "Confirmar y guardar"}
          </button>
        </div>
      </AdminModal>
    </>
  );
}
