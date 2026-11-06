"use client";

import { useCallback, useEffect, useState } from "react";
import { buildFloorOptions, type FloorAllocationView, type FloorAssignmentInput, type FloorAssignmentOption, type FloorLocation, type FloorOptionsView, type FloorPose, type FloorRoom, type FloorRotation } from "../contracts";
import { getFloorOptions, getFloorReassignmentOptions } from "./floor-api";
import { assemblyPoses, changeAssemblyTables, containingLocation, customAssembly, type FloorAssemblyPoint, type FloorAssemblyTableUpdate } from "./floor-assembly";
import { capacityAfterLayout, defaultLayoutCapacity, joinLayoutTables, separateLayoutTables } from "./floor-table-layout";

export type UseFloorAssemblyInput = {
  restaurantId: string; active: boolean; partySize: number; durationMinutes: number; roomId: string;
  value: FloorAssignmentInput | null; onChange: (value: FloorAssignmentInput | null) => void;
  editingAllocation?: FloorAllocationView | null;
  fallbackRoom?: FloorRoom;
};
export type FloorAssemblyController = {
  options: FloorOptionsView | null; room: FloorRoom | undefined; location: FloorLocation | undefined;
  locationId: string; value: FloorAssignmentInput | null; selected: FloorPose[]; capacity: number;
  loading: boolean; error: string | null; refresh: () => void;
  selectLocation: (id: string) => void; setTableIds: (ids: string[]) => void; toggleTable: (id: string) => void; selectOption: (option: FloorAssignmentOption) => void;
  move: (dx: number, dy: number) => void; rotate: () => void; place: (point: FloorAssemblyPoint, locationId?: string) => void;
  setCapacity: (capacity: number) => void; updateTable: (tableId: string, partial: FloorAssemblyTableUpdate) => void;
  replaceRoom: (room: FloorRoom, tableId: string, partial: FloorAssemblyTableUpdate) => void;
  moveTables: (ids: string[], dx: number, dy: number) => void; rotateTables: (ids: string[]) => void;
  joinTables: (ids: string[]) => string | null; separateTables: (ids: string[]) => string | null;
};

