"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, Circle, Loader2, Pencil, Plus, RectangleHorizontal, Square, Users } from "lucide-react";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass } from "./floor-ui";
import { transientButtonProps } from "@/ui/button-state";
import type { FloorCombination, FloorConfigView, FloorFixture, FloorLocation, FloorRoom, FloorRotation, FloorTable } from "../contracts";
import { floorInputClass } from "./floor-api";
import { combinationPoses } from "./floor-inventory";
import { groupInventoryTables, selectTableGroupQuantity, type FloorTableGroup } from "./floor-table-groups";
import { capacityAfterLayout, defaultLayoutCapacity } from "./floor-table-layout";

const copy = <T,>(value: T): T => structuredClone(value);
const formClass = "flex min-h-0 min-w-0 flex-1 flex-col";
const bodyClass = "min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:thin] [scrollbar-color:var(--floor-scrollbar,#c6cec0)_transparent]";
const footerClass = "shrink-0 space-y-2 border-t border-stone-200 bg-white px-4 py-3";
const summaryClass = "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[var(--floor-muted,#46543e)]";
const quietAction = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50";
export type StockInput = { quantity: number; shape: FloorTable["shape"]; capacity: number; width: number; height: number };
export type StockGroupInput = { quantity: number; shape: FloorTable["shape"]; width: number; height: number };

