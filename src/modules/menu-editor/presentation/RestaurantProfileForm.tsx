"use client";

import { useEffect, useRef, useState } from "react";

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
  const [data, setData] = useState<ProfileFormData>({
    name: initialData.name,
    publicDescription: initialData.publicDescription,
    slug,
    email,
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const updateField = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    if (saveState === "saved" || saveState === "error") {
      setSaveState("idle");
      setError(null);
    }
  };

  const buttonLabel =
    saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : "Guardar";

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saveState === "saving") return;
        if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
        setSaveState("saving");
        setError(null);
        try {
          const response = await fetch("/api/account/restaurant-profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
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
            setSaveState("saved");
            resetTimer.current = window.setTimeout(() => setSaveState("idle"), 2000);
          } else {
            setSaveState("error");
            setError(payload.error?.message ?? "No se pudo guardar");
          }
        } catch {
          setSaveState("error");
          setError("No se pudo guardar");
        }
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
        {error && (
          <p role="alert" className="text-sm text-red-600 sm:mr-auto">
            {error}
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
  );
}
