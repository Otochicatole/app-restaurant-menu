"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass } from "./floor-ui";
import { transientButtonProps } from "@/ui/button-state";
import { floorTableSchema, type FloorRotation, type FloorTable } from "../contracts";
import { floorInputClass } from "./floor-api";

export type FloorTableEditorProps = {
  table: FloorTable; inventoryEditable: boolean; busy: boolean; error?: string | null;
  onApply: (table: FloorTable) => void; onCancel: () => void;
};

export function FloorTableEditor({ table, inventoryEditable, busy, error, onApply, onCancel }: FloorTableEditorProps) {
  const [fields, setFields] = useState<FloorTable>(() => ({ ...table }));
  const [validationError, setValidationError] = useState<string | null>(null);
  const change = (partial: Partial<FloorTable>) => { setFields((value) => ({ ...value, ...partial })); setValidationError(null); };
  const shapeName = table.shape === "SQUARE" ? "Cuadrada" : table.shape === "RECTANGLE" ? "Rectangular" : "Redonda";
  return <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={(event) => {
    event.preventDefault();
    if (busy) return;
    const candidate = inventoryEditable ? fields : { ...table, x: fields.x, y: fields.y, rotation: fields.rotation };
    const parsed = floorTableSchema.safeParse(candidate.shape === "RECTANGLE" ? candidate : { ...candidate, height: candidate.width });
    if (!parsed.success) { setValidationError("Revisá los datos de la mesa: el nombre es obligatorio, las medidas deben ser positivas y la capacidad un número entero entre 1 y 500."); return; }
    setValidationError(null); onApply(parsed.data);
  }}>
    <fieldset disabled={busy} className="flex min-h-0 min-w-0 flex-1 flex-col">
     <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:thin] [scrollbar-color:var(--floor-scrollbar,#c6cec0)_transparent]">
      {inventoryEditable ? <>
        <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Las propiedades del inventario se guardan al aplicar. La posición y el giro se confirman con el armado.</p>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Número o nombre<input required maxLength={40} className={`${floorInputClass} min-h-11`} value={fields.label} onChange={(event) => change({ label: event.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Forma<select className={`${floorInputClass} min-h-11`} value={fields.shape} onChange={(event) => { const shape = event.target.value as FloorTable["shape"]; change({ shape, ...(shape === "RECTANGLE" ? {} : { height: fields.width }) }); }}><option value="SQUARE">Cuadrada</option><option value="RECTANGLE">Rectangular</option><option value="CIRCLE">Redonda</option></select></label>
          <NumberField label="Capacidad" value={fields.capacity} min={1} max={500} step={1} onChange={(capacity) => change({ capacity })} />
        </div>
        <div className="grid grid-cols-2 gap-3"><NumberField label={fields.shape === "CIRCLE" ? "Diámetro" : "Ancho"} value={fields.width} min={0} max={20000} onChange={(width) => change({ width, ...(fields.shape === "RECTANGLE" ? {} : { height: width }) })} />{fields.shape === "RECTANGLE" && <NumberField label="Alto" value={fields.height} min={0} max={20000} onChange={(height) => change({ height })} />}</div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--floor-muted,#46543e)]"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => change({ active: event.target.checked })} />Disponible en el inventario</label>
      </> : <div className="space-y-2"><p className="text-sm font-semibold text-[var(--floor-ink,#263e23)]">Mesa {table.label} · {shapeName} {table.width} × {table.height}</p><p className="text-sm leading-relaxed text-[var(--floor-muted,#52634b)]">Podés acomodar la mesa en este armado. Un administrador puede cambiar su nombre, forma, medidas y capacidad en el inventario.</p></div>}
      <section aria-label="Posición de la mesa" className="grid grid-cols-3 gap-2 border-t border-stone-200 pt-3"><NumberField label="Centro X" value={fields.x} min={-100000} max={100000} onChange={(x) => change({ x })} /><NumberField label="Centro Y" value={fields.y} min={-100000} max={100000} onChange={(y) => change({ y })} /><label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Rotación<select className={`${floorInputClass} min-h-11 px-2`} value={fields.rotation} onChange={(event) => change({ rotation: Number(event.target.value) as FloorRotation })}>{([0, 90, 180, 270] as const).map((rotation) => <option key={rotation} value={rotation}>{rotation}°</option>)}</select></label></section>
     </div>
      <footer className="shrink-0 space-y-2 border-t border-stone-200 bg-white px-4 py-3">
        {(validationError || error) && <p role="alert" className="text-xs leading-relaxed text-red-800">{validationError || error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><button {...transientButtonProps} type="button" className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`} onClick={onCancel}>Cancelar</button><button {...transientButtonProps} type="submit" className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`}>{busy ? <><Loader2 size={14} className="animate-spin" />Guardando…</> : "Aplicar cambios"}</button></div>
      </footer>
    </fieldset>
  </form>;
}

function NumberField({ label, value, min, max, step = "any", onChange }: { label: string; value: number; min?: number; max?: number; step?: string | number; onChange: (value: number) => void }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">{label}<input required type="number" min={min} max={max} step={step} value={value} className={`${floorInputClass} min-h-11 px-2`} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
