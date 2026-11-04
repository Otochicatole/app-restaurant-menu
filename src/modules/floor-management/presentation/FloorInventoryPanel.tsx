"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass } from "./floor-ui";
import { transientButtonProps } from "@/ui/button-state";
import { floorRoomInputSchema, validateRoomLayout, type FloorCombination, type FloorRoom } from "../contracts";
import { CombinationPropertiesForm, InventoryForm, InventoryGroupForm, TablePropertiesForm } from "./FloorAdminForms";
import { groupInventoryTables } from "./floor-table-groups";
import { inventoryTables, resizeInventoryGroup } from "./floor-inventory";
import { saveFloorTables } from "./floor-api";

type View = { kind: "inventory" } | { kind: "group"; key: string } | { kind: "table"; id: string } | { kind: "combination"; value: FloorCombination };

export function FloorInventoryPanel({ restaurantId, room, onSaved, onClose, onDirtyChange, onBusyChange }: {
  restaurantId: string; room: FloorRoom; onSaved: (room: FloorRoom) => void; onClose: () => void;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(room));
  const [view, setView] = useState<View>({ kind: "inventory" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = () => { setView({ kind: "inventory" }); setError(null); };
  const apply = (candidate: FloorRoom, goBack = false): string | null => {
    const result = floorRoomInputSchema.safeParse(candidate);
    const invalid = result.success ? validateRoomLayout(result.data) : result.error.issues[0]?.message ?? "Revisá las mesas.";
    if (invalid) return invalid;
    setDraft(candidate); setDirty(true); onDirtyChange(true); setError(null);
    if (goBack) back();
    return null;
  };
  const createCombination = (ids: string[]) => {
    const tables = draft.tables.filter((table) => table.active && ids.includes(table.id));
    if (tables.length < 2) return;
    let cursor = -tables.reduce((sum, table) => sum + table.width, 0) / 2;
    const members = tables.map((table) => { const x = cursor + table.width / 2; cursor += table.width; return { tableId: table.id, x, y: 0, rotation: 0 as const }; });
    const baseName = tables.map((table) => table.label).join(" + ");
    let name = baseName; let suffix = 2;
    while (draft.combinations.some((item) => item.name === name)) name = `${baseName} ${suffix++}`;
    setView({ kind: "combination", value: { id: crypto.randomUUID(), name, members, active: true, capacity: Math.max(1, tables.reduce((sum, table) => sum + table.capacity, 0) - (tables.length - 1) * 2) } });
  };
  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true); onBusyChange(true); setError(null);
    try {
      const result = await saveFloorTables(restaurantId, { roomId: draft.id, expectedRevision: draft.revision, tables: draft.tables, combinations: draft.combinations });
      setDraft(result.room); setDirty(false); onDirtyChange(false); onSaved(result.room);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar el inventario. Volvé a intentar."); }
    finally { setBusy(false); onBusyChange(false); }
  };
  const group = view.kind === "group" ? groupInventoryTables(draft.tables).find((item) => item.key === view.key) : null;
  const table = view.kind === "table" ? draft.tables.find((item) => item.id === view.id) : null;
  return <fieldset disabled={busy} className="flex min-h-0 min-w-0 flex-1 flex-col">
    {view.kind !== "inventory" && <header className="shrink-0 border-b border-stone-200 px-4 py-2">
      <button {...transientButtonProps} type="button" onClick={back} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}><ArrowLeft size={14} />Volver al inventario</button>
    </header>}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    {view.kind === "inventory" && <InventoryForm room={draft} onAdd={(stock) => {
      if (!Number.isInteger(stock.quantity) || stock.quantity < 1 || stock.quantity + draft.tables.length > 200) return "Ingresá una cantidad entera válida. El salón admite hasta 200 mesas.";
      return apply({ ...draft, tables: [...draft.tables, ...inventoryTables(stock.quantity, stock, draft.tables)] });
    }} onEditGroup={(key) => setView({ kind: "group", key })} onEditTable={(id) => setView({ kind: "table", id })}
      onEditCombination={(id) => { const value = draft.combinations.find((item) => item.id === id); if (value) setView({ kind: "combination", value }); }} onCreateCombination={createCombination} />}
    {view.kind === "group" && group && <InventoryGroupForm key={group.key} group={group} onCancel={back} onApply={(fields) => { const tables = resizeInventoryGroup(draft, group.key, fields); return typeof tables === "string" ? tables : apply({ ...draft, tables }, true); }} />}
    {table && <TablePropertiesForm key={table.id} table={table} onCancel={back} onApply={(value) => apply({ ...draft, tables: draft.tables.map((item) => item.id === value.id ? value : item) }, true)} />}
    {view.kind === "combination" && <CombinationPropertiesForm key={view.value.id} combination={view.value} room={draft} onCancel={back} onApply={(value) => apply({ ...draft, combinations: draft.combinations.some((item) => item.id === value.id) ? draft.combinations.map((item) => item.id === value.id ? value : item) : [...draft.combinations, value] }, true)} />}
    </div>
    {view.kind === "inventory" && <footer className="shrink-0 space-y-2 border-t border-stone-200 bg-white px-4 py-3">
      {error && <p role="alert" className="text-xs leading-relaxed text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button {...transientButtonProps} type="button" onClick={onClose} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>Cerrar</button>
        <button {...transientButtonProps} type="button" disabled={busy || !dirty || view.kind !== "inventory"} onClick={() => { void save(); }} className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`}>{busy ? <><Loader2 size={14} className="animate-spin" />Guardando…</> : <><Save size={14} />Guardar inventario</>}</button>
      </div>
    </footer>}
  </fieldset>;
}
