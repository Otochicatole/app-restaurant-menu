"use client";

import { useState, type FormEvent } from "react";
import { Circle, Loader2, MapPin, Pencil, Plus, RectangleHorizontal, Square, Trash2 } from "lucide-react";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass } from "./floor-ui";
import { transientButtonProps } from "@/ui/button-state";
import type { FloorConfigView, FloorFixture, FloorLocation, FloorRoom, FloorRotation, FloorTable } from "../contracts";
import { floorInputClass } from "./floor-api";

const copy = <T,>(value: T): T => structuredClone(value);
const formClass = "flex min-h-0 min-w-0 flex-1 flex-col";
const bodyClass = "min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin] [scrollbar-color:var(--floor-scrollbar,#c6cec0)_transparent]";
const footerClass = "shrink-0 space-y-2 border-t border-stone-200 bg-white px-4 py-3";
const quietAction = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50";

export type FixedTablePreset = { shape: FloorTable["shape"]; capacity: number; width: number; height: number };

export function FloorTextField({ label, value, onChange, maxLength = 100 }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">{label}<input required maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={`${floorInputClass} min-h-10`} /></label>;
}

export function FloorNumberField({ label, value, onChange, min, max, step = "any" }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number | "any" }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">{label}<input required type="number" step={step} min={min} max={max} value={value} onChange={(event) => { const number = Number(event.target.value); if (Number.isFinite(number)) onChange(number); }} className={`${floorInputClass} min-h-10 tabular-nums`} /></label>;
}

function OptionalPositiveIntField({ label, placeholder, value, max, onChange }: { label: string; placeholder: string; value?: number; max: number; onChange: (value: number | undefined) => void }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">
      {label}
      <input
        type="number"
        min={1}
        max={max}
        step={1}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          const parsed = Number(raw);
          if (Number.isInteger(parsed) && parsed >= 1 && parsed <= max) onChange(parsed);
        }}
        className={`${floorInputClass} min-h-10 tabular-nums`}
      />
    </label>
  );
}

function RotationField({ value, onChange }: { value: FloorRotation; onChange: (value: FloorRotation) => void }) {
  return <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Rotación<select className={`${floorInputClass} min-h-10 px-2`} value={value} onChange={(event) => onChange(Number(event.target.value) as FloorRotation)}>{[0, 90, 180, 270].map((rotation) => <option key={rotation} value={rotation}>{rotation}°</option>)}</select></label>;
}

function FormError({ message }: { message: string | null }) { return message ? <p role="alert" className="text-sm leading-relaxed text-red-800">{message}</p> : null; }

function Actions({ label, onCancel, error, disabled, embedded = false }: { label: string; onCancel?: () => void; error?: string | null; disabled?: boolean; embedded?: boolean }) {
  return <footer className={embedded ? "space-y-2 border-t border-stone-200 pt-3" : footerClass}><FormError message={error ?? null} /><div className="flex flex-wrap justify-end gap-2">{onCancel && <button {...transientButtonProps} type="button" onClick={onCancel} className={`${adminSecondaryButtonClass} min-h-10 px-3 text-xs`}>Cancelar</button>}<button {...transientButtonProps} type="submit" disabled={disabled} className={`${adminPrimaryButtonClass} min-h-10 px-3 text-xs`}>{label}</button></div></footer>;
}

