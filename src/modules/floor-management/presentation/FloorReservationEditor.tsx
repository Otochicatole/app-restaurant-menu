"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Building2, Check, Layers3, MapPin, Pencil, X } from "lucide-react";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { composeRoomPoses, getJoinedTableGroups, validateFloorPlacement, validateTableArrangement, type FloorAssignmentInput, type FloorBoardView, type FloorLease, type FloorOptionsQuery, type FloorOptionsView, type FloorPose } from "../contracts";
import { FloorAssemblyControls } from "./FloorAssemblyControls";
import { FloorCanvas } from "./FloorCanvas";
import { getFloorBoard } from "./floor-api";
import { floorPrimaryButtonClass, floorSecondaryButtonClass } from "./floor-ui";
import { useFloorAssembly } from "./useFloorAssembly";
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

type BoardResult = { options: FloorOptionsView; board: FloorBoardView | null; error?: string };

function useReservationBoard(restaurantId: string, options: FloorOptionsView | null) {
  const [result, setResult] = useState<BoardResult | null>(null);
  useEffect(() => {
    if (!options) return;
    const controller = new AbortController();
    void getFloorBoard(restaurantId, options.interval.serviceStartAt, controller.signal).then(
      (board) => { if (!controller.signal.aborted) setResult({ options, board }); },
      (failure: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ options, board: null, error: failure instanceof Error ? failure.message : "No se pudo cargar la ocupación del salón." });
      },
    );
    return () => controller.abort();
  }, [options, restaurantId]);
  return result?.options === options ? result : null;
}

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

