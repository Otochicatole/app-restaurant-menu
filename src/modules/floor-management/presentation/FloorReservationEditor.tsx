"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AlertTriangle, Building2, Check, MapPin, Pencil, RefreshCw, Users, X } from "lucide-react";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import {
  composeRoomPoses,
  getJoinedTableGroups,
  type FloorAssignmentInput,
  type FloorBoardView,
  type FloorOptionsQuery,
  type FloorOptionsView,
  type FloorPose,
} from "../contracts";
import { FloorCanvas, type FloorCanvasTable } from "./FloorCanvas";
import {
  buildFixedAssignment,
  enrichRoomWithQuota,
  findPreferredSector,
  roomAvailableTableIds,
  selectedTableIdsFromAssignment,
} from "./floor-fixed-selection";
import { getFloorBoard, getFloorOptions } from "./floor-api";
import { floorPrimaryButtonClass, floorSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";
import styles from "./floor-operations.module.css";

type FloorReservationEditorProps = {
  restaurantId: string;
  query: FloorOptionsQuery;
  value: FloorAssignmentInput | null;
  onChange: (value: FloorAssignmentInput | null) => void;
  title: string;
  description?: string;
  customerName: string;
  preferredSector?: string;
  saving?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  renderDetails: (close: () => void) => ReactNode;
};

type LoadedState = {
  key: string;
  options: FloorOptionsView | null;
  board: FloorBoardView | null;
  error: string | null;
};

function joinedGroups(poses: FloorPose[], prefix: string) {
  return getJoinedTableGroups(poses).filter((group) => group.length > 1).map((group) => ({
    id: prefix + group[0].tableId,
    tableIds: group.map((pose) => prefix + pose.tableId),
    label: group.map((pose) => pose.label).join(" + "),
  }));
}

const toolLayout = { viewportInset: { top: 100, bottom: 212 }, initialPosition: { x: 0, y: 112 }, initialSize: { width: 400, height: 480 } };
const wideViewport = "(min-width: 56rem)";

function subscribeViewport(onChange: () => void) {
  const media = window.matchMedia(wideViewport);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function FloorReservationEditor({
  restaurantId,
  query,
  value,
  onChange,
  title,
  description,
  customerName,
  preferredSector,
  saving = false,
  error,
  onConfirm,
  onCancel,
  renderDetails,
}: FloorReservationEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const roomButton = useRef<HTMLButtonElement>(null);
  const roomList = useRef<HTMLDivElement>(null);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const detailsBody = useRef<HTMLDivElement>(null);
  const detailsTrigger = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const roomsId = useId();
  const [roomId, setRoomId] = useState(value?.roomId ?? "");
  const [sectorFilter, setSectorFilter] = useState(value?.locationId ?? "");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pickerVisibility, setPickerVisibility] = useState<boolean | null>(null);
  const wide = useSyncExternalStore(subscribeViewport, () => window.matchMedia(wideViewport).matches, () => false);
  const pickerOpen = pickerVisibility ?? wide;
  const [pickerActivation, setPickerActivation] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const queryKey = JSON.stringify({ ...query, restaurantId, attempt });
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const change = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    const controller = new AbortController();
    let ignored = false;
    void (async () => {
      try {
        const nextOptions = await getFloorOptions(restaurantId, query, controller.signal);
        if (ignored) return;
        const preferred = findPreferredSector(nextOptions.rooms, preferredSector);
        setRoomId((current) =>
          current && nextOptions.rooms.some((r) => r.id === current && r.active)
            ? current
            : valueRef.current?.roomId ?? nextOptions.currentAllocation?.roomId ?? preferred?.roomId ?? nextOptions.rooms[0]?.id ?? "",
        );
        if (preferred) {
          setSectorFilter((current) => current || preferred.locationId);
        }
        const current = nextOptions.currentAllocation;
        if (current && !current.releasedAt && !valueRef.current) {
          const currentRoom = nextOptions.rooms.find((r) => r.id === current.roomId);
          if (currentRoom && current.poses.length) {
            change.current({
              roomId: currentRoom.id,
              locationId: current.locationId ?? undefined,
              optionId: current.combinationId ? `combination:${current.combinationId}` : current.poses.length === 1 ? `table:${current.poses[0].tableId}` : "custom",
              x: current.poses.reduce((sum, pose) => sum + pose.x, 0) / current.poses.length,
              y: current.poses.reduce((sum, pose) => sum + pose.y, 0) / current.poses.length,
              rotation: 0,
              capacity: Math.max(current.capacity, query.partySize),
              expectedRoomRevision: currentRoom.revision,
              retainExisting: true,
            });
          }
        }
        const nextBoard = await getFloorBoard(restaurantId, nextOptions.interval.serviceStartAt, controller.signal);
        if (!ignored) setLoaded({ key: queryKey, options: nextOptions, board: nextBoard, error: null });
      } catch (failure) {
        if (!ignored && !controller.signal.aborted) {
          setLoaded({
            key: queryKey,
            options: null,
            board: null,
            error: failure instanceof Error ? failure.message : "No se pudieron consultar las mesas del salón.",
          });
        }
      }
    })();
    return () => { ignored = true; controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, restaurantId, preferredSector]);

  const currentLoaded = loaded?.key === queryKey ? loaded : null;
  const loading = !currentLoaded;
  const options = currentLoaded?.options ?? null;
  const board = currentLoaded?.board ?? null;
  const room = options?.rooms.find((item) => item.id === roomId && item.active) ?? options?.rooms.find((item) => item.active);
  const allocations = board?.allocations.filter((allocation) => allocation.reservationId !== query.excludeReservationId) ?? [];
  const at = options?.interval.serviceStartAt ?? new Date().toISOString();
  const occupied = room ? composeRoomPoses(room, allocations, at) : [];
  const selectedIds = selectedTableIdsFromAssignment(room, value, options?.currentAllocation);
  const currentAllocIds = options?.currentAllocation && !options.currentAllocation.releasedAt ? options.currentAllocation.poses.map((pose) => pose.tableId) : [];
  const availableIds = roomAvailableTableIds(room, options, currentAllocIds);
  const occupiedPoseById = new Map(occupied.map((pose) => [pose.tableId, pose]));
  const quotaState = room ? enrichRoomWithQuota(room, allocations, at, selectedIds, query.partySize, sectorFilter || undefined) : null;

  const tables: FloorCanvasTable[] = room
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

  const groups = allocations
    .filter((allocation) => allocation.roomId === room?.id)
    .flatMap((allocation) => joinedGroups(allocation.poses, "occupied:"));

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    if (!roomsOpen) return;
    const list = roomList.current;
    (list?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? list?.querySelector("button"))?.focus();
  }, [roomsOpen]);

  useEffect(() => {
    if (detailsOpen) {
      detailsBody.current?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus();
    } else if (detailsTrigger.current) {
      (detailsTrigger.current.isConnected ? detailsTrigger.current : pickerButton.current)?.focus();
      detailsTrigger.current = null;
    }
  }, [detailsOpen]);

  const canInteract = !saving && !detailsOpen && !loading && Boolean(options);

  const toggleTable = (tableId: string) => {
    if (!room || !canInteract) return;
    const nextIds = selectedIds.includes(tableId)
      ? selectedIds.filter((id) => id !== tableId)
      : availableIds.has(tableId)
        ? [...selectedIds, tableId]
        : selectedIds;
    if (!nextIds.length) {
      setSelectionError(null);
      onChange(null);
      return;
    }
    const nextAssignment = buildFixedAssignment(room, nextIds, query.partySize, sectorFilter || undefined);
    if (!nextAssignment) {
      setSelectionError("Necesitás al menos un sector activo en el salón para asignar mesas.");
      return;
    }
    setSelectionError(null);
    onChange(nextAssignment);
  };

  const closeRooms = () => { setRoomsOpen(false); roomButton.current?.focus(); };
  const closeDetails = () => { if (!saving) setDetailsOpen(false); };
  const openDetails = () => {
    detailsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRoomsOpen(false);
    setDetailsOpen(true);
  };
  const chooseRoom = (id: string) => {
    if (room?.id !== id) {
      onChange(null);
      setSectorFilter("");
      setSelectionError(null);
    }
    setRoomId(id);
    closeRooms();
  };
  const confirm = () => {
    if (value && board && !currentLoaded?.error && !selectionError && canInteract && selectedIds.length > 0) {
      onConfirm();
    }
  };

  const activeSectors = room?.locations.filter((location) => location.active) ?? [];
  const visibleTables = (room?.tables ?? []).filter(
    (table) => table.active && (!sectorFilter || table.locationId === sectorFilter),
  );
  const selectedLabels = room
    ? room.tables.filter((table) => selectedIds.includes(table.id)).map((table) => table.label)
    : [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); if (!saving) onCancel(); }}
      data-admin-panel
      className={`${styles.screen} fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 p-0`}
    >
      <div className="absolute inset-0">
        {quotaState ? (
          <FloorCanvas
            key={room!.id}
            appearance="operational"
            fullScreen
            room={quotaState.enrichedRoom}
            tables={tables}
            joinedGroups={groups}
            selectedIds={selectedIds}
            selectedLocationId={sectorFilter || undefined}
            onSelectLocation={canInteract ? (id) => setSectorFilter((current) => current === id ? "" : id) : undefined}
            onSelect={canInteract ? (id) => toggleTable(id) : undefined}
          />
        ) : (
          <p role="status" className="grid h-full place-items-center px-8 text-center text-sm text-[var(--floor-muted)]">
            {loading ? "Cargando el plano del salón…" : options ? "No hay salones activos para esta reserva." : "El plano se muestra cuando esté disponible la consulta."}
          </p>
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex items-start justify-between gap-3 px-3 sm:px-5">
        <div className="min-w-0 rounded-xl border border-[var(--floor-border)] bg-white px-4 py-3 shadow-sm">
          <h2 id={titleId} className="text-sm font-semibold sm:text-base">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 truncate text-xs text-[var(--floor-muted)]" title={description}>{description}</p>}
          {preferredSector && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--floor-muted)]">
              <MapPin size={13} aria-hidden="true" className="shrink-0" />
              <span className="truncate" title={preferredSector}>
                Sector preferido <strong className="font-semibold text-[var(--floor-ink)]">{preferredSector}</strong>
              </span>
            </p>
          )}
        </div>
        <button type="button" onClick={onCancel} disabled={saving} aria-label="Cerrar confirmación" className={`${floorSecondaryButtonClass} pointer-events-auto h-11 w-11 shrink-0 px-0`}>
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      <nav aria-label="Herramientas de confirmación" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-max max-w-[calc(100%_-_1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2">
        <button ref={roomButton} type="button" aria-label="Cambiar salón" aria-expanded={roomsOpen} aria-controls={roomsId}
          disabled={!options?.rooms.length || saving || detailsOpen} onClick={() => setRoomsOpen(!roomsOpen)} className={`${floorSecondaryButtonClass} min-h-11 px-3`}>
          <Building2 size={17} aria-hidden="true" />Salones
        </button>
        <button ref={pickerButton} type="button" aria-expanded={pickerOpen && !detailsOpen} aria-controls="floor-table-picker" disabled={detailsOpen || saving}
          onClick={() => { setRoomsOpen(false); setPickerVisibility(true); setPickerActivation((current) => current + 1); }} className={`${floorPrimaryButtonClass} min-h-11 px-3`}>
          <Users size={17} aria-hidden="true" />Elegir mesa
        </button>
        {!pickerOpen && (
          <button type="button" aria-label="Editar reserva" aria-expanded={detailsOpen} disabled={saving} onClick={detailsOpen ? closeDetails : openDetails}
            className={`${floorSecondaryButtonClass} min-h-11 px-3`}>
            <Pencil size={17} aria-hidden="true" />Editar
          </button>
        )}
        {roomsOpen && (
          <div ref={roomList} id={roomsId} role="group" aria-label="Salones disponibles"
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== roomButton.current) setRoomsOpen(false); }}
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRooms(); } }}
            className="absolute bottom-[calc(100%_+_0.5rem)] left-1/2 max-h-[min(18rem,40dvh)] w-64 max-w-[calc(100vw_-_1.5rem)] -translate-x-1/2 space-y-1 overflow-y-auto rounded-xl border border-[var(--floor-border)] bg-white p-2 shadow-lg">
            {options?.rooms.filter((candidate) => candidate.active).map((candidate) => (
              <button key={candidate.id} type="button" aria-pressed={candidate.id === room?.id} onClick={() => chooseRoom(candidate.id)}
                className={`${floorSecondaryButtonClass} min-h-11 w-full justify-between border-0 px-3 text-left aria-pressed:bg-[var(--floor-hover)]`}>
                <span className="min-w-0 truncate">{candidate.name}</span>{candidate.id === room?.id && <Check size={16} aria-hidden="true" className="shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </nav>

      <FloatingModalWindow
        id="floor-table-picker"
        title="Asignar mesa fija"
        subtitle={room?.name ?? customerName}
        icon={<Users size={17} aria-hidden="true" />}
        role="complementary"
        ariaLabel="Asignar mesa fija"
        isOpen={pickerOpen && !detailsOpen}
        activation={pickerActivation}
        keepMounted
        onClose={() => { setPickerVisibility(false); pickerButton.current?.focus(); }}
        closeDisabled={saving}
        initialAnchor="right"
        zIndex={30}
        minWidth={320}
        {...toolLayout}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={floorWindowBodyClass}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--floor-muted)]">
                Hacé clic en una mesa libre ({query.partySize} {query.partySize === 1 ? "persona" : "personas"}).
              </p>
              <button type="button" disabled={loading || saving} onClick={() => { setSelectionError(null); setAttempt((c) => c + 1); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#263e23] hover:underline disabled:opacity-50">
                <RefreshCw size={12} aria-hidden="true" />Actualizar
              </button>
            </div>

            {currentLoaded?.error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{currentLoaded.error}</p>}
            {selectionError && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{selectionError}</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{error}</p>}

            {room && quotaState && (
              <>
                {activeSectors.length > 0 && (
                  <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted)]">
                    Sector del salón
                    <select
                      value={sectorFilter}
                      onChange={(event) => setSectorFilter(event.target.value)}
                      className="min-h-10 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900"
                    >
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
                        ? `El sector ${warning.name} supera su cupo (${warning.occupiedPartySize}/${warning.maxCapacity}p). Podés confirmar igual.`
                        : `El sector ${warning.name} queda cerca de su cupo (${warning.occupiedPartySize}/${warning.maxCapacity}p).`}
                    </span>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mesas disponibles">
                  {visibleTables.map((table) => {
                    const selected = selectedIds.includes(table.id);
                    const selectable = availableIds.has(table.id) || selected;
                    const sectorName = room.locations.find((loc) => loc.id === table.locationId)?.name ?? "Sin sector";
                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={!selectable || !canInteract}
                        aria-pressed={selected}
                        onClick={() => toggleTable(table.id)}
                        className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          selected
                            ? "border-[#3d5934] bg-[#edf2e9] font-semibold text-[#182618]"
                            : "border-zinc-200 bg-white text-zinc-800 hover:bg-[#edf2e9]/60"
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
                  {!visibleTables.length && <p className="col-span-2 text-xs text-zinc-600">No hay mesas activas en este filtro.</p>}
                </div>
              </>
            )}

            <button type="button" disabled={saving} onClick={openDetails}
              className="min-h-10 w-full rounded-lg px-2 text-left text-xs font-semibold text-[#263e23] underline underline-offset-4 hover:bg-[#edf2e9]">
              Editar reserva
            </button>
          </div>
          <footer className={`${floorWindowFooterClass} space-y-2`}>
            {selectedLabels.length > 0 && (
              <p className="text-xs font-medium text-[#263e23]">
                Elegida: <strong>{selectedLabels.join(" + ")}</strong>
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" disabled={saving} onClick={onCancel} className={`${floorSecondaryButtonClass} min-h-11 px-3 text-xs`}>Cancelar</button>
              <button type="button" disabled={saving || !canInteract || !value || selectedIds.length === 0 || Boolean(currentLoaded?.error)} onClick={confirm}
                className={`${floorPrimaryButtonClass} min-h-11 flex-1 px-3 text-xs`}>
                {saving ? "Confirmando…" : "Confirmar y asignar mesas"}
              </button>
            </div>
          </footer>
        </div>
      </FloatingModalWindow>

      <FloatingModalWindow id={`${titleId}-details`} title="Editar reserva" subtitle={customerName} icon={<Pencil size={17} aria-hidden="true" />} role="complementary"
        isOpen={detailsOpen} onClose={closeDetails} closeDisabled={saving} initialAnchor="right" zIndex={35} minWidth={320} {...toolLayout}>
        <div ref={detailsBody} className="flex min-h-0 flex-1 flex-col">{detailsOpen && renderDetails(closeDetails)}</div>
      </FloatingModalWindow>
    </dialog>
  );
}

