"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, RotateCw, Users } from "lucide-react";
import { composeRoomPoses, getJoinedTableGroups, type FloorAssignmentInput, type FloorAssignmentOption, type FloorBoardView, type FloorOptionsQuery, type FloorOptionsView, type FloorPose, type FloorRotation } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { assemblyPoses, changeAssemblyTables, customAssembly } from "./floor-assembly";
import { groupInventoryTables, selectTableGroupQuantity } from "./floor-table-groups";
import { capacityAfterLayout, defaultLayoutCapacity, joinLayoutTables, separateLayoutTables } from "./floor-table-layout";
import { floorInputClass, getFloorBoard, getFloorOptions } from "./floor-api";
import { floorSecondaryButtonClass } from "./floor-ui";

export function FloorAssignmentPicker({ restaurantId, query, value, onChange, walkIn = false, durationMinutes = 120 }: { restaurantId: string; query: FloorOptionsQuery; value: FloorAssignmentInput | null; onChange: (value: FloorAssignmentInput | null) => void; walkIn?: boolean; durationMinutes?: number }) {
  const [options, setOptions] = useState<FloorOptionsView | null>(null);
  const [board, setBoard] = useState<FloorBoardView | null>(null);
  const [roomId, setRoomId] = useState(value?.roomId ?? "");
  const [locationId, setLocationId] = useState(value?.locationId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const change = useRef(onChange);
  const previousQuery = useRef("");
  const key = JSON.stringify(walkIn ? { date: "", time: "", partySize: query.partySize } : query);
  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => {
    const controller = new AbortController();
    const input: FloorOptionsQuery = JSON.parse(key);
    const requestKey = `${key}:${walkIn}:${durationMinutes}`;
    if (previousQuery.current && previousQuery.current !== requestKey) change.current(null);
    previousQuery.current = requestKey;
    let ignored = false;
    void (async () => {
      setLoading(true); setError(null); setOptions(null);
      try {
        const next = await getFloorOptions(restaurantId, input, controller.signal, walkIn ? durationMinutes : undefined);
        if (ignored) return;
        setOptions(next);
        setRoomId((current) => next.rooms.some((room) => room.id === current) ? current : next.currentAllocation?.roomId ?? next.rooms[0]?.id ?? "");
        const current = next.currentAllocation;
        if (current && !current.releasedAt) {
          const room = next.rooms.find((item) => item.id === current.roomId);
          if (room && current.poses.length && current.capacity >= input.partySize) {
            setLocationId(current.locationId ?? "");
            change.current({ roomId: room.id, locationId: current.locationId ?? undefined, optionId: current.combinationId ? `combination:${current.combinationId}` : current.poses.length === 1 ? `table:${current.poses[0].tableId}` : "custom", x: current.poses.reduce((sum, pose) => sum + pose.x, 0) / current.poses.length, y: current.poses.reduce((sum, pose) => sum + pose.y, 0) / current.poses.length, rotation: 0, capacity: current.capacity, expectedRoomRevision: room.revision, retainExisting: true });
          }
        }
        const currentBoard = await getFloorBoard(restaurantId, next.interval.serviceStartAt, controller.signal);
        if (!ignored) setBoard(currentBoard);
      } catch (failure) { if (!ignored && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudieron consultar las mesas."); }
      finally { if (!ignored) setLoading(false); }
    })();
    return () => { ignored = true; controller.abort(); };
  }, [restaurantId, key, attempt, walkIn, durationMinutes]);

  const room = options?.rooms.find((item) => item.id === roomId);
  const location = room?.locations.find((item) => item.id === locationId && item.active);
  const retained = Boolean(value?.retainExisting && options?.currentAllocation);
  const option = options?.options.find((item) => item.id === value?.optionId && item.roomId === value.roomId);
  const selected = retained ? options!.currentAllocation!.poses : assemblyPoses(room, value, options?.options ?? []);
  const maximum = defaultLayoutCapacity(selected);
  const capacity = Math.min(value?.capacity ?? option?.capacity ?? maximum, maximum);
  const missing = query.partySize - capacity;
  const hasJoins = selected.length > 1 && getJoinedTableGroups(selected).some((group) => group.length > 1);
  const capacityHint = maximum >= query.partySize ? "Aumentá el límite de lugares útiles."
    : hasJoins ? "Separá mesas o agregá más al armado." : "Agregá mesas al armado.";
  const poses = room ? composeRoomPoses(room, (board?.allocations ?? []).filter((item) => item.reservationId !== query.excludeReservationId), options?.interval.serviceStartAt ?? new Date().toISOString()) : [];
  const merged = new Map(poses.map((pose) => [pose.tableId, { ...pose, id: pose.tableId, active: true, state: "reserved" as "reserved" | "selected" }]));
  selected.forEach((pose) => merged.set(pose.tableId, { ...pose, id: pose.tableId, active: true, state: "selected" }));
  const selectedIds = selected.map((pose) => pose.tableId);
  const availableIds = new Set(room?.tables.filter((table) => {
    const candidate = options?.options.find((item) => item.roomId === room.id && item.id === `table:${table.id}`);
    return table.active && (candidate?.resourceAvailable ?? candidate?.available ?? false);
  }).map((table) => table.id) ?? []);
  const inventoryGroups = groupInventoryTables(room?.tables ?? []).filter((group) => group.tables.some((table) => table.active || selectedIds.includes(table.id)));
  const setGroup = (ids: string[], targetLocation = location) => {
    if (!room || !targetLocation || !ids.length) { onChange(null); return; }
    const unique = [...new Set(ids)];
    if (unique.length > 40) { setError("Podés armar hasta 40 mesas para un mismo grupo."); return; }
    if (unique.some((id) => !room.tables.some((table) => table.id === id && table.active))) { setError("Una de las mesas ya no pertenece al inventario activo."); return; }
    const previousIds = new Set(selected.map((pose) => pose.tableId));
    if (unique.some((id) => !previousIds.has(id) && !availableIds.has(id))) { setError("Una de las mesas ya no está disponible. Actualizá el inventario."); return; }
    if (targetLocation.id === value?.locationId && unique.length === previousIds.size && unique.every((id) => previousIds.has(id))) return;
    const movingLocation = value && value.locationId !== targetLocation.id;
    const previous = movingLocation ? { ...value, locationId: targetLocation.id, x: targetLocation.x, y: targetLocation.y } : value;
    const poses = movingLocation ? selected.map((pose) => ({ ...pose, x: pose.x + targetLocation.x - value.x, y: pose.y + targetLocation.y - value.y })) : selected;
    onChange(changeAssemblyTables(room, targetLocation, unique, previous, poses, previous ?? targetLocation)); setError(null);
  };
  const chooseLocation = (id: string) => {
    setLocationId(id);
    const target = room?.locations.find((item) => item.id === id);
    if (selected.length && !retained) setGroup(selected.map((pose) => pose.tableId), target);
    else onChange(null);
  };
  const chooseOption = (candidate: FloorAssignmentOption) => {
    const target = room?.locations.find((item) => item.id === locationId && item.active);
    if (!room || !target || !candidate.available) return;
    onChange({ roomId: room.id, locationId: target.id, optionId: candidate.id, x: candidate.locationId === target.id ? candidate.x : target.x, y: candidate.locationId === target.id ? candidate.y : target.y, rotation: candidate.rotation, capacity: Math.min(candidate.capacity, defaultLayoutCapacity(candidate.poses)), expectedRoomRevision: room.revision, retainExisting: false });
  };
  const moveGroup = (dx: number, dy: number) => {
    if (!value || retained) return;
    onChange({ ...value, x: value.x + dx, y: value.y + dy, customTables: value.customTables?.map((pose) => ({ ...pose, x: pose.x + dx, y: pose.y + dy })), retainExisting: false });
  };
  const rotateGroup = () => {
    if (!value || retained) return;
    onChange({ ...value, rotation: ((value.rotation + 90) % 360) as FloorRotation, customTables: value.customTables?.map((pose) => ({ ...pose, x: value.x - (pose.y - value.y), y: value.y + (pose.x - value.x), rotation: ((pose.rotation + 90) % 360) as FloorRotation })), retainExisting: false });
  };
  const changeLayout = (next: FloorPose[] | string) => {
    if (!value || retained) return;
    if (typeof next === "string") { setError(next); return; }
    const x = next.reduce((sum, pose) => sum + pose.x, 0) / next.length;
    const y = next.reduce((sum, pose) => sum + pose.y, 0) / next.length;
    onChange(customAssembly({ ...value, x, y }, next, capacityAfterLayout(capacity, selected, next)));
    setError(null);
  };
  const changeTable = (tableId: string, update: Partial<Pick<FloorPose, "x" | "y" | "rotation">>) => {
    changeLayout(selected.map((pose) => pose.tableId === tableId ? { ...pose, ...update } : pose));
  };
  const formatTime = (raw: string) => new Intl.DateTimeFormat("es-AR", { timeZone: options?.interval.timeZone, day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(raw));
  return <section className="space-y-4 rounded-xl border border-zinc-200 bg-[#f8faf7] p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><Users size={16} />Armar mesas</h3><p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">Elegí un sector y las mesas del inventario. Ubicá el armado dentro del sector; puede compartirlo con otros grupos.</p></div><button type="button" disabled={loading} onClick={() => { onChange(null); setAttempt((current) => current + 1); }} className="flex items-center gap-1 text-xs font-semibold text-zinc-700 disabled:opacity-50"><RefreshCw size={12} />Actualizar</button></div>
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-zinc-600"><Loader2 size={14} className="animate-spin" />Consultando disponibilidad…</p>}
    {error && <div role="alert" className="text-sm text-red-800"><p>{error}</p><button type="button" className="mt-1 font-semibold underline underline-offset-4" onClick={() => setAttempt((value) => value + 1)}>Volver a consultar</button></div>}
    {options && <><p className="text-xs tabular-nums text-zinc-600">Bloqueo: {formatTime(options.interval.blockedFrom)} — {formatTime(options.interval.blockedUntil)}</p><div className="flex flex-wrap gap-2" aria-label="Salón de la asignación">{options.rooms.filter((item) => item.active).map((item) => <button key={item.id} type="button" aria-pressed={roomId === item.id} onClick={() => { setRoomId(item.id); setLocationId(""); onChange(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${roomId === item.id ? "bg-[#182618] text-white" : "border border-zinc-300 bg-white text-zinc-700"}`}>{item.name}</button>)}</div>
      {!room && <p className="text-sm text-zinc-600">No hay salones activos. Configurá el espacio antes de confirmar.</p>}
      {retained && <p className="rounded-lg bg-[#e8efe6] p-3 text-xs text-[#263e23]"><strong>Conservar asignación actual:</strong> {selected.map((pose) => pose.label).join(" + ")} · {options.currentAllocation?.capacity} lugares. Elegí un sector y mesas para reemplazarla.</p>}
      {room && <><label className="grid max-w-sm gap-1 text-xs font-medium text-zinc-700">Sector del salón<select value={locationId} onChange={(event) => chooseLocation(event.target.value)} className={floorInputClass}><option value="">Elegí un sector</option>{room.locations.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!room.locations.some((item) => item.active) && <p className="text-sm text-amber-900">Este salón necesita al menos un sector donde armar las mesas.</p>}
        <fieldset disabled={!location || loading} className="space-y-2 disabled:opacity-50"><legend className="mb-2 text-xs font-semibold text-zinc-800">Mesas disponibles del inventario</legend><div className="grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2">{inventoryGroups.map((group) => {
          const chosen = group.tables.filter((table) => selectedIds.includes(table.id)).length;
          const free = group.tables.filter((table) => availableIds.has(table.id) && !selectedIds.includes(table.id)).length;
          return <label key={group.key} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm ${chosen ? "border-[#3d5934] text-[#263e23]" : "border-zinc-300 text-zinc-800"}`}><span className="min-w-0"><span className="font-medium">{group.label}</span><span className="mt-1 block text-xs text-zinc-600">Disponibles: {free} · Elegidas: {chosen}</span></span><input aria-label={`Cantidad de ${group.label}`} type="number" min={0} max={Math.min(chosen + free, Math.max(0, 40 - selectedIds.length + chosen))} step={1} value={chosen} disabled={!chosen && !free} className={`${floorInputClass} max-w-20 shrink-0`} onChange={(event) => { if (!event.target.value) return; const ids = selectTableGroupQuantity(group, selectedIds, Number(event.target.value), availableIds); if (ids) setGroup(ids); }} /></label>;
        })}</div>{!inventoryGroups.length && <p className="text-xs text-zinc-600">No hay mesas activas en el inventario.</p>}</fieldset>
        {options.options.some((item) => item.roomId === roomId && item.id.startsWith("combination:")) && <details><summary className="cursor-pointer text-xs font-semibold text-zinc-700">Armados predefinidos</summary><div className="mt-2 flex flex-wrap gap-2">{options.options.filter((item) => item.roomId === roomId && item.id.startsWith("combination:")).map((candidate) => <button key={candidate.id} type="button" disabled={!location || !candidate.available} title={candidate.conflict} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs disabled:opacity-50" onClick={() => chooseOption(candidate)}>{candidate.label} · {candidate.capacity} lugares</button>)}</div></details>}
        <FloorCanvas key={room.id} compact room={room} tables={[...merged.values()]} selectedLocationId={locationId} onSelectLocation={chooseLocation} selectedIds={selected.map((pose) => pose.tableId)} draggableIds={retained ? [] : selected.map((pose) => pose.tableId)} onMove={(_ids, delta) => moveGroup(delta.x, delta.y)} />
        {value && selected.length > 0 && !retained && <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="min-w-0 break-words text-xs text-zinc-700">{selected.map((pose) => pose.label).join(" + ")}</strong>
            <button type="button" onClick={rotateGroup} className={`${floorSecondaryButtonClass} min-h-11 px-3 text-xs`}><RotateCw size={14} />Girar {hasJoins ? "unión" : "armado"} 90°</button>
          </div>
          <p role="status" aria-label="Capacidad del armado" className={`text-sm tabular-nums ${missing > 0 ? "text-red-800" : "text-zinc-700"}`}>
            <strong>{capacity} {capacity === 1 ? "lugar útil" : "lugares útiles"}</strong> para {query.partySize} {query.partySize === 1 ? "persona" : "personas"}.
            {missing > 0 && ` ${missing === 1 ? "Falta 1 lugar" : `Faltan ${missing} lugares`}. ${capacityHint}`}
          </p>
          {location && selected.length > 1 && <div className="flex flex-wrap gap-2">
            <button type="button" className={`${floorSecondaryButtonClass} min-h-11 px-3 text-xs`} onClick={() => changeLayout(joinLayoutTables(selected, selectedIds, location))}>Unir mesas</button>
            {hasJoins && <button type="button" className={`${floorSecondaryButtonClass} min-h-11 px-3 text-xs`} onClick={() => changeLayout(separateLayoutTables(selected, selectedIds, location))}>Separar mesas</button>}
          </div>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(["x", "y"] as const).map((axis) => <label key={axis} className="grid min-w-0 gap-1 text-xs font-medium text-zinc-700">
              Centro {axis.toUpperCase()}<input type="number" step="any" value={value[axis]} className={floorInputClass} onChange={(event) => { const number = event.target.valueAsNumber; if (Number.isFinite(number)) moveGroup(axis === "x" ? number - value.x : 0, axis === "y" ? number - value.y : 0); }} />
            </label>)}
            {maximum > 0 && <div className="min-w-0 space-y-1">
              <label className="grid gap-1 text-xs font-medium text-zinc-700">
                Lugares útiles<input type="number" min={1} max={maximum} step={1} value={capacity} className={floorInputClass} onChange={(event) => {
                  const next = event.target.valueAsNumber;
                  if (Number.isInteger(next) && next >= 1 && next <= maximum) onChange(customAssembly(value, selected, next));
                }} />
              </label>
              <p className="text-xs text-zinc-600">Máximo del armado {maximum}</p>
            </div>}
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-zinc-700">Ajustar cada mesa</summary>
            <div className="mt-2 space-y-2">{selected.map((pose) => <div key={pose.tableId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto] items-end gap-2">
              <span className="break-words pb-2 text-xs font-semibold">{pose.label}</span>
              {(["x", "y"] as const).map((axis) => <label key={axis} className="grid min-w-0 gap-1 text-xs">
                {axis.toUpperCase()}<input aria-label={`Mesa ${pose.label} ${axis.toUpperCase()}`} type="number" step="any" className={floorInputClass} value={pose[axis]} onChange={(event) => {
                  const coordinate = event.target.valueAsNumber;
                  if (Number.isFinite(coordinate)) changeTable(pose.tableId, { [axis]: coordinate });
                }} />
              </label>)}
              <button type="button" aria-label={`Girar mesa ${pose.label}`} className={`${floorSecondaryButtonClass} min-h-11 px-3`} onClick={() => changeTable(pose.tableId, { rotation: ((pose.rotation + 90) % 360) as FloorRotation })}><RotateCw size={15} /></button>
            </div>)}</div>
          </details>
        </div>}
      </>}
    </>}
  </section>;
}