export function FloorTextField({ label, value, onChange, maxLength = 100 }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">{label}<input required maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={`${floorInputClass} min-h-11`} /></label>;
}
export function FloorNumberField({ label, value, onChange, min, max, step = "any" }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number | "any" }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">{label}<input required type="number" step={step} min={min} max={max} value={value} onChange={(event) => { const number = Number(event.target.value); if (Number.isFinite(number)) onChange(number); }} className={`${floorInputClass} min-h-11`} /></label>;
}
function RotationField({ value, onChange }: { value: FloorRotation; onChange: (value: FloorRotation) => void }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Rotación<select className={`${floorInputClass} min-h-11 px-2`} value={value} onChange={(event) => onChange(Number(event.target.value) as FloorRotation)}>{[0, 90, 180, 270].map((rotation) => <option key={rotation} value={rotation}>{rotation}°</option>)}</select></label>;
}
function FormError({ message }: { message: string | null }) { return message ? <p role="alert" className="text-sm leading-relaxed text-red-800">{message}</p> : null; }
function Actions({ label, onCancel, error, disabled }: { label: string; onCancel: () => void; error?: string | null; disabled?: boolean }) {
  return <footer className={footerClass}><FormError message={error ?? null} /><div className="flex flex-wrap justify-end gap-2"><button {...transientButtonProps} type="button" onClick={onCancel} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>Cancelar</button><button {...transientButtonProps} type="submit" disabled={disabled} className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`}>{label}</button></div></footer>;
}

export function RoomDimensionsForm({ room, saved, busy, onApply, onArchive, onCancel }: { room: FloorRoom; saved: boolean; busy: boolean; onApply: (fields: Pick<FloorRoom, "name" | "width" | "height" | "active">) => string | null; onArchive: () => void; onCancel: () => void }) {
  const [fields, setFields] = useState({ name: room.name, width: room.width, height: room.height, active: room.active });
  const [error, setError] = useState<string | null>(null);
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
    <div className={bodyClass}>
      <FloorTextField label="Nombre del salón" value={fields.name} onChange={(name) => setFields((value) => ({ ...value, name }))} />
      <div className="grid grid-cols-2 gap-3"><FloorNumberField label="Ancho del plano" value={fields.width} min={100} max={20000} onChange={(width) => setFields((value) => ({ ...value, width }))} /><FloorNumberField label="Alto del plano" value={fields.height} min={100} max={20000} onChange={(height) => setFields((value) => ({ ...value, height }))} /></div>
      <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Estas medidas definen el espacio de trabajo. Los sectores y elementos deben quedar dentro de sus límites.</p>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Salón activo</label>
      {saved && room.active && <button {...transientButtonProps} type="button" disabled={busy} className="min-h-11 text-xs font-semibold text-red-700 underline underline-offset-4 disabled:opacity-50" onClick={onArchive}>Archivar salón</button>}
    </div>
    <Actions label="Aplicar medidas" onCancel={onCancel} error={error} />
  </form>;
}

export function InventoryForm({ room, onAdd, onEditGroup, onEditTable, onEditCombination, onCreateCombination, onClose }: { room: FloorRoom; onAdd: (stock: StockInput) => string | null; onEditGroup: (key: string) => void; onEditTable: (id: string) => void; onEditCombination: (id: string) => void; onCreateCombination: (ids: string[]) => void; onClose?: () => void }) {
  const [stock, setStock] = useState<StockInput>({ quantity: 1, shape: "SQUARE", capacity: 4, width: 80, height: 80 });
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const groups = groupInventoryTables(room.tables);
  const activeIds = new Set(room.tables.filter((table) => table.active).map((table) => table.id));
  const selectedIds = selected.filter((id) => activeIds.has(id));
  const chooseQuantity = (group: FloorTableGroup, quantity: number) => {
    const next = selectTableGroupQuantity(group, selectedIds, quantity);
    if (!next) { setError("Ingresá una cantidad entera que no supere las mesas activas de ese tipo."); return; }
    if (next.length > 40) { setError("Un armado puede incluir hasta 40 mesas. Reducí la cantidad seleccionada."); return; }
    setSelected(next); setError(null);
  };
  return <div className={formClass}>
   <div className={bodyClass}>
    <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Cargá la cantidad de mesas de cada forma y medida. Se ubican al confirmar reservas o al recibir grupos.</p>
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setError(onAdd(stock)); }}>
      <div className="grid grid-cols-2 gap-3">
        <FloorNumberField label="Cantidad a agregar" value={stock.quantity} min={1} max={200 - room.tables.length} step={1} onChange={(quantity) => setStock((value) => ({ ...value, quantity }))} />
        <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Forma<select className={`${floorInputClass} min-h-11`} value={stock.shape} onChange={(event) => setStock((value) => ({ ...value, shape: event.target.value as FloorTable["shape"], ...(event.target.value !== "RECTANGLE" ? { height: value.width } : {}) }))}><option value="SQUARE">Cuadrada</option><option value="RECTANGLE">Rectangular</option><option value="CIRCLE">Redonda</option></select></label>
        <FloorNumberField label="Ancho de mesa" value={stock.width} min={1} max={20000} onChange={(width) => setStock((value) => ({ ...value, width, ...(value.shape !== "RECTANGLE" ? { height: width } : {}) }))} />
        {stock.shape === "RECTANGLE" && <FloorNumberField label="Alto de mesa" value={stock.height} min={1} max={20000} onChange={(height) => setStock((value) => ({ ...value, height }))} />}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <details className="group min-w-40 flex-1"><summary className={`${summaryClass} whitespace-nowrap`}>Capacidad para reservas<ChevronDown size={14} className="shrink-0 group-open:rotate-180" /></summary><div className="max-w-xs pb-2"><FloorNumberField label="Lugares por mesa" value={stock.capacity} min={1} max={500} step={1} onChange={(capacity) => setStock((value) => ({ ...value, capacity }))} /></div></details>
        <button {...transientButtonProps} type="submit" disabled={room.tables.length >= 200} className={`${adminSecondaryButtonClass} ml-auto min-h-11 px-3 text-xs`}><Plus size={14} />Agregar al inventario</button>
      </div>
      <FormError message={error} />
    </form>
    <section className="space-y-2 border-t border-stone-200 pt-3">
      <h3 className="text-sm font-semibold">Inventario de mesas · {activeIds.size}</h3>
      <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Para crear un armado, elegí cuántas mesas usar de cada tipo.</p>
      {groups.length ? groups.map((group) => {
        const active = group.tables.filter((table) => table.active).length;
        const count = group.tables.filter((table) => selectedIds.includes(table.id)).length;
        const Shape = group.shape === "CIRCLE" ? Circle : group.shape === "RECTANGLE" ? RectangleHorizontal : Square;
        return <div key={group.key} role="group" aria-label={`Tipo de mesa ${group.label}`} className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.75rem] items-center gap-2 border-b border-stone-100 py-2">
          <div className="flex min-w-0 items-center gap-2"><Shape size={21} strokeWidth={1.5} className="shrink-0 text-[var(--floor-muted,#607054)]" /><div className="min-w-0"><p title={group.label} className="truncate text-xs font-semibold text-[var(--floor-ink,#263e23)]">{group.label}</p><p className="mt-1 text-[11px] text-[var(--floor-muted,#52634b)]">{active} activas · {group.tables.length} en total</p></div></div>
          <label className="grid min-w-0 gap-1 text-[11px] font-medium text-[var(--floor-muted,#46543e)]"><span>Para armado</span><input type="number" aria-label={`Cantidad para armado · ${group.label}`} min={0} max={Math.min(active, Math.max(0, 40 - selectedIds.length + count))} step={1} disabled={!active} value={count} onChange={(event) => chooseQuantity(group, Number(event.target.value))} className={`${floorInputClass} min-h-11 px-2 text-center tabular-nums`} /></label>
          <button {...transientButtonProps} type="button" aria-label={`Editar tipo ${group.label}`} title="Editar tipo" onClick={() => onEditGroup(group.key)} className={`${quietAction} h-11 w-11 px-0`}><Pencil size={15} /></button>
        </div>;
      }) : <p className="text-sm text-[var(--floor-muted,#52634b)]">Todavía no cargaste mesas.</p>}
      <div className="flex flex-wrap items-center gap-2"><button {...transientButtonProps} type="button" disabled={selectedIds.length < 2} onClick={() => onCreateCombination(selectedIds)} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}><Users size={14} />Crear armado predefinido</button>{selectedIds.length > 0 && <p className="text-xs text-[var(--floor-muted,#52634b)]">{selectedIds.length} mesas seleccionadas</p>}</div>
      {room.tables.length > 0 && <details className="group text-xs text-[var(--floor-muted,#52634b)]"><summary className={summaryClass}>Mesas individuales<ChevronDown size={14} className="shrink-0 group-open:rotate-180" /></summary><p className="mb-2 text-xs leading-relaxed">Usá los detalles para cambiar el nombre o las propiedades de una mesa en particular.</p>{groups.map((group) => <section key={group.key} className="border-t border-stone-100 py-2"><h4 className="text-xs font-semibold">{group.label}</h4><div className="grid grid-cols-2 gap-x-3">{group.tables.map((table) => <div key={table.id} className="flex min-h-11 min-w-0 items-center justify-between gap-1"><span title={table.label} className="min-w-0 truncate">{table.label}{!table.active && " · Inactiva"}</span><button {...transientButtonProps} type="button" aria-label={`Editar mesa ${table.label}`} onClick={() => onEditTable(table.id)} className={`${quietAction} shrink-0 px-1`}>Editar</button></div>)}</div></section>)}</details>}
    </section>
    <section className="space-y-2 border-t border-stone-200 pt-3"><h3 className="text-sm font-semibold">Armados predefinidos</h3><p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Opcionales. Sus mesas se acomodan sobre este mismo tablero.</p>{room.combinations.map((combination) => <button key={combination.id} {...transientButtonProps} type="button" aria-label={`Editar armado ${combination.name}`} onClick={() => onEditCombination(combination.id)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-[var(--floor-hover,#edf2e9)]"><span className="min-w-0 break-words">{combination.name}{!combination.active && " · Inactivo"}</span><span className="shrink-0 font-semibold">Editar</span></button>)}</section>
   </div>
    {onClose && <footer className={footerClass}><div className="flex justify-end"><button {...transientButtonProps} type="button" className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`} onClick={onClose}>Volver al plano</button></div></footer>}
  </div>;
}

