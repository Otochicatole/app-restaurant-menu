"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
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
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (busy) return;
    const candidate = inventoryEditable ? fields : { ...table, x: fields.x, y: fields.y, rotation: fields.rotation };
    const parsed = floorTableSchema.safeParse(candidate.shape === "RECTANGLE" ? candidate : { ...candidate, height: candidate.width });
    if (!parsed.success) { setValidationError("Revisá los datos de la mesa: el nombre es obligatorio, las medidas deben ser positivas y la capacidad un número entero entre 1 y 500."); return; }
    setValidationError(null); onApply(parsed.data);
  }}>
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      {inventoryEditable ? <>
        <p className="text-sm leading-relaxed text-[#52634b]">Las propiedades del inventario se guardan al aplicar. La posición y el giro se confirman con el armado.</p>
        <label className="grid gap-1 text-xs font-medium text-[#46543e]">Número o nombre<input required maxLength={40} className={floorInputClass} value={fields.label} onChange={(event) => change({ label: event.target.value })} /></label>
        <label className="grid gap-1 text-xs font-medium text-[#46543e]">Forma<select className={floorInputClass} value={fields.shape} onChange={(event) => { const shape = event.target.value as FloorTable["shape"]; change({ shape, ...(shape === "RECTANGLE" ? {} : { height: fields.width }) }); }}><option value="SQUARE">Cuadrada</option><option value="RECTANGLE">Rectangular</option><option value="CIRCLE">Redonda</option></select></label>
        <div className="grid grid-cols-2 gap-3"><NumberField label={fields.shape === "CIRCLE" ? "Diámetro" : "Ancho"} value={fields.width} min={0} max={20000} onChange={(width) => change({ width, ...(fields.shape === "RECTANGLE" ? {} : { height: width }) })} />{fields.shape === "RECTANGLE" && <NumberField label="Alto" value={fields.height} min={0} max={20000} onChange={(height) => change({ height })} />}</div>
        <NumberField label="Capacidad" value={fields.capacity} min={1} max={500} step={1} onChange={(capacity) => change({ capacity })} />
        <label className="flex min-h-11 items-center gap-2 text-sm text-[#46543e]"><input type="checkbox" checked={fields.active} onChange={(event) => change({ active: event.target.checked })} />Disponible en el inventario</label>
      </> : <div className="space-y-2"><p className="text-sm font-semibold text-[#263e23]">Mesa {table.label} · {shapeName} {table.width} × {table.height}</p><p className="text-sm leading-relaxed text-[#52634b]">Podés acomodar la mesa en este armado. Un administrador puede cambiar su nombre, forma, medidas y capacidad en el inventario.</p></div>}
      <section aria-label="Posición de la mesa" className="space-y-3 border-t border-stone-200 pt-4"><div className="grid grid-cols-2 gap-3"><NumberField label="Centro X" value={fields.x} min={-100000} max={100000} onChange={(x) => change({ x })} /><NumberField label="Centro Y" value={fields.y} min={-100000} max={100000} onChange={(y) => change({ y })} /></div><label className="grid gap-1 text-xs font-medium text-[#46543e]">Rotación<select className={floorInputClass} value={fields.rotation} onChange={(event) => change({ rotation: Number(event.target.value) as FloorRotation })}>{([0, 90, 180, 270] as const).map((rotation) => <option key={rotation} value={rotation}>{rotation}°</option>)}</select></label></section>
      {(validationError || error) && <p role="alert" className="text-sm leading-relaxed text-red-800">{validationError || error}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-5"><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onCancel}>Cancelar</button><button {...transientButtonProps} type="submit" className={adminPrimaryButtonClass}>{busy ? <><Loader2 size={15} className="animate-spin" />Guardando…</> : "Aplicar cambios"}</button></div>
    </fieldset>
  </form>;
}

function NumberField({ label, value, min, max, step = "any", onChange }: { label: string; value: number; min?: number; max?: number; step?: string | number; onChange: (value: number) => void }) {
  return <label className="grid gap-1 text-xs font-medium text-[#46543e]">{label}<input required type="number" min={min} max={max} step={step} value={value} className={floorInputClass} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
