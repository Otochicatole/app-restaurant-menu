"use client";

import { useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Circle,
  MapPin,
  Minus,
  Plus,
  RectangleHorizontal,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";
import type {
  FloorConfigView,
  FloorFixture,
  FloorLocation,
  FloorRoom,
  FloorRotation,
  FloorTable,
} from "../contracts";
import { FloorSettingsForm, RoomDimensionsForm, type FixedTablePreset } from "./FloorAdminForms";
import { floorInputClass } from "./floor-api";

export type InspectorTab = "structure" | "room" | "settings";

export type FloorAdminInspectorProps = {
  room: FloorRoom | null;
  config: FloorConfigView | null;
  dirty: boolean;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  selectedSector?: FloorLocation;
  selectedTable?: FloorTable;
  selectedFixture?: FloorFixture;
  busy: boolean;
  onClearSelection: () => void;
  onUpdateRoomFields: (fields: Partial<Pick<FloorRoom, "name" | "width" | "height" | "active">>) => string | null;
  onUpdateSector: (sector: FloorLocation) => string | null;
  onUpdateTable: (table: FloorTable) => string | null;
  onUpdateFixture: (fixture: FloorFixture) => string | null;
  onAddTableInSector: (sectorId: string, preset: FixedTablePreset) => string | null;
  onAssignUnlocatedTable: (tableId: string, locationId: string) => string | null;
  onReassignTableSector: (tableId: string, locationId: string | undefined) => string | null;
  onRotateSelection: () => void;
  onRemoveSelection: () => void;
  onSelectTable: (tableId: string) => void;
  onSelectSector: (sectorId: string) => void;
  onSelectFixture: (fixtureId: string) => void;
  onOpenSectorContextMenu?: (sectorId: string, point: { x: number; y: number }) => void;
  onStartPlacement: (kind: "sector" | "table" | FloorFixture["type"]) => void;
  onSelectRoom: (room: FloorRoom) => void;
  onCreateRoom: () => void;
  onArchiveRoom: () => void;
  onDeleteRoom: (room: FloorRoom) => void;
  onConfigurationAction: (body: unknown, message: string) => Promise<boolean>;
  onDisableStaff: () => void;
};

const defaultPreset: FixedTablePreset = { shape: "SQUARE", capacity: 4, width: 80, height: 80 };

function LiveTextInput({
  label,
  value,
  maxLength = 100,
  disabled,
  allowEmpty = false,
  className = "",
  onCommit,
}: {
  label: string;
  value: string;
  maxLength?: number;
  disabled?: boolean;
  allowEmpty?: boolean;
  className?: string;
  onCommit: (next: string) => string | null;
}) {
  const [synced, setSynced] = useState(value);
  const [text, setText] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
      {label}
      <input
        type="text"
        maxLength={maxLength}
        disabled={disabled}
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          if (!allowEmpty && !raw.trim()) return;
          onCommit(raw);
        }}
        onBlur={() => setText(value)}
        className={`${floorInputClass} min-h-10 font-medium text-zinc-950 ${className}`}
      />
    </label>
  );
}

function LiveNumberInput({
  label,
  value,
  min,
  max,
  step = "any",
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number | "any";
  disabled?: boolean;
  onCommit: (next: number) => string | null;
}) {
  const [synced, setSynced] = useState(value);
  const [text, setText] = useState(String(value));
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
  }
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          if (!raw.trim()) return;
          const num = Number(raw);
          if (!Number.isFinite(num)) return;
          if (min !== undefined && num < min) return;
          if (max !== undefined && num > max) return;
          onCommit(num);
        }}
        onBlur={() => setText(String(value))}
        className={`${floorInputClass} min-h-10 tabular-nums text-zinc-950`}
      />
    </label>
  );
}