export function InventoryGroupForm({ group, onApply, onCancel }: { group: FloorTableGroup; onApply: (fields: StockGroupInput) => string | null; onCancel: () => void }) {
  const [fields, setFields] = useState<StockGroupInput>({ quantity: group.tables.filter((table) => table.active).length, shape: group.shape, width: group.width, height: group.height });
  const [error, setError] = useState<string | null>(null);
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
   <div className={bodyClass}>
    <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Actualizá la cantidad y las medidas de este tipo de mesa. Reducir la cantidad desactiva mesas y conserva su historial.</p>
    <FloorNumberField label="Cantidad de mesas" value={fields.quantity} min={0} max={200} step={1} onChange={(quantity) => setFields((value) => ({ ...value, quantity }))} />
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Forma<select className={`${floorInputClass} min-h-11`} value={fields.shape} onChange={(event) => setFields((value) => ({ ...value, shape: event.target.value as FloorTable["shape"], ...(event.target.value !== "RECTANGLE" ? { height: value.width } : {}) }))}><option value="SQUARE">Cuadrada</option><option value="RECTANGLE">Rectangular</option><option value="CIRCLE">Redonda</option></select></label>
    <div className="grid grid-cols-2 gap-3"><FloorNumberField label="Ancho" value={fields.width} min={1} max={20000} onChange={(width) => setFields((value) => ({ ...value, width, ...(value.shape !== "RECTANGLE" ? { height: width } : {}) }))} />{fields.shape === "RECTANGLE" && <FloorNumberField label="Alto" value={fields.height} min={1} max={20000} onChange={(height) => setFields((value) => ({ ...value, height }))} />}</div>
    <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Las reservas futuras se comprueban al guardar el plano.</p>
   </div>
    <Actions label="Aplicar tipo" onCancel={onCancel} error={error} />
  </form>;
}

