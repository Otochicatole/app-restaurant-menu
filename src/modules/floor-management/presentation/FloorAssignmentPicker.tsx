"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, Users } from "lucide-react";
import { composeRoomPoses, type FloorAssignmentInput, type FloorBoardView, type FloorOptionsQuery, type FloorOptionsView } from "../contracts";
import { FloorCanvas, type FloorCanvasTable } from "./FloorCanvas";
import {
  buildFixedAssignment,
  enrichRoomWithQuota,
  roomAvailableTableIds,
  selectedTableIdsFromAssignment,
} from "./floor-fixed-selection";
import { floorInputClass, getFloorBoard, getFloorOptions } from "./floor-api";

export function FloorAssignmentPicker({
  restaurantId,
  query,
  value,
  onChange,
  walkIn = false,
  durationMinutes = 120,
}: {
  restaurantId: string;
  query: FloorOptionsQuery;
  value: FloorAssignmentInput | null;
  onChange: (value: FloorAssignmentInput | null) => void;
  walkIn?: boolean;
  durationMinutes?: number;
}) {
  const [options, setOptions] = useState<FloorOptionsView | null>(null);
  const [board, setBoard] = useState<FloorBoardView | null>(null);
  const [roomId, setRoomId] = useState(value?.roomId ?? "");
  const [sectorFilter, setSectorFilter] = useState(value?.locationId ?? "");
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
      setLoading(true);
      setError(null);
      setOptions(null);
      try {
        const next = await getFloorOptions(restaurantId, input, controller.signal, walkIn ? durationMinutes : undefined);
        if (ignored) return;
        setOptions(next);
        setRoomId((current) => next.rooms.some((room) => room.id === current) ? current : next.currentAllocation?.roomId ?? next.rooms[0]?.id ?? "");
        const current = next.currentAllocation;
        if (current && !current.releasedAt) {
          const currentRoom = next.rooms.find((item) => item.id === current.roomId);
          if (currentRoom && current.poses.length) {
            setSectorFilter(current.locationId ?? "");
            change.current({
              roomId: currentRoom.id,
              locationId: current.locationId ?? undefined,
              optionId: current.combinationId ? `combination:${current.combinationId}` : current.poses.length === 1 ? `table:${current.poses[0].tableId}` : "custom",
              x: current.poses.reduce((sum, pose) => sum + pose.x, 0) / current.poses.length,
              y: current.poses.reduce((sum, pose) => sum + pose.y, 0) / current.poses.length,
              rotation: 0,
              capacity: Math.max(current.capacity, input.partySize),
              expectedRoomRevision: currentRoom.revision,
              retainExisting: true,
            });
          }
        }
        const currentBoard = await getFloorBoard(restaurantId, next.interval.serviceStartAt, controller.signal);
        if (!ignored) setBoard(currentBoard);
      } catch (failure) {
        if (!ignored && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudieron consultar las mesas.");
      } finally {
        if (!ignored) setLoading(false);
      }
    })();
    return () => { ignored = true; controller.abort(); };
  }, [restaurantId, key, attempt, walkIn, durationMinutes]);

  const room = options?.rooms.find((item) => item.id === roomId);
  const retained = Boolean(value?.retainExisting && options?.currentAllocation);
  const selectedIds = selectedTableIdsFromAssignment(room, value, options?.currentAllocation);
  const currentAllocIds = options?.currentAllocation && !options.currentAllocation.releasedAt ? options.currentAllocation.poses.map((pose) => pose.tableId) : [];
  const availableIds = roomAvailableTableIds(room, options, currentAllocIds);
  const otherAllocations = (board?.allocations ?? []).filter((item) => item.reservationId !== query.excludeReservationId);
  const at = options?.interval.serviceStartAt ?? new Date().toISOString();
  const occupiedPoses = room ? composeRoomPoses(room, otherAllocations, at) : [];
  const occupiedPoseById = new Map(occupiedPoses.map((pose) => [pose.tableId, pose]));
  const quotaState = room ? enrichRoomWithQuota(room, otherAllocations, at, selectedIds, query.partySize, sectorFilter || undefined) : null;

  const toggleTable = (tableId: string) => {
    if (!room || loading) return;
    const nextIds = selectedIds.includes(tableId)
      ? selectedIds.filter((id) => id !== tableId)
      : availableIds.has(tableId)
        ? [...selectedIds, tableId]
        : selectedIds;
    if (!nextIds.length) {
      onChange(null);
      return;
    }
    const nextAssignment = buildFixedAssignment(room, nextIds, query.partySize, sectorFilter || undefined);
    if (!nextAssignment) {
      setError("Necesitás al menos un sector activo en el salón para asignar la mesa.");
      return;
    }
    setError(null);
    onChange(nextAssignment);
  };

  const canvasTables: FloorCanvasTable[] = room
    ? room.tables
        .filter((table) => table.active)
        .map((table) => {
          const isSelected = selectedIds.includes(table.id);
          const isFree = availableIds.has(table.id);
          const pose = occupiedPoseById.get(table.id);
          return {
            id: table.id,
            label: table.label,
            capacity: table.capacity,
            shape: table.shape,
            x: table.locationId ? table.x : (pose?.x ?? table.x),
            y: table.locationId ? table.y : (pose?.y ?? table.y),
            width: table.width,
            height: table.height,
            rotation: table.locationId ? table.rotation : (pose?.rotation ?? table.rotation),
            active: true,
            state: isSelected ? "selected" : pose || !isFree ? "reserved" : "available",
            subtitle: `${table.capacity}p${isSelected ? " · Elegida" : !isFree ? " · Ocupada" : ""}`,
          };
        })
    : [];

  const activeSectors = room?.locations.filter((location) => location.active) ?? [];
  const visibleTables = (room?.tables ?? []).filter(
    (table) => table.active && (!sectorFilter || table.locationId === sectorFilter),
  );
  const formatTime = (raw: string) =>
    new Intl.DateTimeFormat("es-AR", { timeZone: options?.interval.timeZone, day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(raw));

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-[#f8faf7] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <Users size={16} />Elegir mesa fija
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            Hacé clic en una mesa libre del plano o de la lista para asignarla a la reserva ({query.partySize} {query.partySize === 1 ? "persona" : "personas"}).
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => { onChange(null); setAttempt((current) => current + 1); }} className="flex items-center gap-1 text-xs font-semibold text-zinc-700 disabled:opacity-50">
          <RefreshCw size={12} />Actualizar
        </button>
      </div>

      {loading && <p role="status" className="flex items-center gap-2 text-sm text-zinc-600"><Loader2 size={14} className="animate-spin" />Consultando disponibilidad…</p>}
      {error && (
        <div role="alert" className="text-sm text-red-800">
          <p>{error}</p>
          <button type="button" className="mt-1 font-semibold underline underline-offset-4" onClick={() => setAttempt((current) => current + 1)}>Volver a consultar</button>
        </div>
      )}

      {options && (
        <>
          <p className="text-xs tabular-nums text-zinc-600">Bloqueo: {formatTime(options.interval.blockedFrom)} — {formatTime(options.interval.blockedUntil)}</p>
          <div className="flex flex-wrap gap-2" aria-label="Salón de la asignación">
            {options.rooms.filter((item) => item.active).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={roomId === item.id}
                onClick={() => { setRoomId(item.id); setSectorFilter(""); onChange(null); }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${roomId === item.id ? "bg-[#182618] text-white" : "border border-zinc-300 bg-white text-zinc-700"}`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {!room && <p className="text-sm text-zinc-600">No hay salones activos. Configurá el espacio antes de confirmar.</p>}

          {retained && options.currentAllocation && (
            <p className="rounded-lg bg-[#e8efe6] p-3 text-xs text-[#263e23]">
              <strong>Asignación actual conservada:</strong> {options.currentAllocation.poses.map((pose) => pose.label).join(" + ")}. Hacé clic en otra mesa si querés cambiarla.
            </p>
          )}

          {room && quotaState && (
            <>
              {activeSectors.length > 0 && (
                <label className="grid max-w-sm gap-1 text-xs font-medium text-zinc-700">
                  Filtrar por sector
                  <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className={floorInputClass}>
                    <option value="">Todos los sectores</option>
                    {activeSectors.map((sector) => {
                      const q = quotaState.sectorQuotas.find((item) => item.locationId === sector.id);
                      const detail = q?.maxCapacity != null ? ` (${q.occupiedPartySize}/${q.maxCapacity}p)` : "";
                      return <option key={sector.id} value={sector.id}>{sector.name}{detail}</option>;
                    })}
                  </select>
                </label>
              )}

              {quotaState.warnings.map((warning) => (
                <div key={warning.locationId} role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>
                    {warning.status === "exceeded"
                      ? `El sector ${warning.name} supera su cupo (${warning.occupiedPartySize}/${warning.maxCapacity} personas). Podés confirmar igual.`
                      : `El sector ${warning.name} queda cerca de su cupo (${warning.occupiedPartySize}/${warning.maxCapacity} personas).`}
                  </span>
                </div>
              ))}

              <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-3" role="group" aria-label="Mesas del salón">
                {visibleTables.map((table) => {
                  const selected = selectedIds.includes(table.id);
                  const selectable = availableIds.has(table.id) || selected;
                  const sectorName = room.locations.find((loc) => loc.id === table.locationId)?.name ?? "Sin sector";
                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={!selectable || loading}
                      aria-pressed={selected}
                      onClick={() => toggleTable(table.id)}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                        selected
                          ? "border-[#3d5934] bg-[#edf2e9] font-semibold text-[#182618]"
                          : "border-zinc-300 bg-white text-zinc-800 hover:bg-[#edf2e9]/60"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{table.label}</span>
                        <span className="block truncate text-[11px] text-zinc-500">{sectorName} · {table.capacity}p</span>
                      </span>
                      {selected && <Check size={14} className="shrink-0 text-[#263e23]" aria-hidden="true" />}
                    </button>
                  );
                })}
                {!visibleTables.length && <p className="col-span-full text-xs text-zinc-600">No hay mesas activas en esta vista.</p>}
              </div>

              <FloorCanvas
                key={room.id}
                compact
                room={quotaState.enrichedRoom}
                tables={canvasTables}
                selectedIds={selectedIds}
                selectedLocationId={sectorFilter || undefined}
                onSelectLocation={(id) => setSectorFilter((current) => current === id ? "" : id)}
                onSelect={(id) => toggleTable(id)}
              />

              {selectedIds.length > 0 && (
                <p role="status" className="text-xs font-medium text-[#263e23]">
                  Mesa seleccionada: <strong>{room.tables.filter((t) => selectedIds.includes(t.id)).map((t) => t.label).join(" + ")}</strong> · Grupo de {query.partySize} {query.partySize === 1 ? "persona" : "personas"}.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

