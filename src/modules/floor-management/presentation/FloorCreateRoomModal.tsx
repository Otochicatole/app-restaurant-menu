"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, Check, Sparkles, X } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { floorInputClass } from "./floor-api";

export type RoomDimensionPreset = {
  id: string;
  label: string;
  description: string;
  width: number;
  height: number;
};

export const roomDimensionPresets: RoomDimensionPreset[] = [
  {
    id: "square-2000",
    label: "2000 × 2000 px",
    description: "Cuadrado estándar · Recomendado",
    width: 2000,
    height: 2000,
  },
  {
    id: "wide-2400",
    label: "2400 × 1600 px",
    description: "Formato amplio horizontal",
    width: 2400,
    height: 1600,
  },
  {
    id: "compact-1500",
    label: "1500 × 1500 px",
    description: "Salón compacto o reservado",
    width: 1500,
    height: 1500,
  },
  {
    id: "custom",
    label: "Personalizado",
    description: "Definir medidas exactas",
    width: 2000,
    height: 2000,
  },
];

export type FloorCreateRoomModalProps = {
  open: boolean;
  existingNames: string[];
  busy?: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; width: number; height: number }) => void;
};

function getSuggestedRoomName(existingNames: string[]): string {
  let base = "Nuevo salón";
  if (existingNames.includes(base)) {
    let suffix = 2;
    while (existingNames.includes(`${base} ${suffix}`)) suffix += 1;
    base = `${base} ${suffix}`;
  }
  return base;
}

export function FloorCreateRoomModal(props: FloorCreateRoomModalProps) {
  if (!props.open) return null;
  return <FloorCreateRoomModalDialog {...props} key={props.existingNames.join(",")} />;
}

function FloorCreateRoomModalDialog({
  existingNames,
  busy = false,
  onClose,
  onCreate,
}: Omit<FloorCreateRoomModalProps, "open">) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const [name, setName] = useState(() => getSuggestedRoomName(existingNames));
  const [selectedPreset, setSelectedPreset] = useState<string>("square-2000");
  const [customWidth, setCustomWidth] = useState(2000);
  const [customHeight, setCustomHeight] = useState(2000);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    }
    window.requestAnimationFrame(() => nameInputRef.current?.select());

    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!busy) onClose();
    };
    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open) {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute("open");
        }
      }
    };
  }, [busy, onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Ingresá un nombre para el salón.");
      return;
    }
    if (existingNames.some((item) => item.toLowerCase() === cleanName.toLowerCase())) {
      setError("Ya existe un salón con este nombre.");
      return;
    }

    let finalWidth = 2000;
    let finalHeight = 2000;

    if (selectedPreset === "custom") {
      finalWidth = Math.max(300, Math.min(2000, Math.round(customWidth)));
      finalHeight = Math.max(300, Math.min(2000, Math.round(customHeight)));
    } else {
      const preset = roomDimensionPresets.find((p) => p.id === selectedPreset);
      if (preset) {
        finalWidth = preset.width;
        finalHeight = preset.height;
      }
    }

    onCreate({ name: cleanName, width: finalWidth, height: finalHeight });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-[var(--floor-border,#cad9df)] bg-white p-0 shadow-2xl backdrop:bg-zinc-950/40 backdrop:backdrop-blur-xs"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--floor-border,#cad9df)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--floor-action,#155e75)] text-white shadow-xs">
              <Building2 size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-bold text-[var(--floor-ink,#173642)] sm:text-lg">
                Crear nuevo salón
              </h2>
              <p className="text-xs text-[var(--floor-muted,#4b6470)]">
                Definí el nombre y el espacio para ubicar sectores y mesas
              </p>
            </div>
          </div>
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            aria-label="Cerrar ventana"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="space-y-5 p-6">
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
              {error}
            </p>
          )}

          {/* Name input */}
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--floor-ink,#173642)]">
            <span>Nombre del salón</span>
            <input
              ref={nameInputRef}
              type="text"
              required
              maxLength={60}
              placeholder="Ej: Salón principal, Terraza, Patio"
              disabled={busy}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className={`${floorInputClass} min-h-11 font-medium`}
            />
          </label>

          {/* Dimensions presets */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[var(--floor-ink,#173642)]">
              Dimensiones del salón
            </span>
            <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Dimensiones del salón">
              {roomDimensionPresets.map((preset) => {
                const active = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-hover,#e6f2f6)] ring-2 ring-[var(--floor-focus,#0e7490)]/20"
                        : "border-[var(--floor-border,#cad9df)] bg-white hover:bg-[var(--floor-hover,#e6f2f6)]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-bold text-sm text-[var(--floor-ink,#173642)]">
                        {preset.label}
                      </span>
                      {active && <Check size={16} className="text-[var(--floor-action,#155e75)]" />}
                    </div>
                    <span className="text-[11px] text-[var(--floor-muted,#4b6470)]">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom dimensions if chosen */}
          {selectedPreset === "custom" && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] p-3">
              <label className="grid gap-1 text-xs font-medium text-[var(--floor-ink,#173642)]">
                Ancho (px, máx 2000)
                <input
                  type="number"
                  min={300}
                  max={2000}
                  step={20}
                  required
                  value={customWidth}
                  disabled={busy}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  className={`${floorInputClass} min-h-10 text-center font-bold`}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-[var(--floor-ink,#173642)]">
                Largo / Alto (px, máx 2000)
                <input
                  type="number"
                  min={300}
                  max={2000}
                  step={20}
                  required
                  value={customHeight}
                  disabled={busy}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  className={`${floorInputClass} min-h-10 text-center font-bold`}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 border-t border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] px-6 py-4">
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onClose}
            className={adminSecondaryButtonClass}
          >
            Cancelar
          </button>
          <button
            {...transientButtonProps}
            type="submit"
            disabled={busy || !name.trim()}
            className={`${adminPrimaryButtonClass} inline-flex items-center gap-2`}
          >
            <Sparkles size={16} aria-hidden="true" />
            Crear salón y diseñar
          </button>
        </footer>
      </form>
    </dialog>
  );
}