export function TablePropertiesForm({ table, onApply, onCancel }: { table: FloorTable; onApply: (table: FloorTable) => string | null; onCancel: () => void }) {
  const [fields, setFields] = useState(() => copy(table));
  const [error, setError] = useState<string | null>(null);
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
    <div className={bodyClass}>
      <FloorTextField label="Número o nombre" value={fields.label} maxLength={40} onChange={(label) => setFields((value) => ({ ...value, label }))} />
      <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Forma<select className={`${floorInputClass} min-h-11`} value={fields.shape} onChange={(event) => setFields((value) => ({ ...value, shape: event.target.value as FloorTable["shape"], ...(event.target.value !== "RECTANGLE" ? { height: value.width } : {}) }))}><option value="SQUARE">Cuadrada</option><option value="RECTANGLE">Rectangular</option><option value="CIRCLE">Redonda</option></select></label>
      <div className="grid grid-cols-2 gap-3"><FloorNumberField label="Ancho" value={fields.width} min={1} max={20000} onChange={(width) => setFields((value) => ({ ...value, width, ...(value.shape !== "RECTANGLE" ? { height: width } : {}) }))} /><FloorNumberField label="Alto" value={fields.height} min={1} max={20000} onChange={(height) => setFields((value) => ({ ...value, height, ...(value.shape !== "RECTANGLE" ? { width: height } : {}) }))} /></div>
      <details className="group"><summary className={summaryClass}>Capacidad para reservas<ChevronDown size={14} className="shrink-0 group-open:rotate-180" /></summary><div className="max-w-40 pb-2"><FloorNumberField label="Capacidad" value={fields.capacity} min={1} max={500} onChange={(capacity) => setFields((value) => ({ ...value, capacity }))} /></div></details>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Mesa activa</label>
      <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Las mesas comprometidas por reservas futuras conservan su capacidad y tamaño. Se comprueba al guardar el plano.</p>
    </div>
    <Actions label="Aplicar mesa" onCancel={onCancel} error={error} />
  </form>;
}