export function RoomDimensionsForm({ room, saved, busy, embedded = false, onApply, onArchive, onDelete, onCancel }: { room: FloorRoom; saved: boolean; busy: boolean; embedded?: boolean; onApply: (fields: Pick<FloorRoom, "name" | "width" | "height" | "active">) => string | null; onArchive: () => void; onDelete: () => void; onCancel?: () => void }) {
  const [fields, setFields] = useState({ name: room.name, width: room.width, height: room.height, active: room.active });
  const [error, setError] = useState<string | null>(null);
  return <form className={embedded ? "space-y-4" : formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
    <div className={embedded ? "space-y-4" : bodyClass}>
      <FloorTextField label="Nombre del salón" value={fields.name} onChange={(name) => setFields((value) => ({ ...value, name }))} />
      
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-[#182618]">Medidas predeterminadas</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Medidas predeterminadas">
          {[
            { label: "2000 × 2000 px", w: 2000, h: 2000, tag: "Estándar" },
            { label: "2400 × 1600 px", w: 2400, h: 1600, tag: "Amplio" },
            { label: "1500 × 1500 px", w: 1500, h: 1500, tag: "Compacto" },
          ].map((preset) => {
            const active = fields.width === preset.w && fields.height === preset.h;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setFields((value) => ({ ...value, width: preset.w, height: preset.h }))}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? "border-[#182618] bg-[#182618] text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>{preset.label}</span>
                <span className={`text-[10px] ${active ? "text-stone-300" : "text-stone-500"}`}>({preset.tag})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3"><FloorNumberField label="Ancho del plano" value={fields.width} min={100} max={20000} onChange={(width) => setFields((value) => ({ ...value, width }))} /><FloorNumberField label="Alto del plano" value={fields.height} min={100} max={20000} onChange={(height) => setFields((value) => ({ ...value, height }))} /></div>
      <p className="text-xs leading-relaxed text-[#52634b]">Estas medidas definen el espacio de trabajo. Los sectores, mesas fijas y elementos deben quedar dentro de sus límites.</p>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#3d5934]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Salón activo</label>
      <div className="flex flex-wrap items-center gap-4 pt-1">
        {saved && room.active && <button {...transientButtonProps} type="button" disabled={busy} className="min-h-10 text-xs font-semibold text-amber-800 underline underline-offset-4 disabled:opacity-50" onClick={onArchive}>Archivar salón</button>}
        <button {...transientButtonProps} type="button" disabled={busy} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-red-700 underline underline-offset-4 disabled:opacity-50" onClick={onDelete}>
          <Trash2 size={14} aria-hidden="true" />
          {saved ? "Eliminar salón" : "Descartar salón"}
        </button>
      </div>
    </div>
    <Actions label="Aplicar medidas" onCancel={onCancel} error={error} embedded={embedded} />
  </form>;
}

export function RoomTablesPanel({
  room,
  onAddTableInSector,
  onAssignUnlocatedTable,
  onEditTable,
  onEditSector,
  onClose,
}: {
  room: FloorRoom;
  onAddTableInSector: (locationId: string, preset: FixedTablePreset) => string | null;
  onAssignUnlocatedTable: (tableId: string, locationId: string) => string | null;
  onEditTable: (id: string) => void;
  onEditSector: (location: FloorLocation) => void;
  onClose?: () => void;
}) {
  const [preset, setPreset] = useState<FixedTablePreset>({ shape: "SQUARE", capacity: 4, width: 80, height: 80 });
  const [error, setError] = useState<string | null>(null);
  const activeSectors = room.locations.filter((location) => location.active);
  const [targetSectorByTable, setTargetSectorByTable] = useState<Record<string, string>>({});
  const unlocatedTables = room.tables.filter((table) => !table.locationId);

  return (
    <div className={formClass}>
      <div className={bodyClass}>
        <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">
          Dibujá y ubicá mesas fijas dentro de cada sector. En la sala de servicio ya aparecen listas en su ubicación exacta.
        </p>

        <section aria-label="Configuración rápida de nueva mesa" className="space-y-2 rounded-xl border border-stone-200 bg-[#f8faf7] p-3">
          <p className="text-xs font-semibold text-[#263e23]">Formato al agregar mesa</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">
              Forma
              <select
                className={`${floorInputClass} min-h-10`}
                value={preset.shape}
                onChange={(event) => {
                  const shape = event.target.value as FloorTable["shape"];
                  setPreset((value) => ({ ...value, shape, height: shape === "RECTANGLE" ? value.height : value.width }));
                }}
              >
                <option value="SQUARE">Cuadrada</option>
                <option value="RECTANGLE">Rectangular</option>
                <option value="CIRCLE">Redonda</option>
              </select>
            </label>
            <FloorNumberField label="Capacidad base" value={preset.capacity} min={1} max={100} step={1} onChange={(capacity) => setPreset((value) => ({ ...value, capacity }))} />
            <FloorNumberField label="Ancho" value={preset.width} min={20} max={2000} onChange={(width) => setPreset((value) => ({ ...value, width, height: value.shape === "RECTANGLE" ? value.height : width }))} />
            {preset.shape === "RECTANGLE" && (
              <FloorNumberField label="Alto" value={preset.height} min={20} max={2000} onChange={(height) => setPreset((value) => ({ ...value, height }))} />
            )}
          </div>
        </section>

        <FormError message={error} />

        {!activeSectors.length ? (
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
            Creá al menos un sector activo en el salón para agregar mesas fijas dentro de él.
          </p>
        ) : (
          <div className="space-y-3">
            {activeSectors.map((sector) => {
              const sectorTables = room.tables.filter((table) => table.active && table.locationId === sector.id);
              const inactiveSectorTables = room.tables.filter((table) => !table.active && table.locationId === sector.id);
              const atTableLimit = sector.maxTables != null && sectorTables.length >= sector.maxTables;
              const quotaSummary = [
                sector.maxTables != null ? `${sectorTables.length}/${sector.maxTables} mesas` : `${sectorTables.length} mesas`,
                sector.maxCapacity != null ? `Cupo ${sector.maxCapacity}p` : null,
              ].filter(Boolean).join(" · ");

              return (
                <section key={sector.id} className="space-y-2 rounded-xl border border-stone-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        {...transientButtonProps}
                        type="button"
                        onClick={() => onEditSector(sector)}
                        className="flex items-center gap-1.5 text-left text-sm font-semibold text-[#263e23] hover:underline"
                      >
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{sector.name}</span>
                      </button>
                      <p className={`text-xs ${atTableLimit ? "font-semibold text-amber-800" : "text-[var(--floor-muted,#52634b)]"}`}>
                        {quotaSummary}
                      </p>
                    </div>
                    <button
                      {...transientButtonProps}
                      type="button"
                      disabled={atTableLimit || room.tables.length >= 200}
                      onClick={() => setError(onAddTableInSector(sector.id, preset))}
                      className={`${adminSecondaryButtonClass} min-h-9 px-2.5 text-xs`}
                    >
                      <Plus size={14} /> Agregar mesa
                    </button>
                  </div>

                  {sectorTables.length === 0 ? (
                    <p className="text-xs text-[var(--floor-muted,#52634b)]">Sin mesas ubicadas en este sector.</p>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {sectorTables.map((table) => {
                        const Shape = table.shape === "CIRCLE" ? Circle : table.shape === "RECTANGLE" ? RectangleHorizontal : Square;
                        return (
                          <li key={table.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                            <span className="flex min-w-0 items-center gap-2">
                              <Shape size={16} strokeWidth={1.6} className="shrink-0 text-[#52634b]" />
                              <span className="truncate font-semibold text-zinc-900">{table.label}</span>
                              <span className="text-[11px] text-zinc-500">({table.capacity}p)</span>
                            </span>
                            <button
                              {...transientButtonProps}
                              type="button"
                              aria-label={`Editar mesa ${table.label}`}
                              onClick={() => onEditTable(table.id)}
                              className={quietAction}
                            >
                              <Pencil size={13} /> Editar
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {inactiveSectorTables.length > 0 && (
                    <p className="text-[11px] text-zinc-500">
                      {inactiveSectorTables.length} archivada(s):{" "}
                      {inactiveSectorTables.map((table) => (
                        <button key={table.id} type="button" onClick={() => onEditTable(table.id)} className="mr-2 underline hover:text-zinc-900">
                          {table.label}
                        </button>
                      ))}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {unlocatedTables.length > 0 && (
          <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3">
            <h3 className="text-xs font-semibold text-amber-950">Mesas sin ubicar en sector ({unlocatedTables.length})</h3>
            <p className="text-[11px] leading-relaxed text-amber-900">
              Son mesas anteriores a los sectores fijos. Ubicalas en un sector para que aparezcan en el plano.
            </p>
            <div className="space-y-2">
              {unlocatedTables.map((table) => {
                const chosenSectorId = targetSectorByTable[table.id] ?? activeSectors[0]?.id ?? "";
                return (
                  <div key={table.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs">
                    <span className="font-semibold text-zinc-900">{table.label} ({table.capacity}p){!table.active && " · Inactiva"}</span>
                    <div className="flex items-center gap-1.5">
                      {activeSectors.length > 0 && (
                        <>
                          <select
                            aria-label={`Sector para ${table.label}`}
                            className={`${floorInputClass} min-h-9 px-2 text-xs`}
                            value={chosenSectorId}
                            onChange={(event) => setTargetSectorByTable((current) => ({ ...current, [table.id]: event.target.value }))}
                          >
                            {activeSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                          </select>
                          <button
                            {...transientButtonProps}
                            type="button"
                            onClick={() => setError(onAssignUnlocatedTable(table.id, chosenSectorId))}
                            className={`${adminSecondaryButtonClass} min-h-9 px-2.5 text-xs`}
                          >
                            Ubicar
                          </button>
                        </>
                      )}
                      <button
                        {...transientButtonProps}
                        type="button"
                        onClick={() => onEditTable(table.id)}
                        className={quietAction}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      {onClose && <footer className={footerClass}><div className="flex justify-end"><button {...transientButtonProps} type="button" className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`} onClick={onClose}>Volver al plano</button></div></footer>}
    </div>
  );
}

export function TablePropertiesForm({
  table,
  locations,
  onApply,
  onArchive,
  onCancel,
}: {
  table: FloorTable;
  locations: FloorLocation[];
  onApply: (table: FloorTable) => string | null;
  onArchive?: () => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState(() => copy(table));
  const [error, setError] = useState<string | null>(null);
  const activeSectors = locations.filter((location) => location.active);
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
    <div className={bodyClass}>
      <FloorTextField label="Número o nombre" value={fields.label} maxLength={40} onChange={(label) => setFields((value) => ({ ...value, label }))} />
      <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">
        Sector del salón
        <select
          className={`${floorInputClass} min-h-11`}
          value={fields.locationId ?? ""}
          onChange={(event) => setFields((value) => ({ ...value, locationId: event.target.value || undefined }))}
        >
          <option value="">Sin sector asignado</option>
          {activeSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
        </select>
      </label>
      <div className="space-y-1.5">
        <FloorNumberField label="Capacidad nominal de referencia (personas)" value={fields.capacity} min={1} max={100} step={1} onChange={(capacity) => setFields((value) => ({ ...value, capacity }))} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Comensales rápidos">
          {[2, 4, 6, 8, 10].map((count) => {
            const active = fields.capacity === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => setFields((value) => ({ ...value, capacity: count }))}
                className={`min-h-8 min-w-9 rounded-lg border px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-action,#155e75)] text-white shadow-xs"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {count}p
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2" role="group" aria-label="Forma rápida de la mesa">
          {[
            { shape: "SQUARE" as const, label: "Cuadrada", Icon: Square },
            { shape: "RECTANGLE" as const, label: "Rectangular", Icon: RectangleHorizontal },
            { shape: "CIRCLE" as const, label: "Redonda", Icon: Circle },
          ].map(({ shape, label, Icon }) => {
            const active = fields.shape === shape;
            return (
              <button
                key={shape}
                type="button"
                onClick={() => setFields((value) => ({
                  ...value,
                  shape,
                  ...(shape !== "RECTANGLE" ? { height: value.width } : {}),
                }))}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-action,#155e75)] text-white shadow-xs"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Forma<select className={`${floorInputClass} min-h-11`} value={fields.shape} onChange={(event) => setFields((value) => ({ ...value, shape: event.target.value as FloorTable["shape"], ...(event.target.value !== "RECTANGLE" ? { height: value.width } : {}) }))}><option value="SQUARE">Cuadrada</option><option value="RECTANGLE">Rectangular</option><option value="CIRCLE">Redonda</option></select></label>
      </div>
      <div className="grid grid-cols-2 gap-3"><FloorNumberField label="Ancho" value={fields.width} min={20} max={20000} onChange={(width) => setFields((value) => ({ ...value, width, ...(value.shape !== "RECTANGLE" ? { height: width } : {}) }))} /><FloorNumberField label="Alto" value={fields.height} min={20} max={20000} onChange={(height) => setFields((value) => ({ ...value, height, ...(value.shape !== "RECTANGLE" ? { width: height } : {}) }))} /></div>
      <div className="grid grid-cols-3 gap-2">
        <FloorNumberField label="Posición X" value={fields.x} onChange={(x) => setFields((value) => ({ ...value, x }))} />
        <FloorNumberField label="Posición Y" value={fields.y} onChange={(y) => setFields((value) => ({ ...value, y }))} />
        <RotationField value={fields.rotation} onChange={(rotation) => setFields((value) => ({ ...value, rotation }))} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Mesa activa</label>
      {onArchive && table.active && (
        <button {...transientButtonProps} type="button" onClick={onArchive} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-red-700 underline underline-offset-4">
          <Trash2 size={14} /> Archivar mesa
        </button>
      )}
    </div>
    <Actions label="Aplicar mesa" onCancel={onCancel} error={error} />
  </form>;
}

export function SpatialPropertiesForm({ entity, kind, placedTableCount, onApply, onCancel }: { entity: FloorLocation | FloorFixture; kind: "sector" | "fixture"; placedTableCount?: number; onApply: (entity: FloorLocation | FloorFixture) => string | null; onCancel: () => void }) {
  const [fields, setFields] = useState(() => copy(entity));
  const [error, setError] = useState<string | null>(null);
  const sector = kind === "sector";
  return <form className={formClass} onSubmit={(event) => { event.preventDefault(); setError(onApply(fields)); }}>
    <div className={bodyClass}>
      {"name" in fields ? <FloorTextField label="Nombre del sector" value={fields.name} onChange={(name) => setFields((value) => ({ ...value, name }))} /> : <label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Texto<input maxLength={100} value={fields.label} onChange={(event) => setFields((value) => ({ ...value, label: event.target.value }))} className={`${floorInputClass} min-h-11`} /></label>}
      {sector && (() => {
        const locationFields = fields as FloorLocation;
        return (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-[#f8faf7] p-3">
          <OptionalPositiveIntField
            label="Cupo de mesas"
            placeholder="Ej: 7"
            value={locationFields.maxTables}
            max={200}
            onChange={(maxTables) => setFields((value) => ({ ...value, maxTables }))}
          />
          <OptionalPositiveIntField
            label="Cupo de personas"
            placeholder="Ej: 28"
            value={locationFields.maxCapacity}
            max={2000}
            onChange={(maxCapacity) => setFields((value) => ({ ...value, maxCapacity }))}
          />
          {placedTableCount !== undefined && (
            <p className="col-span-2 text-[11px] text-[var(--floor-muted,#52634b)]">
              Mesas ubicadas actualmente en este sector: <strong>{placedTableCount}</strong>. Si el cupo de personas se acerca al límite o se supera en sala, el sector se marcará en amarillo.
            </p>
          )}
        </div>
        );
      })()}
      <div className="grid grid-cols-2 gap-3"><FloorNumberField label={sector ? "Ancho del sector" : "Ancho"} value={fields.width} min={1} max={20000} onChange={(width) => setFields((value) => ({ ...value, width }))} /><FloorNumberField label={sector ? "Alto del sector" : "Alto"} value={fields.height} min={1} max={20000} onChange={(height) => setFields((value) => ({ ...value, height }))} /><FloorNumberField label="Centro X" value={fields.x} onChange={(x) => setFields((value) => ({ ...value, x }))} /><FloorNumberField label="Centro Y" value={fields.y} onChange={(y) => setFields((value) => ({ ...value, y }))} /></div>
      <RotationField value={fields.rotation} onChange={(rotation) => setFields((value) => ({ ...value, rotation }))} />
      {"active" in fields && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--floor-focus,#3d5934)]" checked={fields.active} onChange={(event) => setFields((value) => ({ ...value, active: event.target.checked }))} />Sector activo</label>}
      {sector && <p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Al mover el sector en el plano se mueven también sus mesas fijas.</p>}
    </div>
    <Actions label={sector ? "Aplicar sector" : "Aplicar elemento"} onCancel={onCancel} error={error} />
  </form>;
}

export function FloorSettingsForm({ config, dirty, busy, embedded = false, onAction, onDisableStaff }: { config: FloorConfigView; dirty: boolean; busy: boolean; embedded?: boolean; onAction: (body: unknown, message: string) => Promise<boolean>; onDisableStaff: () => void }) {
  const [timeZone, setTimeZone] = useState(config.timeZone);
  const [staff, setStaff] = useState({ email: config.staffAccount?.email ?? "", password: "" });
  const disabled = dirty || busy;
  const submitStaff = async (event: FormEvent) => { event.preventDefault(); if (await onAction({ action: "staff", ...staff }, "Cuenta de sala actualizada.")) setStaff((value) => ({ ...value, password: "" })); };
  const configured = config.rooms.some((room) => room.active && room.tables.some((table) => table.active) && room.locations.some((location) => location.active));
  return <fieldset disabled={busy} className={embedded ? "min-w-0 space-y-5" : formClass}>
    <div className={embedded ? "space-y-5" : bodyClass}>
      {dirty && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Guardá el plano antes de cambiar el funcionamiento o el acceso del personal.</p>}
      <section className="space-y-3"><h3 className="text-sm font-semibold">Asignación de mesas {config.enabled ? "activada" : "sin activar"}</h3><p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Necesitás sectores activos con mesas fijas ubicadas. Las confirmaciones y apertura en sala usan esta distribución.</p>{config.compatibility.reason && <p className="text-xs leading-relaxed text-amber-900">{config.compatibility.reason}</p>}{!config.enabled && <button {...transientButtonProps} type="button" disabled={disabled || !configured || config.compatibility.status !== "compatible"} className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`} onClick={() => void onAction({ action: "activate" }, "Asignación de mesas activada.")}>Activar asignación</button>}</section>
      <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(event) => { event.preventDefault(); void onAction({ action: "settings", timeZone }, "Zona horaria guardada."); }}><h3 className="text-sm font-semibold">Zona horaria del restaurante</h3><FloorTextField label="Zona IANA" value={timeZone} onChange={setTimeZone} /><button {...transientButtonProps} type="submit" disabled={disabled} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>Guardar zona horaria</button></form>
      <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(event) => { void submitStaff(event); }}><h3 className="text-sm font-semibold">Cuenta compartida de sala</h3><p className="text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">Puede consultar reservas y atender mesas. Restablecer la contraseña cierra sus sesiones.</p><label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Correo<input required type="email" value={staff.email} autoComplete="off" className={`${floorInputClass} min-h-11`} onChange={(event) => setStaff((value) => ({ ...value, email: event.target.value }))} /></label><label className="grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Nueva contraseña<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={staff.password} className={`${floorInputClass} min-h-11`} onChange={(event) => setStaff((value) => ({ ...value, password: event.target.value }))} /></label><div className="flex flex-wrap items-center gap-2"><button {...transientButtonProps} type="submit" disabled={disabled} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>{busy && <Loader2 size={15} className="animate-spin" />}{config.staffAccount ? "Actualizar acceso" : "Crear acceso"}</button>{config.staffAccount && <button {...transientButtonProps} type="button" disabled={disabled} onClick={onDisableStaff} className="min-h-11 text-xs font-semibold text-red-700 underline underline-offset-4 disabled:opacity-50">Desactivar cuenta</button>}</div></form>
    </div>
  </fieldset>;
}
