"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";
import type { FloorRotation, FloorTable, FloorTableShape } from "../contracts";
import { floorInputClass } from "./floor-api";
import { applyFloorSelectionChanges, type FloorSelectionChanges } from "./floor-selection-editor";
import { floorPrimaryButtonClass, floorSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";

export type FloorSelectionEditorMode = "layout" | "inventory";

export type FloorSelectionEditorProps = {
  tables: FloorTable[];
  busy: boolean;
  disabled?: boolean;
  error?: string | null;
  onApply: (tables: FloorTable[], mode: FloorSelectionEditorMode) => void;
  onCancel: () => void;
  inventoryEditable?: boolean;
  positionsEditable?: boolean;
  initialTab?: FloorSelectionEditorMode;
};

type NumericField = "width" | "height" | "capacity" | "x" | "y" | "translationX" | "translationY";
type Fields = Partial<Record<NumericField, string>> & { shape?: FloorTableShape; active?: boolean; rotation?: FloorRotation };
const mutedClass = "text-xs leading-relaxed text-[var(--floor-muted,#52634b)]";
const labelClass = "grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]";
const sectionClass = "space-y-3 border-t border-[var(--floor-border,#e7e5e4)] pt-3";
const shapeNames = { SQUARE: "Cuadrada", RECTANGLE: "Rectangular", CIRCLE: "Redonda" };

export function FloorSelectionEditor(props: FloorSelectionEditorProps) {
  return <SelectionForm key={props.tables.map((table) => table.id).join("|")} {...props} />;
}

function SelectionForm({ tables, busy, disabled = false, error, onApply, onCancel, inventoryEditable = true, positionsEditable = true, initialTab = "layout" }: FloorSelectionEditorProps) {
  const tabId = useId();
  const [mode, setMode] = useState<FloorSelectionEditorMode>(initialTab);
  const [fields, setFields] = useState<Fields>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const multiple = tables.length > 1;
  const first = tables[0];
  const common = <K extends keyof FloorTable,>(key: K): FloorTable[K] | undefined => first && tables.every((table) => table[key] === first[key]) ? first[key] : undefined;
  const change = (partial: Partial<Fields>) => { setFields((value) => ({ ...value, ...partial })); setValidationError(null); };
  const changeLabel = (id: string, label: string) => { setLabels((value) => ({ ...value, [id]: label })); setValidationError(null); };
  const numericValue = (key: NumericField) => fields[key] ?? (!multiple && first && key !== "translationX" && key !== "translationY" ? String(first[key]) : "");
  const numericPlaceholder = (key: "width" | "height" | "capacity") => common(key) === undefined ? "Valores diferentes" : `${common(key)} · sin cambiar`;
  const shape = fields.shape ?? common("shape");
  const showHeight = shape === "RECTANGLE" || (shape === undefined && tables.some((table) => table.shape === "RECTANGLE"));
  const editable = mode === "inventory" ? inventoryEditable : positionsEditable;
  const switchMode = (next: FloorSelectionEditorMode) => {
    if (busy || next === mode) return;
    setMode(next); setFields({}); setLabels({}); setValidationError(null);
  };

  const submit = () => {
    if (busy || disabled || !editable) return;
    const changes: FloorSelectionChanges = {};
    const readNumber = (key: NumericField): number | undefined => {
      const raw = fields[key];
      if (raw === undefined || (multiple && raw.trim() === "")) return undefined;
      if (!raw.trim() || !Number.isFinite(Number(raw))) throw new Error("Completá los campos numéricos con valores válidos.");
      return Number(raw);
    };
    try {
      if (mode === "inventory" && inventoryEditable) {
        changes.labels = labels;
        changes.inventory = {};
        if (fields.shape !== undefined) changes.inventory.shape = fields.shape;
        if (fields.active !== undefined) changes.inventory.active = fields.active;
        for (const key of ["width", "height", "capacity"] as const) {
          if (key === "height" && !showHeight) continue;
          const value = readNumber(key);
          if (value !== undefined) changes.inventory[key] = value;
        }
      }
      if (mode === "layout" && positionsEditable) {
        if (multiple) changes.translation = { x: readNumber("translationX") ?? 0, y: readNumber("translationY") ?? 0, rotation: fields.rotation ?? 0 };
        else {
          changes.position = {};
          for (const key of ["x", "y"] as const) { const value = readNumber(key); if (value !== undefined) changes.position[key] = value; }
          if (fields.rotation !== undefined) changes.position.rotation = fields.rotation;
        }
      }
      const result = applyFloorSelectionChanges(tables, changes);
      if (!result.success) { setValidationError(result.error); return; }
      setValidationError(null); onApply(result.tables, mode);
    } catch (cause) { setValidationError(cause instanceof Error ? cause.message : "Revisá los datos e intentá de nuevo."); }
  };

  return <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <fieldset disabled={busy || disabled} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div role="tablist" aria-label="Tipo de cambio" className="flex shrink-0 gap-1 border-b border-[var(--floor-border,#e7e5e4)] px-4 pt-3">
        {([["layout", "Ubicación"], ["inventory", "Inventario"]] as const).map(([value, label]) => <button key={value} {...transientButtonProps} type="button" role="tab" id={`${tabId}-${value}-tab`} aria-controls={`${tabId}-${value}-panel`} aria-selected={mode === value} tabIndex={mode === value ? 0 : -1} disabled={busy} className={`min-h-11 border-b-2 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50 ${mode === value ? "border-[var(--floor-action,#182618)] text-[var(--floor-ink,#263e23)]" : "border-transparent text-[var(--floor-muted,#52634b)] hover:bg-[var(--floor-hover,#fafafa)]"}`} onClick={() => switchMode(value)} onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || busy) return;
          event.preventDefault();
          const next = event.key === "Home" ? "layout" : event.key === "End" ? "inventory" : mode === "layout" ? "inventory" : "layout";
          switchMode(next); document.getElementById(`${tabId}-${next}-tab`)?.focus();
        }}>{label}</button>)}
      </div>
      <div role="tabpanel" id={`${tabId}-${mode}-panel`} aria-labelledby={`${tabId}-${mode}-tab`} className={`${floorWindowBodyClass} min-w-0 [scrollbar-width:thin] [scrollbar-color:var(--floor-scrollbar,#c6cec0)_transparent]`}>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{multiple ? `Se aplicará a ${tables.length} mesas` : first ? `Mesa ${first.label}` : "Sin mesas seleccionadas"}</p>
          {multiple && <p className={`${mutedClass} break-words`}>{tables.slice(0, 8).map((table) => table.label).join(", ")}{tables.length > 8 ? ` y ${tables.length - 8} más` : ""}.</p>}
          {multiple && <p className={mutedClass}>Completá solo lo que querés cambiar. Los campos vacíos conservan el valor de cada mesa.</p>}
          <p className={mutedClass}>{mode === "layout" ? "Aplicar guarda la ubicación y el giro." : "Aplicar guarda las propiedades del inventario."} Cambiar de pestaña descarta los campos sin aplicar.</p>
        </div>

        {mode === "inventory" && (inventoryEditable && first ? <>
          {!multiple && <label className={labelClass}>Número o nombre<input required maxLength={40} className={`${floorInputClass} min-h-11`} value={labels[first.id] ?? first.label} onChange={(event) => changeLabel(first.id, event.target.value)} /></label>}
          <section aria-label="Propiedades de las mesas" className={sectionClass}>
            <label className={labelClass}>Forma<select className={`${floorInputClass} min-h-11`} value={fields.shape ?? (multiple ? "" : first.shape)} onChange={(event) => change({ shape: event.target.value ? event.target.value as FloorTableShape : undefined })}>
              {multiple && <option value="">Sin cambiar{common("shape") ? ` · ${shapeNames[common("shape")!]}` : " · valores diferentes"}</option>}
              {(["SQUARE", "RECTANGLE", "CIRCLE"] as const).map((value) => <option value={value} key={value}>{shapeNames[value]}</option>)}
            </select></label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label={shape === "CIRCLE" ? "Diámetro" : "Ancho"} value={numericValue("width")} placeholder={numericPlaceholder("width")} min={0} max={20000} required={!multiple} onChange={(width) => change({ width })} />
              {showHeight && <NumberField label={shape === undefined ? "Alto (rectangulares)" : "Alto"} value={numericValue("height")} placeholder={numericPlaceholder("height")} min={0} max={20000} required={!multiple} onChange={(height) => change({ height })} />}
            </div>
            {multiple && <p className={mutedClass}>En mesas cuadradas y redondas, el ancho también fija el alto.</p>}
            <label className={labelClass}>Disponible en el inventario<select className={`${floorInputClass} min-h-11`} value={fields.active === undefined ? multiple ? "" : String(first.active) : String(fields.active)} onChange={(event) => change({ active: event.target.value === "" ? undefined : event.target.value === "true" })}>
              {multiple && <option value="">Sin cambiar{common("active") === undefined ? " · valores diferentes" : common("active") ? " · Sí" : " · No"}</option>}
              <option value="true">Sí</option><option value="false">No</option>
            </select></label>
          </section>
          {multiple && <details className={sectionClass}><summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--floor-focus,#3d5934)]">Nombres de las {tables.length} mesas</summary><div className="space-y-3 pt-3">{tables.map((table) => <label className={labelClass} key={table.id}>Nombre de {table.label}<input required maxLength={40} className={`${floorInputClass} min-h-11`} value={labels[table.id] ?? table.label} onChange={(event) => changeLabel(table.id, event.target.value)} /></label>)}</div></details>}
          <details className={sectionClass}><summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--floor-focus,#3d5934)]">Opciones avanzadas</summary><div className="space-y-2 pt-3"><NumberField label="Capacidad para reservas" value={numericValue("capacity")} placeholder={numericPlaceholder("capacity")} min={1} max={500} step={1} required={!multiple} onChange={(capacity) => change({ capacity })} /><p className={mutedClass}>Se usa para validar reservas y armados.</p></div></details>
        </> : first && <p className={mutedClass}>Las propiedades del inventario se conservan. Un administrador puede cambiar nombres, formas y medidas.</p>)}

        {mode === "layout" && <section aria-label="Posición de la selección" className={sectionClass}>
          <h3 className="text-sm font-medium">{multiple ? "Mover o girar el grupo" : "Posición de la mesa"}</h3>
          {positionsEditable ? <>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label={multiple ? "Desplazar X" : "Centro X"} value={numericValue(multiple ? "translationX" : "x")} placeholder={multiple ? "0 · sin desplazar" : undefined} min={multiple ? -200000 : -100000} max={multiple ? 200000 : 100000} required={!multiple} onChange={(value) => change(multiple ? { translationX: value } : { x: value })} />
              <NumberField label={multiple ? "Desplazar Y" : "Centro Y"} value={numericValue(multiple ? "translationY" : "y")} placeholder={multiple ? "0 · sin desplazar" : undefined} min={multiple ? -200000 : -100000} max={multiple ? 200000 : 100000} required={!multiple} onChange={(value) => change(multiple ? { translationY: value } : { y: value })} />
            </div>
            <label className={labelClass}>{multiple ? "Girar alrededor del centro" : "Rotación"}<select className={`${floorInputClass} min-h-11`} value={fields.rotation ?? (multiple ? 0 : first?.rotation ?? 0)} onChange={(event) => change({ rotation: Number(event.target.value) as FloorRotation })}>{([0, 90, 180, 270] as const).map((rotation) => <option value={rotation} key={rotation}>{multiple && rotation === 0 ? "Sin girar" : `${rotation}°`}</option>)}</select></label>
            {multiple && <p className={mutedClass}>El giro conserva las distancias entre mesas. El desplazamiento se aplica después del giro.</p>}
          </> : <p className={mutedClass}>Esta selección conserva su posición y giro. Para acomodarla, abrí el armado correspondiente en el plano.</p>}
        </section>}
      </div>
    </fieldset>
      <footer className={`${floorWindowFooterClass} space-y-2`}>
        {(validationError || error) && <p role="alert" className="text-xs leading-relaxed text-red-800">{validationError || error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><button {...transientButtonProps} type="button" disabled={busy} className={`${floorSecondaryButtonClass} min-h-11 px-3 text-xs`} onClick={() => { if (!busy) onCancel(); }}>Cancelar</button><button {...transientButtonProps} type="submit" disabled={busy || disabled || !tables.length || !editable} className={`${floorPrimaryButtonClass} min-h-11 px-3 text-xs`}>{busy ? <><Loader2 size={14} className="animate-spin" />Guardando…</> : "Aplicar cambios"}</button></div>
      </footer>
  </form>;
}

function NumberField({ label, value, placeholder, min, max, step = "any", required, onChange }: { label: string; value: string; placeholder?: string; min: number; max: number; step?: string | number; required: boolean; onChange: (value: string) => void }) {
  return <label className={labelClass}>{label}<input type="number" required={required} value={value} placeholder={placeholder} min={min} max={max} step={step} className={`${floorInputClass} min-h-11 px-2 placeholder:text-[var(--floor-muted,#52634b)]`} onChange={(event) => onChange(event.target.value)} /></label>;
}