export function SpatialPropertiesForm({ entity, kind, onApply, onCancel }: { entity: FloorLocation | FloorFixture; kind: "sector" | "fixture"; onApply: (entity: FloorLocation | FloorFixture) => string | null; onCancel: () => void }) {
  const [fields, setFields] = useState(() => copy(entity));
  const [error, setError] = useState<string | null>(null);
  const sector = kind === "sector";
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
    <div className={bodyClass}>
      {"name" in fields ? <FloorTextField label="Nombre del sector" value={fields.name} onChange={(name) => setFields((value) => ({ ...value, name }))} /> : <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Texto<input maxLength={100} value={fields.label} onChange={(event) => setFields((value) => ({ ...value, label: event.target.value }))} className={`${floorInputClass} min-h-11`} /></label>}
      <div className="grid grid-cols-2 gap-3"><FloorNumberField label={sector ? "Ancho del sector" : "Ancho"} value={fields.width} min={1} max={20000} onChange={(width) => setFields((value) => ({ ...value, width }))} /><FloorNumberField label={sector ? "Alto del sector" : "Alto"} value={fields.height} min={1} max={20000} onChange={(height) => setFields((value) => ({ ...value, height }))} /><FloorNumberField label="Centro X" value={fields.x} onChange={(x) => setFields((value) => ({ ...value, x }))} /><FloorNumberField label="Centro Y" value={fields.y} onChange={(y) => setFields((value) => ({ ...value, y }))} /></div>
      <RotationField value={fields.rotation} onChange={(rotation) => setFields((value) => ({ ...value, rotation }))} />
      {"active" in fields && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Sector activo</label>}
      {sector && <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Para ajustar el tamaño con el cursor, aplicá los datos y arrastrá los bordes o las esquinas del sector en el plano.</p>}
    </div>
    <Actions label={sector ? "Aplicar sector" : "Aplicar elemento"} onCancel={onCancel} error={error} />
  </form>;
}

export function CombinationPropertiesForm({ combination, room, onApply, onCancel }: { combination: FloorCombination; room: FloorRoom; onApply: (combination: FloorCombination) => string | null; onCancel: () => void }) {
  const [fields, setFields] = useState(() => copy(combination));
  const [error, setError] = useState<string | null>(null);
  const maximum = defaultLayoutCapacity(combinationPoses(room.tables, fields.members));
  const capacity = Math.min(fields.capacity, maximum);
  const updateMember = (tableId: string, change: Partial<Omit<FloorCombination["members"][number], "tableId">>) => {
    setFields((value) => {
      const members = value.members.map((member) => member.tableId === tableId ? { ...member, ...change } : member);
      const capacity = capacityAfterLayout(value.capacity, combinationPoses(room.tables, value.members), combinationPoses(room.tables, members));
      return { ...value, members, capacity };
    });
  };
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); if (capacity > 0) setError(onApply({ ...fields, capacity })); }}>
    <div className={bodyClass}>
      <FloorTextField label="Nombre del armado" value={fields.name} maxLength={80} onChange={(name) => setFields((value) => ({ ...value, name }))} />
      <div className="space-y-1">
        <p role="status" className={`text-xs leading-relaxed ${maximum > 0 ? "text-[var(--floor-muted,#52634b)]" : "text-red-800"}`}>Máximo del armado {maximum} {maximum === 1 ? "lugar útil" : "lugares útiles"}.{maximum === 0 && " Mové las mesas para liberar lugares."}</p>
        {maximum > 0 && <FloorNumberField label="Lugares útiles al unir" value={capacity} min={1} max={maximum} step={1} onChange={(capacity) => {
          if (Number.isInteger(capacity) && capacity >= 1 && capacity <= maximum) setFields((value) => ({ ...value, capacity }));
        }} />}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Disponible para nuevas reservas</label>
      <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Las posiciones son relativas al centro del armado. Las mesas deben quedar unidas por sus bordes.</p>
      {fields.members.map((member) => {
        const label = room.tables.find((table) => table.id === member.tableId)?.label;
        return <fieldset key={member.tableId} className="min-w-0 border-t border-stone-200 pt-2">
          <legend className="max-w-full break-words pr-2 text-xs font-semibold">Mesa {label}</legend>
          <div className="grid grid-cols-3 gap-2">
            <FloorNumberField label={`X relativa ${label}`} value={member.x} onChange={(x) => updateMember(member.tableId, { x })} />
            <FloorNumberField label={`Y relativa ${label}`} value={member.y} onChange={(y) => updateMember(member.tableId, { y })} />
            <RotationField value={member.rotation} onChange={(rotation) => updateMember(member.tableId, { rotation })} />
          </div>
        </fieldset>;
      })}
    </div>
    <Actions label="Aplicar propiedades" onCancel={onCancel} error={error} disabled={capacity <= 0} />
  </form>;
}

