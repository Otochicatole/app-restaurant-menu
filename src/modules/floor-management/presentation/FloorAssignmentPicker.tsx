"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, RotateCw, Users } from "lucide-react";
import { composeRoomPoses, type FloorAssignmentInput, type FloorAssignmentOption, type FloorBoardView, type FloorOptionsQuery, type FloorOptionsView, type FloorPose, type FloorRotation } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { floorInputClass, getFloorBoard, getFloorOptions } from "./floor-api";

function positioned(option: FloorAssignmentOption, value: FloorAssignmentInput): FloorPose[] {
  const angle = ((value.rotation - option.rotation + 360) % 360) * Math.PI / 180;
  return option.poses.map((pose) => ({ ...pose, x: value.x + (pose.x - option.x) * Math.cos(angle) - (pose.y - option.y) * Math.sin(angle), y: value.y + (pose.x - option.x) * Math.sin(angle) + (pose.y - option.y) * Math.cos(angle), rotation: ((pose.rotation + value.rotation - option.rotation + 360) % 360) as FloorRotation }));
}

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
            change.current({ roomId: room.id, locationId: current.locationId ?? undefined, optionId: current.combinationId ? `combination:${current.combinationId}` : current.poses.length === 1 ? `table:${current.poses[0].tableId}` : "custom", x: current.poses.reduce((sum, pose) => sum + pose.x, 0) / current.poses.length, y: current.poses.reduce((sum, pose) => sum + pose.y, 0) / current.poses.length, rotation: 0, expectedRoomRevision: room.revision, retainExisting: true });
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
  const selected: FloorPose[] = retained ? options!.currentAllocation!.poses : value?.optionId === "custom" ? (value.customTables ?? []).flatMap((pose) => {
    const table = room?.tables.find((item) => item.id === pose.tableId);
    return table ? [{ ...table, ...pose, tableId: table.id }] : [];
  }) : option && value ? positioned(option, value) : [];
  const poses = room ? composeRoomPoses(room, (board?.allocations ?? []).filter((item) => item.reservationId !== query.excludeReservationId), options?.interval.serviceStartAt ?? new Date().toISOString()) : [];
  const merged = new Map(poses.map((pose) => [pose.tableId, { ...pose, id: pose.tableId, active: true, state: "reserved" as "reserved" | "selected" }]));
  selected.forEach((pose) => merged.set(pose.tableId, { ...pose, id: pose.tableId, active: true, state: "selected" }));
  const setGroup = (ids: string[], targetLocation = location) => {
    if (!room || !targetLocation || !ids.length) { onChange(null); return; }
    const items = room.tables.filter((table) => ids.includes(table.id) && table.active);
    const totalWidth = items.reduce((sum, table) => sum + table.width, 0);
    let cursor = targetLocation.x - totalWidth / 2;
    const customTables = items.map((table) => { const x = cursor + table.width / 2; cursor += table.width; return { tableId: table.id, x, y: targetLocation.y, rotation: 0 as FloorRotation }; });
    const sum = items.reduce((total, table) => total + table.capacity, 0);
    onChange({ roomId: room.id, locationId: targetLocation.id, optionId: "custom", x: targetLocation.x, y: targetLocation.y, rotation: 0, customTables, capacity: Math.max(1, sum - Math.max(0, items.length - 1) * 2), expectedRoomRevision: room.revision, retainExisting: false });
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
    onChange({ roomId: room.id, locationId: target.id, optionId: candidate.id, x: candidate.locationId === target.id ? candidate.x : target.x, y: candidate.locationId === target.id ? candidate.y : target.y, rotation: candidate.rotation, expectedRoomRevision: room.revision, retainExisting: false });
  };
  const moveGroup = (dx: number, dy: number) => {
    if (!value || retained) return;
    onChange({ ...value, x: Math.round(value.x + dx), y: Math.round(value.y + dy), customTables: value.customTables?.map((pose) => ({ ...pose, x: Math.round(pose.x + dx), y: Math.round(pose.y + dy) })), retainExisting: false });
  };
  const rotateGroup = () => {
    if (!value || retained) return;
    onChange({ ...value, rotation: ((value.rotation + 90) % 360) as FloorRotation, customTables: value.customTables?.map((pose) => ({ ...pose, x: Math.round(value.x - (pose.y - value.y)), y: Math.round(value.y + (pose.x - value.x)), rotation: ((pose.rotation + 90) % 360) as FloorRotation })), retainExisting: false });
  };
  const moveTable = (tableId: string, axis: "x" | "y", coordinate: number) => {
    if (!value?.customTables || !Number.isFinite(coordinate)) return;
    const customTables = value.customTables.map((pose) => pose.tableId === tableId ? { ...pose, [axis]: coordinate } : pose);
    onChange({ ...value, customTables, x: customTables.reduce((sum, pose) => sum + pose.x, 0) / customTables.length, y: customTables.reduce((sum, pose) => sum + pose.y, 0) / customTables.length });
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
        <fieldset disabled={!location || loading} className="space-y-2 disabled:opacity-50"><legend className="mb-2 text-xs font-semibold text-zinc-800">Mesas disponibles del inventario</legend><div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">{room.tables.filter((table) => table.active).map((table) => {
          const candidate = options.options.find((item) => item.id === `table:${table.id}`);
          const available = candidate?.resourceAvailable ?? candidate?.available ?? false;
          const checked = !retained && selected.some((pose) => pose.tableId === table.id);
          return <label key={table.id} className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm ${checked ? "border-[#3d5934] text-[#263e23]" : "border-zinc-300 text-zinc-800"} ${available ? "" : "opacity-50"}`} title={!available ? candidate?.conflict : undefined}><input type="checkbox" checked={checked} disabled={!available} onChange={() => setGroup(checked ? selected.filter((pose) => pose.tableId !== table.id).map((pose) => pose.tableId) : [...(retained ? [] : selected.map((pose) => pose.tableId)), table.id])} /><span>Mesa {table.label}<span className="ml-2 text-xs">{table.capacity} lugares</span>{!available && <span className="block text-xs">{candidate?.conflict ?? "Ocupada"}</span>}</span></label>;
        })}</div></fieldset>
        {options.options.some((item) => item.roomId === roomId && item.id.startsWith("combination:")) && <details><summary className="cursor-pointer text-xs font-semibold text-zinc-700">Armados predefinidos</summary><div className="mt-2 flex flex-wrap gap-2">{options.options.filter((item) => item.roomId === roomId && item.id.startsWith("combination:")).map((candidate) => <button key={candidate.id} type="button" disabled={!location || !candidate.available} title={candidate.conflict} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs disabled:opacity-50" onClick={() => chooseOption(candidate)}>{candidate.label} · {candidate.capacity} lugares</button>)}</div></details>}
        <FloorCanvas key={room.id} compact room={room} tables={[...merged.values()]} selectedLocationId={locationId} onSelectLocation={chooseLocation} selectedIds={selected.map((pose) => pose.tableId)} draggableIds={retained ? [] : selected.map((pose) => pose.tableId)} onMove={(_ids, delta) => moveGroup(delta.x, delta.y)} />
        {value && selected.length > 0 && !retained && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-zinc-700"><strong>{selected.map((pose) => pose.label).join(" + ")}</strong> para {query.partySize} personas</span><button type="button" onClick={rotateGroup} className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"><RotateCw size={14} />Girar unión 90°</button></div><div className="grid gap-3 sm:grid-cols-3">{(["x", "y"] as const).map((axis) => <label key={axis} className="grid gap-1 text-xs font-medium text-zinc-700">Centro {axis.toUpperCase()}<input type="number" value={value[axis]} className={floorInputClass} onChange={(event) => { const number = Number(event.target.value); if (Number.isFinite(number)) moveGroup(axis === "x" ? number - value.x : 0, axis === "y" ? number - value.y : 0); }} /></label>)}{value.optionId === "custom" && <label className="grid gap-1 text-xs font-medium text-zinc-700">Lugares útiles<input type="number" min={1} max={selected.reduce((sum, pose) => sum + pose.capacity, 0)} value={value.capacity ?? 1} className={floorInputClass} onChange={(event) => onChange({ ...value, capacity: Number(event.target.value) })} /></label>}</div>{(value.capacity ?? option?.capacity ?? 0) < query.partySize && <p role="alert" className="text-xs text-red-800">El armado necesita más lugares útiles para este grupo.</p>}<p className="text-xs text-zinc-600">Al unir mesas se pierden lugares en los bordes de contacto. Ajustá la capacidad útil antes de guardar.</p><details><summary className="cursor-pointer text-xs font-semibold text-zinc-700">Ajustar cada mesa</summary><div className="mt-2 space-y-2">{value.customTables?.map((pose) => <div key={pose.tableId} className="grid grid-cols-[60px_1fr_1fr_auto] items-end gap-2"><span className="pb-2 text-xs font-semibold">{selected.find((item) => item.tableId === pose.tableId)?.label}</span>{(["x", "y"] as const).map((axis) => <label key={axis} className="grid gap-1 text-xs">{axis.toUpperCase()}<input aria-label={`Mesa ${selected.find((item) => item.tableId === pose.tableId)?.label} ${axis.toUpperCase()}`} type="number" className={floorInputClass} value={pose[axis]} onChange={(event) => moveTable(pose.tableId, axis, Number(event.target.value))} /></label>)}<button type="button" aria-label={`Girar mesa ${selected.find((item) => item.tableId === pose.tableId)?.label}`} className="rounded-lg border border-zinc-300 p-2" onClick={() => onChange({ ...value, customTables: value.customTables?.map((item) => item.tableId === pose.tableId ? { ...item, rotation: ((item.rotation + 90) % 360) as FloorRotation } : item) })}><RotateCw size={15} /></button></div>)}</div></details></div>}
      </>}
    </>}
  </section>;
}