export function FloorReservationEditor({ restaurantId, query, value, onChange, title, description, customerName, preferredSector, saving = false, error, onConfirm, onCancel, renderDetails }: FloorReservationEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const roomButton = useRef<HTMLButtonElement>(null);
  const roomList = useRef<HTMLDivElement>(null);
  const assemblyButton = useRef<HTMLButtonElement>(null);
  const detailsBody = useRef<HTMLDivElement>(null);
  const detailsTrigger = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const roomsId = useId();
  const [roomId, setRoomId] = useState(value?.roomId ?? "");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assemblyVisibility, setAssemblyVisibility] = useState<boolean | null>(null);
  const wide = useSyncExternalStore(subscribeViewport, () => window.matchMedia(wideViewport).matches, () => false);
  const assemblyOpen = assemblyVisibility ?? wide;
  const [assemblyActivation, setAssemblyActivation] = useState(0);
  const [selection, setSelection] = useState<string[]>([]);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const changeAssignment = (next: FloorAssignmentInput | null) => {
    setLayoutError(null);
    if (!next) setSelection([]);
    onChange(next);
  };
  const assembly = useFloorAssembly({ restaurantId, active: true, partySize: query.partySize, roomId, value, onChange: changeAssignment, reservationQuery: query, preferredSector });
  const { options, room, selected: draft } = assembly;
  const result = useReservationBoard(restaurantId, options);
  const board = result?.board;
  const allocations = board?.allocations.filter((allocation) => allocation.reservationId !== query.excludeReservationId) ?? [];
  const occupied = room && board ? composeRoomPoses(room, allocations, board.at) : [];
  const tables = [
    ...occupied.map((pose) => ({ ...pose, id: `occupied:${pose.tableId}`, active: true, state: "reserved" as const })),
    ...draft.map((pose) => ({ ...pose, id: pose.tableId, active: true, state: "available" as const })),
  ];
  const occupiedIds = new Set(occupied.map((pose) => pose.tableId));
  const groups = [
    ...allocations.filter((allocation) => allocation.roomId === room?.id)
      .flatMap((allocation) => joinedGroups(allocation.poses.filter((pose) => occupiedIds.has(pose.tableId)), "occupied:")),
    ...joinedGroups(draft, ""),
  ];
  const draftIds = draft.map(({ tableId }) => tableId);
  const selectedIds = selection.filter((id) => draftIds.includes(id));
  const canArrange = !saving && !detailsOpen && !assembly.loading && Boolean(options);
  const boardLoading = Boolean(options && !result);
  let conflict = result?.error ?? null;
  if (!conflict && room && options && value && draft.length) {
    const proposal: FloorLease = { ...options.interval, id: "draft", reservationId: query.excludeReservationId ?? "draft", roomId: room.id, locationId: value.locationId, poses: draft, releasedAt: null };
    conflict = value.expectedRoomRevision !== room.revision ? "El salón cambió. Volvé a elegir las mesas para actualizar el armado."
      : validateTableArrangement(draft) ?? validateFloorPlacement(room, proposal, allocations);
  }

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
      (detailsTrigger.current.isConnected ? detailsTrigger.current : assemblyButton.current)?.focus();
      detailsTrigger.current = null;
    }
  }, [detailsOpen]);

  const selectTables = (ids: string[], additive: boolean) => {
    const editable = ids.filter((id) => draftIds.includes(id));
    setSelection((previous) => additive ? [...new Set([...previous, ...editable])] : editable);
  };
  const selectTable = (id: string, additive: boolean) => {
    if (!draftIds.includes(id)) return;
    if (additive && selectedIds.includes(id)) setSelection((previous) => previous.filter((item) => item !== id));
    else selectTables([id], additive);
  };
  const closeRooms = () => { setRoomsOpen(false); roomButton.current?.focus(); };
  const closeDetails = () => { if (!saving) setDetailsOpen(false); };
  const openDetails = () => {
    detailsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRoomsOpen(false);
    setDetailsOpen(true);
  };
  const chooseRoom = (id: string) => {
    if (room?.id !== id) changeAssignment(null);
    setRoomId(id);
    closeRooms();
  };
  const confirm = () => {
    if (value && board && !conflict && !layoutError && canArrange && assembly.capacity >= query.partySize) onConfirm();
  };

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); if (!saving) onCancel(); }}
      data-admin-panel className={`${styles.screen} fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 p-0`}>
      <div className="absolute inset-0">
        {room ? (
          <FloorCanvas key={room.id} appearance="operational" fullScreen room={room} tables={tables} joinedGroups={groups}
            selectedIds={selectedIds} selectedLocationId={assembly.locationId} draggableIds={canArrange ? draftIds : []}
            onSelect={canArrange ? selectTable : undefined} onSelectMany={canArrange ? selectTables : undefined}
            onClearSelection={() => setSelection([])} onMove={canArrange ? (ids, delta) => assembly.moveTables(ids, delta.x, delta.y) : undefined}
            onSelectLocation={canArrange ? assembly.selectLocation : undefined} onPlace={canArrange && !assembly.locationId ? assembly.place : undefined} />
        ) : (
          <p role="status" className="grid h-full place-items-center px-8 text-center text-sm text-[var(--floor-muted)]">
            {assembly.loading ? "Cargando el plano del salón…" : options ? "No hay salones activos para esta reserva." : "El plano se muestra cuando esté disponible la consulta."}
          </p>
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex items-start justify-between gap-3 px-3 sm:px-5">
        <div className="min-w-0 rounded-xl border border-[var(--floor-border)] bg-white px-4 py-3 shadow-sm">
          <h2 id={titleId} className="text-sm font-semibold sm:text-base">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 truncate text-xs text-[var(--floor-muted)]" title={description}>{description}</p>}
          {preferredSector && <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--floor-muted)]"><MapPin size={13} aria-hidden="true" className="shrink-0" /><span className="truncate" title={preferredSector}>Sector preferido <strong className="font-semibold text-[var(--floor-ink)]">{preferredSector}</strong></span></p>}
        </div>
        <button type="button" onClick={onCancel} disabled={saving} aria-label="Cerrar confirmación" className={`${floorSecondaryButtonClass} pointer-events-auto h-11 w-11 shrink-0 px-0`}><X size={19} aria-hidden="true" /></button>
      </header>

      <nav aria-label="Herramientas de confirmación" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-max max-w-[calc(100%_-_1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2">
        <button ref={roomButton} type="button" aria-label="Cambiar salón" aria-expanded={roomsOpen} aria-controls={roomsId}
          disabled={!options?.rooms.length || saving || detailsOpen} onClick={() => setRoomsOpen(!roomsOpen)} className={`${floorSecondaryButtonClass} min-h-11 px-3`}><Building2 size={17} aria-hidden="true" />Salones</button>
        <button ref={assemblyButton} type="button" aria-expanded={assemblyOpen && !detailsOpen} aria-controls="floor-assembly" disabled={detailsOpen || saving}
          onClick={() => { setRoomsOpen(false); setAssemblyVisibility(true); setAssemblyActivation((current) => current + 1); }} className={`${floorPrimaryButtonClass} min-h-11 px-3`}><Layers3 size={17} aria-hidden="true" />Armar mesas</button>
        {!assemblyOpen && <button type="button" aria-label="Editar reserva" aria-expanded={detailsOpen} disabled={saving} onClick={detailsOpen ? closeDetails : openDetails}
          className={`${floorSecondaryButtonClass} min-h-11 px-3`}><Pencil size={17} aria-hidden="true" />Editar</button>}
        {roomsOpen && <div ref={roomList} id={roomsId} role="group" aria-label="Salones disponibles"
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== roomButton.current) setRoomsOpen(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRooms(); } }}
          className="absolute bottom-[calc(100%_+_0.5rem)] left-1/2 max-h-[min(18rem,40dvh)] w-64 max-w-[calc(100vw_-_1.5rem)] -translate-x-1/2 space-y-1 overflow-y-auto rounded-xl border border-[var(--floor-border)] bg-white p-2 shadow-lg">
          {options?.rooms.filter((candidate) => candidate.active).map((candidate) => (
            <button key={candidate.id} type="button" aria-pressed={candidate.id === room?.id} onClick={() => chooseRoom(candidate.id)} className={`${floorSecondaryButtonClass} min-h-11 w-full justify-between border-0 px-3 text-left aria-pressed:bg-[var(--floor-hover)]`}>
              <span className="min-w-0 truncate">{candidate.name}</span>{candidate.id === room?.id && <Check size={16} aria-hidden="true" className="shrink-0" />}
            </button>
          ))}
        </div>}
      </nav>

      <FloorAssemblyControls controller={{ ...assembly, loading: assembly.loading || boardLoading, refresh: () => { setLayoutError(null); assembly.refresh(); } }}
        partySize={query.partySize} customerName={customerName} saving={saving} suspended={detailsOpen} conflict={conflict} error={layoutError} submissionError={error}
        confirmLabel="Confirmar y asignar mesas" editDataLabel="Editar reserva" windowLayout={toolLayout}
        floatingWindow={{ visible: assemblyOpen, zIndex: 30, offset: 0, activation: assemblyActivation, onFocus: () => undefined, onHide: () => { setAssemblyVisibility(false); assemblyButton.current?.focus(); } }}
        selectedTableIds={selectedIds} onSelectTable={selectTable} onSelectTableGroup={(ids) => selectTables(ids, false)}
        onJoinTables={() => setLayoutError(assembly.joinTables(selectedIds))} onSeparateTables={() => setLayoutError(assembly.separateTables(selectedIds))} onRotateTableGroup={() => assembly.rotateTables(selectedIds)}
        onConfirm={confirm} onCancel={onCancel} onChooseRoom={() => setRoomsOpen(true)} onEditData={openDetails} />

      <FloatingModalWindow id={`${titleId}-details`} title="Editar reserva" subtitle={customerName} icon={<Pencil size={17} aria-hidden="true" />} role="complementary"
        isOpen={detailsOpen} onClose={closeDetails} closeDisabled={saving} initialAnchor="right" zIndex={35} minWidth={320} {...toolLayout}>
        <div ref={detailsBody} className="flex min-h-0 flex-1 flex-col">{detailsOpen && renderDetails(closeDetails)}</div>
      </FloatingModalWindow>
    </dialog>
  );
}