export function FloorSettingsForm({ config, dirty, busy, onAction, onDisableStaff }: { config: FloorConfigView; dirty: boolean; busy: boolean; onAction: (body: unknown, message: string) => Promise<boolean>; onDisableStaff: () => void }) {
  const [timeZone, setTimeZone] = useState(config.timeZone);
  const [staff, setStaff] = useState({ email: config.staffAccount?.email ?? "", password: "" });
  const disabled = dirty || busy;
  const submitStaff = async (event: FormEvent) => { event.preventDefault(); if (await onAction({ action: "staff", ...staff }, "Cuenta de sala actualizada.")) setStaff((value) => ({ ...value, password: "" })); };
  const configured = config.rooms.some((room) => room.active && room.tables.some((table) => table.active) && room.locations.some((location) => location.active));
  return <fieldset disabled={busy} className={formClass}>
    <div className={bodyClass}>
      {dirty && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Guardá el plano antes de cambiar el funcionamiento o el acceso del personal.</p>}
      <section className="space-y-3"><h3 className="text-sm font-semibold">Asignación de mesas {config.enabled ? "activada" : "sin activar"}</h3><p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Necesitás inventario, sectores y resolver las reservas confirmadas futuras. Las confirmaciones y visitas se validan al guardar.</p>{config.compatibility.reason && <p className="text-xs leading-relaxed text-amber-900">{config.compatibility.reason}</p>}{!config.enabled && <button {...transientButtonProps} type="button" disabled={disabled || !configured || config.compatibility.status !== "compatible"} className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`} onClick={() => void onAction({ action: "activate" }, "Asignación de mesas activada.")}>Activar asignación</button>}</section>
      <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(event) => { event.preventDefault(); void onAction({ action: "settings", timeZone }, "Zona horaria guardada."); }}><h3 className="text-sm font-semibold">Zona horaria del restaurante</h3><FloorTextField label="Zona IANA" value={timeZone} onChange={setTimeZone} /><button {...transientButtonProps} type="submit" disabled={disabled} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>Guardar zona horaria</button></form>
      <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(event) => { void submitStaff(event); }}><h3 className="text-sm font-semibold">Cuenta compartida de sala</h3><p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Puede consultar reservas y atender visitas sin reserva. Restablecer la contraseña cierra sus sesiones.</p><label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Correo<input required type="email" value={staff.email} autoComplete="off" className={`${floorInputClass} min-h-11`} onChange={(event) => setStaff((value) => ({ ...value, email: event.target.value }))} /></label><label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Nueva contraseña<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={staff.password} className={`${floorInputClass} min-h-11`} onChange={(event) => setStaff((value) => ({ ...value, password: event.target.value }))} /></label><div className="flex flex-wrap items-center gap-2"><button {...transientButtonProps} type="submit" disabled={disabled} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>{busy && <Loader2 size={15} className="animate-spin" />}{config.staffAccount ? "Actualizar acceso" : "Crear acceso"}</button>{config.staffAccount && <button {...transientButtonProps} type="button" disabled={disabled} onClick={onDisableStaff} className="min-h-11 text-xs font-semibold text-red-700 underline underline-offset-4 disabled:opacity-50">Desactivar cuenta</button>}</div></form>
    </div>
  </fieldset>;
}
