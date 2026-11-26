"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, UtensilsCrossed } from "lucide-react";
import { AdminModal } from "@/ui/admin/AdminUI";
import type { RestaurantProfile } from "../contracts";

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 disabled:bg-stone-50 disabled:text-stone-500";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50";

export function RestaurantProfileForm({
  restaurantId,
  initialData,
  menuEnabled = true,
  landingEnabled = true,
}: {
  restaurantId: string;
  initialData: RestaurantProfile;
  menuEnabled?: boolean;
  landingEnabled?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [baseline, setBaseline] = useState(initialData);
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sensitive =
    data.slug !== baseline.slug || data.landingSlug !== baseline.landingSlug;
  const dirty =
    sensitive ||
    data.name !== baseline.name ||
    data.publicDescription !== baseline.publicDescription;

  async function persist() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            ...(sensitive ? { currentPassword: password } : {}),
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error?.message || "No se pudo guardar el restaurante.",
        );
      }
      setData(payload.data);
      setBaseline(payload.data);
      setConfirm(false);
      setPassword("");
      setMessage("Cambios guardados.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo guardar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (sensitive) {
            setError("");
            setConfirm(true);
          } else {
            void persist();
          }
        }}
      >
        <div className="space-y-4">
          <label className="grid gap-1.5 text-xs font-medium text-stone-700">
            Nombre del restaurante
            <input
              className={fieldClass}
              required
              maxLength={100}
              value={data.name}
              disabled={saving}
              onChange={(event) =>
                setData({ ...data, name: event.target.value })
              }
            />
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-stone-700">
            Descripción pública
            <textarea
              rows={3}
              className={fieldClass}
              maxLength={500}
              placeholder="Breve reseña visible en la portada y metadatos públicos…"
              value={data.publicDescription}
              disabled={saving}
              onChange={(event) =>
                setData({ ...data, publicDescription: event.target.value })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-stone-700">
            <span className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-stone-400" />
                Enlace de la carta
              </span>
              {!menuEnabled && (
                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                  Inactivo en plan
                </span>
              )}
            </span>
            <input
              className={fieldClass}
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={data.slug}
              disabled={saving}
              onChange={(event) =>
                setData({ ...data, slug: event.target.value.toLowerCase() })
              }
            />
            <span className="font-mono text-[11px] font-normal text-stone-500">
              /m/{data.slug || "tu-carta"}
            </span>
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-stone-700">
            <span className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-stone-400" />
                Enlace de la landing
              </span>
              {!landingEnabled && (
                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                  Inactivo en plan
                </span>
              )}
            </span>
            <input
              className={fieldClass}
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={data.landingSlug}
              disabled={saving}
              onChange={(event) =>
                setData({
                  ...data,
                  landingSlug: event.target.value.toLowerCase(),
                })
              }
            />
            <span className="font-mono text-[11px] font-normal text-stone-500">
              /l/{data.landingSlug || "tu-landing"}
            </span>
          </label>
        </div>

        {sensitive && (
          <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Modificar los enlaces públicos pedirá confirmar con tu contraseña actual.
          </p>
        )}

        {error && !confirm && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900"
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <span className="text-xs text-stone-500">
            {dirty ? "Tenés cambios sin guardar." : "Todos los cambios guardados."}
          </span>
          <button
            className={primaryButtonClass}
            disabled={saving || !dirty}
            type="submit"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>

      <AdminModal
        open={confirm}
        title="Confirmá los cambios"
        description="Vas a cambiar los enlaces públicos de este restaurante. Los enlaces anteriores dejarán de funcionar."
        onClose={() => {
          if (!saving) {
            setConfirm(false);
            setPassword("");
          }
        }}
      >
        <div className="space-y-4">
          <label className="grid gap-1.5 text-xs font-medium text-stone-700">
            Contraseña actual
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              className={fieldClass}
              value={password}
              disabled={saving}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && password.trim()) void persist();
              }}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={saving}
              onClick={() => {
                setConfirm(false);
                setPassword("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saving || !password.trim()}
              onClick={() => void persist()}
            >
              {saving ? "Guardando…" : "Confirmar y guardar"}
            </button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