function QuotaNumberField({
  label,
  value,
  max,
  stepDelta = 1,
  placeholder,
  disabled,
  minusLabel,
  plusLabel,
  onCommit,
}: {
  label: string;
  value?: number;
  max: number;
  stepDelta?: number;
  placeholder: string;
  disabled?: boolean;
  minusLabel: string;
  plusLabel: string;
  onCommit: (next: number | undefined) => void;
}) {
  const rawProp = value !== undefined ? String(value) : "";
  const [synced, setSynced] = useState(rawProp);
  const [text, setText] = useState(rawProp);
  if (synced !== rawProp) {
    setSynced(rawProp);
    setText(rawProp);
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`quota-${label}`} className="text-xs font-medium text-[#46543e]">
          {label}
        </label>
        <span className="text-[11px] font-semibold text-[#263e23] tabular-nums">
          {value !== undefined ? value : "Sin límite"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          {...transientButtonProps}
          type="button"
          aria-label={minusLabel}
          disabled={disabled || !value || value <= 1}
          onClick={() => onCommit(Math.max(1, (value ?? stepDelta + 1) - stepDelta))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-zinc-800 hover:bg-stone-50 disabled:opacity-35"
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <input
          id={`quota-${label}`}
          type="number"
          min={1}
          max={max}
          step={1}
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onChange={(event) => {
            const raw = event.target.value;
            setText(raw);
            if (!raw.trim()) {
              onCommit(undefined);
              return;
            }
            const parsed = Number(raw);
            if (Number.isInteger(parsed) && parsed >= 1 && parsed <= max) {
              onCommit(parsed);
            }
          }}
          onBlur={() => setText(rawProp)}
          className={`${floorInputClass} h-10 flex-1 text-center font-semibold tabular-nums text-zinc-950`}
        />
        <button
          {...transientButtonProps}
          type="button"
          aria-label={plusLabel}
          disabled={disabled || (value !== undefined && value >= max)}
          onClick={() => onCommit(Math.min(max, (value ?? 0) + stepDelta))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-zinc-800 hover:bg-stone-50 disabled:opacity-35"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function RotationSelect({
  value,
  disabled,
  onChange,
}: {
  value: FloorRotation;
  disabled?: boolean;
  onChange: (next: FloorRotation) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
      Rotación
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as FloorRotation)}
        className={`${floorInputClass} min-h-10 px-2 text-zinc-950`}
      >
        {[0, 90, 180, 270].map((rot) => (
          <option key={rot} value={rot}>
            {rot}°
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectionHeader({
  title,
  disabled,
  onBack,
}: {
  title: string;
  disabled?: boolean;
  onBack: () => void;
}) {
  return (
    <header className="shrink-0 border-b border-stone-200 bg-white px-4 py-3">
      <button
        {...transientButtonProps}
        type="button"
        disabled={disabled}
        onClick={onBack}
        className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#3d5934] hover:text-[#182618] focus-visible:outline-2 focus-visible:outline-[#3d5934]"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Volver al salón
      </button>
      <h2 className="truncate text-base font-bold text-zinc-950">{title}</h2>
    </header>
  );
}

export function FloorAdminInspector({
  room,
  config,
  dirty,
  activeTab,
  onTabChange,
  selectedSector,
  selectedTable,
  selectedFixture,
  busy,
  onClearSelection,
  onUpdateRoomFields,
  onUpdateSector,
  onUpdateTable,
  onUpdateFixture,
  onAddTableInSector,
  onAssignUnlocatedTable,
  onReassignTableSector,
  onRotateSelection,
  onRemoveSelection,
  onSelectTable,
  onSelectSector,
  onSelectFixture,
  onOpenSectorContextMenu,
  onStartPlacement,
  onSelectRoom,
  onCreateRoom,
  onArchiveRoom,
  onDeleteRoom,
  onConfigurationAction,
  onDisableStaff,
}: FloorAdminInspectorProps) {
  const [tablePreset, setTablePreset] = useState<FixedTablePreset>(defaultPreset);
  const [targetSectorByTable, setTargetSectorByTable] = useState<Record<string, string>>({});

  const activeSectors = room ? room.locations.filter((loc) => loc.active) : [];
  const activeTables = room ? room.tables.filter((table) => table.active) : [];

  // 1. Contextual Inspector: Sector selected
  if (room && selectedSector) {
    const sectorTables = activeTables.filter((t) => t.locationId === selectedSector.id);
    const tableLimit = selectedSector.maxTables ?? null;
    const atTableLimit = tableLimit !== null && sectorTables.length >= tableLimit;

    return (
      <section role="region" aria-label="Inspector del sector" className="flex h-full w-full flex-col bg-white">
        <SelectionHeader title={selectedSector.name} disabled={busy} onBack={onClearSelection} />

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
          <LiveTextInput
            label="Nombre del sector"
            value={selectedSector.name}
            maxLength={60}
            disabled={busy}
            onCommit={(name) => onUpdateSector({ ...selectedSector, name })}
          />

          <div className="space-y-3 rounded-xl border border-stone-200 bg-[#f8faf7] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[#182618]">Cupos del sector</h3>
              <span className="text-[11px] font-semibold text-[#46543e] tabular-nums">
                {tableLimit !== null
                  ? `${sectorTables.length}/${tableLimit} mesas`
                  : `${sectorTables.length} ${sectorTables.length === 1 ? "mesa" : "mesas"}`}
              </span>
            </div>

            <QuotaNumberField
              label="Cupo de mesas"
              value={selectedSector.maxTables}
              max={200}
              placeholder="Ej: 7"
              disabled={busy}
              minusLabel="Restar cupo de mesas"
              plusLabel="Sumar cupo de mesas"
              onCommit={(maxTables) => onUpdateSector({ ...selectedSector, maxTables })}
            />

            <QuotaNumberField
              label="Cupo de personas"
              value={selectedSector.maxCapacity}
              max={2000}
              stepDelta={2}
              placeholder="Ej: 28"
              disabled={busy}
              minusLabel="Restar cupo de personas"
              plusLabel="Sumar cupo de personas"
              onCommit={(maxCapacity) => onUpdateSector({ ...selectedSector, maxCapacity })}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3.5">
            <h3 className="text-xs font-bold text-[#182618]">Nueva mesa en {selectedSector.name}</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
                Capacidad base
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  disabled={busy}
                  value={tablePreset.capacity}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (Number.isInteger(num) && num >= 1 && num <= 100) {
                      setTablePreset((p) => ({ ...p, capacity: num }));
                    }
                  }}
                  className={`${floorInputClass} min-h-10 tabular-nums text-zinc-950`}
                />
              </label>
              <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
                Forma inicial
                <select
                  disabled={busy}
                  value={tablePreset.shape}
                  onChange={(e) => {
                    const shape = e.target.value as FloorTable["shape"];
                    setTablePreset((p) => ({
                      ...p,
                      shape,
                      height: shape === "RECTANGLE" ? 100 : p.width,
                    }));
                  }}
                  className={`${floorInputClass} min-h-10 px-2 text-zinc-950`}
                >
                  <option value="SQUARE">Cuadrada</option>
                  <option value="RECTANGLE">Rectangular</option>
                  <option value="CIRCLE">Redonda</option>
                </select>
              </label>
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Capacidad rápida">
              {[2, 4, 6, 8].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  disabled={busy}
                  onClick={() => setTablePreset((p) => ({ ...p, capacity: cap }))}
                  className={`h-8 flex-1 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                    tablePreset.capacity === cap
                      ? "border-[#182618] bg-[#182618] text-white"
                      : "border-stone-200 bg-white text-zinc-700 hover:bg-stone-50"
                  }`}
                >
                  {cap}p
                </button>
              ))}
            </div>
            <button
              {...transientButtonProps}
              type="button"
              disabled={busy || atTableLimit || room.tables.length >= 200}
              onClick={() => onAddTableInSector(selectedSector.id, tablePreset)}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#182618] px-3 text-xs font-semibold text-white transition hover:bg-[#2d4628] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus size={15} aria-hidden="true" />
              Agregar mesa
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#182618]">
              Mesas del sector ({sectorTables.length})
            </h3>
            {sectorTables.length === 0 ? (
              <p className="rounded-lg bg-stone-50 p-2.5 text-xs text-stone-600">
                Todavía no hay mesas en este sector.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sectorTables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onSelectTable(table.id)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold text-zinc-900 hover:border-[#3d5934] hover:bg-[#edf2e9]"
                  >
                    <span>{table.label}</span>
                    <span className="text-[11px] font-normal text-stone-500 tabular-nums">
                      ({table.capacity}p)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-4">
            <h3 className="text-xs font-bold text-[#182618]">Geometría y ubicación</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <LiveNumberInput
                label="Ancho del sector"
                value={selectedSector.width}
                min={1}
                max={20000}
                disabled={busy}
                onCommit={(width) => onUpdateSector({ ...selectedSector, width })}
              />
              <LiveNumberInput
                label="Alto del sector"
                value={selectedSector.height}
                min={1}
                max={20000}
                disabled={busy}
                onCommit={(height) => onUpdateSector({ ...selectedSector, height })}
              />
              <LiveNumberInput
                label="Centro X"
                value={selectedSector.x}
                disabled={busy}
                onCommit={(x) => onUpdateSector({ ...selectedSector, x })}
              />
              <LiveNumberInput
                label="Centro Y"
                value={selectedSector.y}
                disabled={busy}
                onCommit={(y) => onUpdateSector({ ...selectedSector, y })}
              />
            </div>
            <RotationSelect
              value={selectedSector.rotation}
              disabled={busy}
              onChange={(rotation) => onUpdateSector({ ...selectedSector, rotation })}
            />
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-3">
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onRotateSelection}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-stone-50 disabled:opacity-45"
          >
            <RotateCw size={14} aria-hidden="true" />
            Girar
          </button>
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onRemoveSelection}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-45"
          >
            <Trash2 size={14} aria-hidden="true" />
            Archivar sector
          </button>
        </footer>
      </section>
    );
  }

  // 2. Contextual Inspector: Fixed Table selected
  if (room && selectedTable) {
    return (
      <section role="region" aria-label="Inspector de mesa" className="flex h-full w-full flex-col bg-white">
        <SelectionHeader title={`Mesa ${selectedTable.label}`} disabled={busy} onBack={onClearSelection} />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
          <LiveTextInput
            label="Número o nombre"
            value={selectedTable.label}
            maxLength={40}
            disabled={busy}
            onCommit={(label) => onUpdateTable({ ...selectedTable, label })}
          />

          <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
            Sector del salón
            <select
              disabled={busy}
              value={selectedTable.locationId ?? ""}
              onChange={(e) => onReassignTableSector(selectedTable.id, e.target.value || undefined)}
              className={`${floorInputClass} min-h-10 text-zinc-950`}
            >
              <option value="">Sin sector asignado</option>
              {activeSectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-[#f8faf7] p-3.5">
            <LiveNumberInput
              label="Capacidad nominal de referencia (personas)"
              value={selectedTable.capacity}
              min={1}
              max={100}
              step={1}
              disabled={busy}
              onCommit={(capacity) => onUpdateTable({ ...selectedTable, capacity })}
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Comensales rápidos">
              {[2, 4, 6, 8, 10].map((cap) => {
                const active = selectedTable.capacity === cap;
                return (
                  <button
                    key={cap}
                    type="button"
                    disabled={busy}
                    onClick={() => onUpdateTable({ ...selectedTable, capacity: cap })}
                    className={`min-h-8 flex-1 rounded-lg border px-2 text-xs font-semibold tabular-nums transition-colors ${
                      active
                        ? "border-[#182618] bg-[#182618] text-white"
                        : "border-stone-200 bg-white text-zinc-700 hover:bg-stone-50"
                    }`}
                  >
                    {cap}p
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-1.5" role="group" aria-label="Forma rápida de la mesa">
              {[
                { shape: "SQUARE" as const, label: "Cuadrada", Icon: Square },
                { shape: "RECTANGLE" as const, label: "Rectangular", Icon: RectangleHorizontal },
                { shape: "CIRCLE" as const, label: "Redonda", Icon: Circle },
              ].map(({ shape, label, Icon }) => {
                const active = selectedTable.shape === shape;
                return (
                  <button
                    key={shape}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onUpdateTable({
                        ...selectedTable,
                        shape,
                        ...(shape !== "RECTANGLE" ? { height: selectedTable.width } : {}),
                      })
                    }
                    className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      active
                        ? "border-[#182618] bg-[#182618] text-white"
                        : "border-stone-200 bg-white text-zinc-700 hover:bg-stone-50"
                    }`}
                  >
                    <Icon size={13} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <label className="grid min-w-0 gap-1 text-xs font-medium text-[#46543e]">
              Forma
              <select
                disabled={busy}
                value={selectedTable.shape}
                onChange={(e) => {
                  const shape = e.target.value as FloorTable["shape"];
                  onUpdateTable({
                    ...selectedTable,
                    shape,
                    ...(shape !== "RECTANGLE" ? { height: selectedTable.width } : {}),
                  });
                }}
                className={`${floorInputClass} min-h-10 text-zinc-950`}
              >
                <option value="SQUARE">Cuadrada</option>
                <option value="RECTANGLE">Rectangular</option>
                <option value="CIRCLE">Redonda</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-3">
            <h3 className="text-xs font-bold text-[#182618]">Medidas y posición</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <LiveNumberInput
                label="Ancho"
                value={selectedTable.width}
                min={20}
                max={20000}
                disabled={busy}
                onCommit={(width) =>
                  onUpdateTable({
                    ...selectedTable,
                    width,
                    ...(selectedTable.shape !== "RECTANGLE" ? { height: width } : {}),
                  })
                }
              />
              <LiveNumberInput
                label="Alto"
                value={selectedTable.height}
                min={20}
                max={20000}
                disabled={busy}
                onCommit={(height) =>
                  onUpdateTable({
                    ...selectedTable,
                    height,
                    ...(selectedTable.shape !== "RECTANGLE" ? { width: height } : {}),
                  })
                }
              />
              <LiveNumberInput
                label="Posición X"
                value={selectedTable.x}
                disabled={busy}
                onCommit={(x) => onUpdateTable({ ...selectedTable, x })}
              />
              <LiveNumberInput
                label="Posición Y"
                value={selectedTable.y}
                disabled={busy}
                onCommit={(y) => onUpdateTable({ ...selectedTable, y })}
              />
            </div>
            <RotationSelect
              value={selectedTable.rotation}
              disabled={busy}
              onChange={(rotation) => onUpdateTable({ ...selectedTable, rotation })}
            />
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-3">
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onRotateSelection}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-stone-50 disabled:opacity-45"
          >
            <RotateCw size={14} aria-hidden="true" />
            Girar
          </button>
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onRemoveSelection}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-45"
          >
            <Trash2 size={14} aria-hidden="true" />
            Archivar mesa
          </button>
        </footer>
      </section>
    );
  }

  // 3. Contextual Inspector: Fixture selected
  if (room && selectedFixture) {
    const title =
      selectedFixture.label ||
      (selectedFixture.type === "BAR" ? "Barra" : selectedFixture.type === "WALL" ? "Pared" : "Texto");

    return (
      <section role="region" aria-label="Inspector de elemento" className="flex h-full w-full flex-col bg-white">
        <SelectionHeader title={title} disabled={busy} onBack={onClearSelection} />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
          <LiveTextInput
            label="Texto"
            value={selectedFixture.label}
            maxLength={100}
            allowEmpty
            disabled={busy}
            onCommit={(label) => onUpdateFixture({ ...selectedFixture, label })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <LiveNumberInput
              label="Ancho"
              value={selectedFixture.width}
              min={1}
              max={20000}
              disabled={busy}
              onCommit={(width) => onUpdateFixture({ ...selectedFixture, width })}
            />
            <LiveNumberInput
              label="Alto"
              value={selectedFixture.height}
              min={1}
              max={20000}
              disabled={busy}
              onCommit={(height) => onUpdateFixture({ ...selectedFixture, height })}
            />
            <LiveNumberInput
              label="Centro X"
              value={selectedFixture.x}
              disabled={busy}
              onCommit={(x) => onUpdateFixture({ ...selectedFixture, x })}
            />
            <LiveNumberInput
              label="Centro Y"
              value={selectedFixture.y}
              disabled={busy}
              onCommit={(y) => onUpdateFixture({ ...selectedFixture, y })}
            />
          </div>
          <RotationSelect
            value={selectedFixture.rotation}
            disabled={busy}
            onChange={(rotation) => onUpdateFixture({ ...selectedFixture, rotation })}
          />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-3">
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onRotateSelection}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-stone-50 disabled:opacity-45"
          >
            <RotateCw size={14} aria-hidden="true" />
            Girar
          </button>
          <button
            {...transientButtonProps}
            type="button"
            disabled={busy}
            onClick={onRemoveSelection}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-45"
          >
            <Trash2 size={14} aria-hidden="true" />
            Eliminar elemento
          </button>
        </footer>
      </section>
    );
  }

  // 4. General Workspace Tabs Mode (Estructura | Salón | Ajustes)
  const unlocatedTables = room ? room.tables.filter((table) => !table.locationId) : [];
  const totalCapacity = activeTables.reduce((sum, table) => sum + table.capacity, 0);
  const tabs: { id: InspectorTab; label: string }[] = [
    { id: "structure", label: "Estructura" },
    { id: "room", label: "Salón" },
    { id: "settings", label: "Ajustes" },
  ];

  const handleSectorKeyDown = (event: KeyboardEvent<HTMLButtonElement>, sectorId: string) => {
    if (!onOpenSectorContextMenu) return;
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      onOpenSectorContextMenu(sectorId, { x: rect.left, y: rect.bottom });
    }
  };

  return (
    <section role="region" aria-label="Inspector del salón" className="flex h-full w-full flex-col bg-white">
      <div className="shrink-0 border-b border-stone-200 px-3 pt-2.5 pb-2">
        <div role="tablist" aria-label="Secciones del panel" className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                {...transientButtonProps}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(tab.id)}
                className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#3d5934] ${
                  selected ? "bg-white text-[#182618] shadow-xs" : "text-stone-600 hover:text-zinc-950"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
        {activeTab === "structure" && (
          <div className="space-y-5">
            {!room ? (
              <div className="rounded-xl border border-stone-200 bg-[#f8faf7] p-4 text-center">
                <Building2 size={24} className="mx-auto mb-2 text-[#46543e]" aria-hidden="true" />
                <p className="text-xs font-semibold text-[#182618]">
                  {config ? "No hay salones activos todavía" : "Cargando estructura del restaurante…"}
                </p>
                {config && (
                  <button
                    {...transientButtonProps}
                    type="button"
                    disabled={busy}
                    onClick={onCreateRoom}
                    className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#182618] px-3 text-xs font-semibold text-white hover:bg-[#2d4628] disabled:opacity-45"
                  >
                    <Plus size={14} aria-hidden="true" />
                    Nuevo salón
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-stone-200 rounded-xl border border-stone-200 bg-[#f8faf7] py-2.5 text-center">
                  <div>
                    <span className="block text-[11px] font-medium text-[#46543e]">Sectores</span>
                    <span className="text-sm font-bold text-zinc-950 tabular-nums">{activeSectors.length}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-[#46543e]">Mesas fijas</span>
                    <span className="text-sm font-bold text-zinc-950 tabular-nums">{activeTables.length}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-[#46543e]">Capacidad</span>
                    <span className="text-sm font-bold text-zinc-950 tabular-nums">{totalCapacity}p</span>
                  </div>
                </div>

                <nav aria-label="Sectores del salón" className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-bold text-[#182618]">Sectores y mesas</h2>
                    <button
                      {...transientButtonProps}
                      type="button"
                      disabled={busy}
                      onClick={() => onStartPlacement("sector")}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#2d4628] hover:bg-[#edf2e9] disabled:opacity-45"
                    >
                      <Plus size={14} aria-hidden="true" />
                      Nuevo sector
                    </button>
                  </div>

                  {room.locations.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-3 text-xs leading-relaxed text-stone-600">
                      Dibujá tu primer sector con <strong>Agregar sector</strong> para ubicar mesas y configurar su cupo.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {room.locations.map((location) => {
                        const sectorTables = activeTables.filter((t) => t.locationId === location.id);
                        const atTableLimit =
                          location.maxTables != null && sectorTables.length >= location.maxTables;
                        const quotaParts = [
                          location.maxTables != null
                            ? `${sectorTables.length}/${location.maxTables} mesas`
                            : `${sectorTables.length} ${sectorTables.length === 1 ? "mesa" : "mesas"}`,
                          location.maxCapacity != null ? `Cupo ${location.maxCapacity}p` : null,
                        ].filter(Boolean);

                        return (
                          <div
                            key={location.id}
                            className="space-y-2 rounded-xl border border-stone-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <button
                                {...transientButtonProps}
                                type="button"
                                disabled={busy}
                                onClick={() => onSelectSector(location.id)}
                                onContextMenu={(event) => {
                                  if (!onOpenSectorContextMenu) return;
                                  event.preventDefault();
                                  onOpenSectorContextMenu(location.id, {
                                    x: event.clientX,
                                    y: event.clientY,
                                  });
                                }}
                                onKeyDown={(event) => handleSectorKeyDown(event, location.id)}
                                className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-bold text-[#182618] hover:text-[#3d5934]"
                              >
                                <MapPin size={14} className="shrink-0 text-[#3d5934]" aria-hidden="true" />
                                <span className="truncate">
                                  {location.name}
                                  {!location.active && " · Archivado"}
                                </span>
                              </button>
                              {location.active && (
                                <button
                                  {...transientButtonProps}
                                  type="button"
                                  aria-label={`Agregar mesa en ${location.name}`}
                                  disabled={busy || atTableLimit || room.tables.length >= 200}
                                  onClick={() => onAddTableInSector(location.id, defaultPreset)}
                                  className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold text-zinc-800 hover:bg-stone-50 disabled:opacity-45"
                                >
                                  <Plus size={13} aria-hidden="true" />
                                  Mesa
                                </button>
                              )}
                            </div>

                            <p
                              className={`text-[11px] tabular-nums ${
                                atTableLimit ? "font-semibold text-amber-800" : "text-[#46543e]"
                              }`}
                            >
                              {quotaParts.join(" · ")}
                            </p>

                            {sectorTables.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {sectorTables.map((table) => (
                                  <button
                                    key={table.id}
                                    {...transientButtonProps}
                                    type="button"
                                    disabled={busy}
                                    aria-label={`Editar mesa ${table.label}`}
                                    onClick={() => onSelectTable(table.id)}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-200 bg-[#f8faf7] px-2 text-xs font-semibold text-zinc-900 hover:border-[#3d5934] hover:bg-[#edf2e9]"
                                  >
                                    <span>{table.label}</span>
                                    <span className="text-[11px] font-normal text-stone-500 tabular-nums">
                                      ({table.capacity}p)
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </nav>

                {unlocatedTables.length > 0 && (
                  <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3">
                    <h3 className="text-xs font-semibold text-amber-950">
                      Mesas sin ubicar en sector ({unlocatedTables.length})
                    </h3>
                    <p className="text-[11px] leading-relaxed text-amber-900">
                      Son mesas anteriores a los sectores fijos. Ubicalas en un sector para que aparezcan en el plano.
                    </p>
                    <div className="space-y-2">
                      {unlocatedTables.map((table) => {
                        const chosenSectorId = targetSectorByTable[table.id] ?? activeSectors[0]?.id ?? "";
                        return (
                          <div
                            key={table.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs"
                          >
                            <span className="font-semibold text-zinc-900">
                              {table.label} ({table.capacity}p){!table.active && " · Inactiva"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {activeSectors.length > 0 && (
                                <>
                                  <select
                                    aria-label={`Sector para ${table.label}`}
                                    className={`${floorInputClass} min-h-9 px-2 text-xs`}
                                    value={chosenSectorId}
                                    onChange={(event) =>
                                      setTargetSectorByTable((current) => ({
                                        ...current,
                                        [table.id]: event.target.value,
                                      }))
                                    }
                                  >
                                    {activeSectors.map((sector) => (
                                      <option key={sector.id} value={sector.id}>
                                        {sector.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    {...transientButtonProps}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onAssignUnlocatedTable(table.id, chosenSectorId)}
                                    className="inline-flex min-h-9 items-center rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold text-zinc-800 hover:bg-stone-50"
                                  >
                                    Ubicar
                                  </button>
                                </>
                              )}
                              <button
                                {...transientButtonProps}
                                type="button"
                                disabled={busy}
                                onClick={() => onSelectTable(table.id)}
                                className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-[#263e23] hover:bg-[#edf2e9]"
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

                <nav aria-label="Elementos del salón" className="space-y-2 border-t border-stone-200 pt-4">
                  <h2 className="text-xs font-bold text-[#182618]">Elementos del salón</h2>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["WALL", "Pared"],
                        ["BAR", "Barra"],
                        ["LABEL", "Texto"],
                      ] as const
                    ).map(([type, label]) => (
                      <button
                        key={type}
                        {...transientButtonProps}
                        type="button"
                        disabled={busy}
                        onClick={() => onStartPlacement(type)}
                        className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold text-zinc-800 hover:bg-stone-50 disabled:opacity-45"
                      >
                        <Plus size={13} aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                  {room.fixtures.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {room.fixtures.map((fixture, index) => (
                        <button
                          key={fixture.id}
                          {...transientButtonProps}
                          type="button"
                          disabled={busy}
                          onClick={() => onSelectFixture(fixture.id)}
                          className="flex min-h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-xs font-medium text-zinc-800 hover:bg-stone-50"
                        >
                          <span className="truncate">
                            {fixture.label ||
                              `${fixture.type === "WALL" ? "Pared" : fixture.type === "BAR" ? "Barra" : "Texto"} ${index + 1}`}
                          </span>
                          <span className="text-[11px] text-stone-500 tabular-nums">
                            {fixture.width}×{fixture.height}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </nav>
              </>
            )}
          </div>
        )}

        {activeTab === "room" && (
          <div className="space-y-6">
            {room && (
              <RoomDimensionsForm
                key={`${room.id}:${room.revision}:${room.name}:${room.width}:${room.height}:${room.active}`}
                room={room}
                saved={Boolean(config?.rooms.some((item) => item.id === room.id))}
                busy={busy}
                embedded
                onApply={(fields) => onUpdateRoomFields(fields)}
                onArchive={onArchiveRoom}
                onDelete={() => onDeleteRoom(room)}
              />
            )}

            <nav aria-label="Salones del restaurante" className="space-y-2 border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-[#182618]">Salones del restaurante</h2>
                <button
                  {...transientButtonProps}
                  type="button"
                  disabled={!config || busy}
                  onClick={onCreateRoom}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#2d4628] hover:bg-[#edf2e9] disabled:opacity-45"
                >
                  <Plus size={14} aria-hidden="true" />
                  Nuevo salón
                </button>
              </div>
              <div className="space-y-1">
                {config?.rooms.map((item) => (
                  <div key={item.id} className="flex items-center gap-1">
                    <button
                      {...transientButtonProps}
                      type="button"
                      disabled={busy}
                      aria-pressed={room?.id === item.id}
                      onClick={() => onSelectRoom(item)}
                      className={`flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 text-left text-xs font-semibold transition-colors ${
                        room?.id === item.id
                          ? "bg-[#edf2e9] text-[#182618]"
                          : "text-zinc-800 hover:bg-stone-50"
                      }`}
                    >
                      <span className="truncate">
                        {item.name}
                        {!item.active && " · Archivado"}
                      </span>
                      {room?.id === item.id && <Check size={15} className="shrink-0 text-[#3d5934]" aria-hidden="true" />}
                    </button>
                    <button
                      {...transientButtonProps}
                      type="button"
                      disabled={busy}
                      aria-label={`Eliminar salón ${item.name}`}
                      title={`Eliminar salón ${item.name}`}
                      onClick={() => onDeleteRoom(item)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 disabled:opacity-45"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </nav>
          </div>
        )}

        {activeTab === "settings" && config && (
          <FloorSettingsForm
            config={config}
            dirty={dirty}
            busy={busy}
            embedded
            onAction={onConfigurationAction}
            onDisableStaff={onDisableStaff}
          />
        )}
      </div>
    </section>
  );
}