export function useFloorAssembly({ restaurantId, active, partySize, durationMinutes, roomId, value, onChange, editingAllocation, fallbackRoom }: UseFloorAssemblyInput): FloorAssemblyController {
  const selectionKey = editingAllocation?.id ?? "walk-in";
  const reservationId = editingAllocation?.reservationId;
  const [result, setResult] = useState<{ restaurantId: string; selectionKey: string; options: FloorOptionsView } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sector, setSector] = useState<{ roomId: string; id: string; point?: FloorAssemblyPoint }>({ roomId: "", id: "" });
  const refresh = useCallback(() => setAttempt((previous) => previous + 1), []);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void (async () => {
      setPending(true); setError(null);
      try {
        const options = reservationId
          ? await getFloorReassignmentOptions(restaurantId, reservationId, controller.signal)
          : await getFloorOptions(restaurantId, { date: "", time: "", partySize }, controller.signal, durationMinutes);
        if (!controller.signal.aborted) setResult({ restaurantId, selectionKey, options });
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudo consultar el inventario. Volvé a actualizar."); }
      finally { if (!controller.signal.aborted) setPending(false); }
    })();
    return () => controller.abort();
  }, [restaurantId, active, partySize, durationMinutes, attempt, reservationId, selectionKey]);

  const options = result?.restaurantId === restaurantId && result.selectionKey === selectionKey ? result.options : null;
  // The saved room is enough to preview a pose edit; availability still comes only from the server.
  const room = options?.rooms.find((item) => item.id === roomId) ?? (editingAllocation && fallbackRoom?.id === roomId && fallbackRoom.restaurantId === restaurantId ? fallbackRoom : undefined);
  const locationId = value?.roomId === roomId && value.locationId ? value.locationId : sector.roomId === roomId ? sector.id : "";
  const location = room?.locations.find((item) => item.id === locationId && item.active);
  const selected = assemblyPoses(room, value, options?.options ?? []);
  const option = options?.options.find((item) => item.id === value?.optionId && item.roomId === roomId);
  const maximum = defaultLayoutCapacity(selected);
  const capacity = Math.min(value?.optionId === "custom" ? value.capacity ?? maximum : option?.capacity ?? 0, maximum);
  const draft = value?.roomId === roomId ? value : null;

  const move = (dx: number, dy: number) => {
    if (!draft || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    setSector({ roomId, id: locationId, point: { x: draft.x + dx, y: draft.y + dy } });
    onChange({ ...draft, x: draft.x + dx, y: draft.y + dy, customTables: draft.customTables?.map((pose) => ({ ...pose, x: pose.x + dx, y: pose.y + dy })), retainExisting: false });
  };
  const selectLocation = (id: string) => {
    const target = room?.locations.find((item) => item.id === id && item.active);
    if (!room || !target) return;
    setSector({ roomId, id, point: { x: target.x, y: target.y } }); setError(null);
    if (draft && selected.length) {
      const dx = target.x - draft.x; const dy = target.y - draft.y;
      onChange({ ...draft, locationId: target.id, x: target.x, y: target.y, customTables: draft.customTables?.map((pose) => ({ ...pose, x: pose.x + dx, y: pose.y + dy })), retainExisting: false });
    }
  };
  const setTableIds = (requestedIds: string[]) => {
    if (!room || !location) { setError("Elegí primero un sector del salón."); return; }
    const ids = [...new Set(requestedIds)];
    if (ids.length > 40) { setError("Podés armar hasta 40 mesas para un mismo grupo."); return; }
    const previousIds = new Set(selected.map((pose) => pose.tableId));
    const tables = ids.map((id) => room.tables.find((table) => table.id === id && (table.active || previousIds.has(id))));
    if (tables.some((table) => !table)) { setError("Una de las mesas ya no pertenece al inventario activo del salón."); return; }
    if (ids.some((id) => {
      if (previousIds.has(id)) return false;
      const candidate = options?.options.find((item) => item.id === `table:${id}` && item.roomId === roomId);
      return !(candidate?.resourceAvailable ?? candidate?.available);
    })) { setError("Una de las mesas ya no está disponible. Actualizá el inventario."); return; }
    if (ids.length === previousIds.size && ids.every((id) => previousIds.has(id))) { setError(null); return; }
    const anchor = draft ?? (sector.roomId === roomId && sector.id === locationId ? sector.point : undefined) ?? location;
    onChange(changeAssemblyTables(room, location, ids, draft, selected, anchor));
    setError(null);
  };
  const toggleTable = (id: string) => {
    const checked = selected.some((pose) => pose.tableId === id);
    setTableIds(checked ? selected.filter((pose) => pose.tableId !== id).map((pose) => pose.tableId) : [...selected.map((pose) => pose.tableId), id]);
  };
  const selectOption = (candidate: FloorAssignmentOption) => {
    if (!room || !location || candidate.roomId !== roomId || !candidate.available) return;
    const anchor = sector.roomId === roomId && sector.id === locationId ? sector.point : undefined;
    onChange({ roomId, locationId: location.id, optionId: candidate.id, x: anchor?.x ?? (candidate.locationId === location.id ? candidate.x : location.x), y: anchor?.y ?? (candidate.locationId === location.id ? candidate.y : location.y), rotation: candidate.rotation, expectedRoomRevision: room.revision, retainExisting: false }); setError(null);
  };
  const rotate = () => {
    if (!draft) return;
    onChange({ ...draft, rotation: ((draft.rotation + 90) % 360) as FloorRotation, customTables: draft.customTables?.map((pose) => ({ ...pose, x: draft.x - (pose.y - draft.y), y: draft.y + (pose.x - draft.x), rotation: ((pose.rotation + 90) % 360) as FloorRotation })), retainExisting: false });
  };
  const place = (point: FloorAssemblyPoint, preferredLocationId?: string) => {
    if (!room || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const target = preferredLocationId ? room.locations.find((item) => item.id === preferredLocationId && item.active) : containingLocation(room, point) ?? location;
    if (!target) { setError("Elegí un sector donde armar las mesas."); return; }
    setSector({ roomId, id: target.id, point: { x: point.x, y: point.y } }); setError(null);
    if (!draft) return;
    const dx = point.x - draft.x; const dy = point.y - draft.y;
    onChange({ ...draft, locationId: target.id, x: point.x, y: point.y, customTables: draft.customTables?.map((pose) => ({ ...pose, x: pose.x + dx, y: pose.y + dy })), retainExisting: false });
  };
  const setCapacity = (number: number) => {
    if (!draft || !selected.length || !Number.isInteger(number) || number < 1 || number > maximum) return;
    onChange(customAssembly(draft, selected, number));
  };
  const applyLayout = (poses: FloorPose[]) => {
    if (!draft || !poses.length) return;
    const nextCapacity = capacityAfterLayout(capacity, selected, poses);
    onChange({ ...customAssembly(draft, poses, nextCapacity), x: poses.reduce((sum, pose) => sum + pose.x, 0) / poses.length, y: poses.reduce((sum, pose) => sum + pose.y, 0) / poses.length });
  };
  const updateTable = (tableId: string, partial: FloorAssemblyTableUpdate) => {
    if (!draft || !selected.some((pose) => pose.tableId === tableId)) return;
    if ((partial.x !== undefined && !Number.isFinite(partial.x)) || (partial.y !== undefined && !Number.isFinite(partial.y))) return;
    if (partial.rotation !== undefined && ![0, 90, 180, 270].includes(partial.rotation)) return;
    const poses = selected.map((pose) => pose.tableId === tableId ? { ...pose, ...partial } : pose);
    applyLayout(poses);
  };
  const moveTables = (ids: string[], dx: number, dy: number) => {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const targets = new Set(ids);
    applyLayout(selected.map((pose) => targets.has(pose.tableId) ? { ...pose, x: pose.x + dx, y: pose.y + dy } : pose));
  };
  const rotateTables = (ids: string[]) => {
    const targets = selected.filter((pose) => ids.includes(pose.tableId));
    if (!targets.length) return;
    const x = targets.reduce((sum, pose) => sum + pose.x, 0) / targets.length;
    const y = targets.reduce((sum, pose) => sum + pose.y, 0) / targets.length;
    applyLayout(selected.map((pose) => ids.includes(pose.tableId) ? { ...pose, x: x - (pose.y - y), y: y + (pose.x - x), rotation: ((pose.rotation + 90) % 360) as FloorRotation } : pose));
  };
  const joinTables = (ids: string[]) => {
    if (!draft || !location) return "Elegí primero un sector y las mesas del armado.";
    const next = joinLayoutTables(selected, ids, location);
    if (typeof next === "string") return next;
    applyLayout(next); return null;
  };
  const separateTables = (ids: string[]) => {
    if (!draft || !location) return "Elegí primero un sector y las mesas del armado.";
    const next = separateLayoutTables(selected, ids, location);
    if (typeof next === "string") return next;
    applyLayout(next); return null;
  };
  const replaceRoom = (nextRoom: FloorRoom, tableId: string, partial: FloorAssemblyTableUpdate) => {
    if (!options || nextRoom.id !== roomId || nextRoom.restaurantId !== restaurantId) return;
    const previous = new Map(options.options.filter((item) => item.roomId === roomId).map((item) => [item.id, item]));
    const nextOptions = buildFloorOptions(nextRoom).map((item) => {
      const old = previous.get(item.id);
      const resourceAvailable = old?.resourceAvailable ?? old?.available ?? false;
      return { ...item, resourceAvailable, available: resourceAvailable && item.capacity >= partySize, ...(!resourceAvailable && old?.conflict ? { conflict: old.conflict } : {}) };
    });
    setResult({ restaurantId, selectionKey, options: { ...options, rooms: options.rooms.map((item) => item.id === roomId ? nextRoom : item), options: [...options.options.filter((item) => item.roomId !== roomId), ...nextOptions] } });
    if (draft && selected.length) {
      const poses = selected.map((pose) => pose.tableId === tableId ? { ...pose, ...partial } : pose);
      const nextDraft = customAssembly(draft, poses, capacity);
      const nextPoses = assemblyPoses(nextRoom, nextDraft, nextOptions);
      onChange({ ...nextDraft, capacity: capacityAfterLayout(capacity, selected, nextPoses), expectedRoomRevision: nextRoom.revision,
        x: poses.reduce((sum, pose) => sum + pose.x, 0) / poses.length, y: poses.reduce((sum, pose) => sum + pose.y, 0) / poses.length });
    }
    setError(null);
  };
  return { options, room, location, locationId, value, selected, capacity, loading: active && pending, error, refresh, selectLocation, setTableIds, toggleTable, selectOption, move, rotate, place, setCapacity, updateTable, replaceRoom, moveTables, rotateTables, joinTables, separateTables };
}
