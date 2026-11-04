"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Clock, Loader2, Move, RefreshCw, Users, X } from "lucide-react";
import { AdminModal } from "@/ui/admin/AdminUI";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { calculateFloorInterval, composeRoomPoses, restaurantLocalDateTime, validateAssembly, validateFloorPlacement, validateRoomLayout, type FloorAllocationView, type FloorAssignmentInput, type FloorBoardView, type FloorLease, type FloorRoom, type FloorTable } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { FloorAssemblyControls } from "./FloorAssemblyControls";
import { FloorBoardToolbar } from "./FloorBoardToolbar";
import { FloorTableContextMenu } from "./FloorTableContextMenu";
import { FloorTableEditor } from "./FloorTableEditor";
import { FloorInventoryPanel } from "./FloorInventoryPanel";
import { useFloorAssembly } from "./useFloorAssembly";
import { floorInputClass, getFloorBoard, reassignFloorTables, saveFloorAction, saveFloorTables } from "./floor-api";

type Panel = "rooms" | "schedule" | "reservations" | "walk-in" | "detail" | "release" | "table" | "inventory" | null;
const emptyWalkIn = { customerName: "", partySize: 2, notes: "", durationMinutes: 120 };
const floatingButton = "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[#263e23] shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors hover:bg-[#edf2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function FloorBoardScreen({ restaurantId, restaurantName, readOnly, canManageWalkIns = false, initialBoard = null }: { restaurantId: string; restaurantName: string; readOnly: boolean; canManageWalkIns?: boolean; initialBoard?: FloorBoardView | null }) {
  const [board, setBoard] = useState<FloorBoardView | null>(initialBoard);
  const [roomId, setRoomId] = useState(() => initialBoard?.rooms.find((room) => room.active)?.id ?? "");
  const [query, setQuery] = useState({ date: "", time: "" });
  const initialQuery = useRef(query);
  const [schedule, setSchedule] = useState({ date: "", time: "" });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FloorAllocationView | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<FloorAllocationView | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(() => initialBoard ? new Date(initialBoard.updatedAt) : null);
  const [assembling, setAssembling] = useState(false);
  const [walkIn, setWalkIn] = useState(emptyWalkIn);
  const [assignment, setAssignment] = useState<FloorAssignmentInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<FloorAllocationView | null>(null);
  const [tableMenu, setTableMenu] = useState<{ id: string; point: { x: number; y: number } } | null>(null);
  const [tableEditor, setTableEditor] = useState<FloorTable | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [inventoryDirty, setInventoryDirty] = useState(false);
  const [inventoryRoom, setInventoryRoom] = useState<FloorRoom | null>(null);
  const currentBoard = useRef(board);
  const pending = useRef<AbortController | null>(null);
  const panelContent = useRef<HTMLDivElement>(null);
  const boardSurface = useRef<HTMLDivElement>(null);
  const attendButton = useRef<HTMLButtonElement>(null);
  const changeAssignment = useCallback((value: FloorAssignmentInput | null) => { setAssignment(value); setOperationError(null); }, []);
  const assembly = useFloorAssembly({ restaurantId, active: assembling && panel !== "walk-in", partySize: walkIn.partySize, durationMinutes: walkIn.durationMinutes, roomId, value: assignment, onChange: changeAssignment, editingAllocation, fallbackRoom: board?.rooms.find((item) => item.id === roomId) });
  useEffect(() => { currentBoard.current = board; }, [board]);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    try {
      const timeZone = currentBoard.current?.timeZone ?? "America/Argentina/Buenos_Aires";
      const at = query.date ? calculateFloorInterval({ date: query.date, time: query.time || "20:00", timeZone }).serviceStartAt : new Date().toISOString();
      const next = await getFloorBoard(restaurantId, at, controller.signal);
      if (controller.signal.aborted) return;
      setBoard(next); setError(null); setRefreshedAt(new Date());
      setRoomId((previous) => next.rooms.some((room) => room.id === previous && room.active) ? previous : next.rooms.find((room) => room.active)?.id ?? "");
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudo actualizar la sala."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [restaurantId, query]);

  useEffect(() => {
    // Reuse the server snapshot on arrival; a changed time query must still refresh immediately.
    const initial = initialBoard && query === initialQuery.current ? null : window.setTimeout(() => { void refresh(); }, 0);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15_000);
    const focus = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { if (initial !== null) window.clearTimeout(initial); window.clearInterval(interval); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); pending.current?.abort(); };
  }, [refresh, initialBoard, query]);

  // Panels share one dialog, retaining its original opener while their content changes.
  useEffect(() => {
    if (!panel || panel === "rooms") return;
    const frame = window.requestAnimationFrame(() => panelContent.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [panel]);

  const room = (assembling ? assembly.room : undefined) ?? board?.rooms.find((item) => item.id === roomId);
  const allocations = board?.allocations.filter((item) => item.roomId === roomId) ?? [];
  const local = board ? restaurantLocalDateTime(board.timeZone, new Date(board.at)) : { date: "", time: "" };
  const otherAllocations = board?.allocations.filter((item) => item.id !== editingAllocation?.id) ?? [];
  const draft = assembling ? assembly.selected : [];
  const focusedDraftId = draft.some((pose) => pose.tableId === focusedTableId) ? focusedTableId : null;
  const poses = room && board ? composeRoomPoses(room, editingAllocation && draft.length ? otherAllocations : board.allocations, board.at) : [];
  const draftIds = draft.map((pose) => `draft:${pose.tableId}`);
  const tables = [...poses.map((pose) => ({ ...pose, id: pose.tableId, active: true, state: "reserved" as const })),
    ...draft.map((pose) => ({ ...pose, id: `draft:${pose.tableId}`, active: true, state: "selected" as const }))];
  let assemblyConflict: string | null = null;
  if (assembling && assignment && room && assembly.options && draft.length) {
    const unavailable = assembly.options.options.find((option) => option.roomId === room.id && option.id.startsWith("table:") && !(option.resourceAvailable ?? option.available) && draft.some((pose) => option.id === `table:${pose.tableId}`));
    const proposal: FloorLease = { ...assembly.options.interval, id: "draft", reservationId: editingAllocation?.reservationId ?? "draft", roomId: room.id, locationId: assignment.locationId, poses: draft, releasedAt: null };
    const inventoryChanged = draft.some((pose) => !room.tables.some((table) => table.id === pose.tableId && table.active) || !assembly.options!.options.some((option) => option.roomId === room.id && option.id === `table:${pose.tableId}`));
    const current = assembly.options.currentAllocation;
    const changed = editingAllocation && (!current || current.version !== editingAllocation.version || current.reservationRevision !== editingAllocation.reservationRevision);
    assemblyConflict = changed ? "La asignación cambió. Cancelá esta edición y volvé a abrirla desde la mesa."
      : assignment.expectedRoomRevision !== room.revision ? "El salón cambió. Volvé a elegir las mesas para actualizar el armado."
      : inventoryChanged ? "El inventario cambió. Elegí las mesas del armado nuevamente."
      : unavailable?.conflict ?? validateAssembly(draft) ?? validateFloorPlacement(room, proposal, otherAllocations);
  }
  const currentSelection = selected ? board?.allocations.find((allocation) => allocation.id === selected.id) : null;
  const selectedAllocation = currentSelection ?? selected;
  const canRelease = (allocation: FloorAllocationView) => canManageWalkIns && !query.date && allocation.source === "WALK_IN" && !allocation.releasedAt;
  const canManageTables = !readOnly || canManageWalkIns;
  const canArrange = (allocation: FloorAllocationView) => canManageTables && !allocation.releasedAt && Date.parse(allocation.blockedUntil) > Date.parse(board?.updatedAt ?? "");
  const closePanel = () => { if (!saving && (!inventoryDirty || window.confirm("Hay cambios de mesas sin guardar. ¿Querés descartarlos?"))) { setPanel(null); setInventoryDirty(false); setInventoryRoom(null); setTableEditor(null); setTableError(null); } };
  const openSchedule = () => { setSchedule({ date: query.date || local.date, time: query.time || local.time }); setScheduleError(null); setPanel("schedule"); };
  const showDetails = (allocation: FloorAllocationView) => { setSelected(allocation); setPanel("detail"); };
  const askRelease = (allocation: FloorAllocationView) => { setReleaseTarget(allocation); setOperationError(null); setPanel("release"); };
  const openWalkIn = () => { setOperationError(null); setQuery({ date: "", time: "" }); setPanel("walk-in"); };
  const focusAttend = () => { window.requestAnimationFrame(() => attendButton.current?.focus()); };
  const cancelAssembly = () => { setWalkIn(emptyWalkIn); setAssembling(false); setAssignment(null); setEditingAllocation(null); setFocusedTableId(null); setMovingTableId(null); setTableMenu(null); setTableEditor(null); setOperationError(null); setPanel(null); focusAttend(); };
  const continueOnBoard = (event: React.FormEvent) => { event.preventDefault(); setAssembling(true); setPanel(null); window.requestAnimationFrame(() => boardSurface.current?.focus()); };

  const createWalkIn = async () => {
    if (!assignment || !assembly.options || assemblyConflict || assembly.loading || assembly.error) return;
    if (editingAllocation && editingAllocation.reservationRevision === undefined) { setOperationError("Actualizá la sala antes de guardar este armado."); return; }
    setSaving(true); setOperationError(null);
    try {
      if (editingAllocation) await reassignFloorTables(restaurantId, editingAllocation.reservationId, { expectedRevision: editingAllocation.reservationRevision ?? -1, expectedAllocationVersion: editingAllocation.version, assignment });
      else await saveFloorAction(restaurantId, { action: "walk-in", ...walkIn, customerName: walkIn.customerName.trim() || "Sin reserva", assignment });
      cancelAssembly();
      void refresh();
    } catch (failure) { setOperationError(failure instanceof Error ? failure.message : "No se pudo armar la mesa. Volvé a consultar disponibilidad."); }
    finally { setSaving(false); }
  };
  const releaseWalkIn = async () => {
    if (!releaseTarget) return;
    setSaving(true); setOperationError(null);
    try {
      await saveFloorAction(restaurantId, { action: "release-walk-in", reservationId: releaseTarget.reservationId, expectedRevision: releaseTarget.reservationRevision });
      setSelected(null); setReleaseTarget(null); setPanel(null); await refresh();
    } catch (failure) { setOperationError(failure instanceof Error ? failure.message : "No se pudieron liberar las mesas. Actualizá la sala y volvé a intentar."); }
    finally { setSaving(false); }
  };
  const applySchedule = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      calculateFloorInterval({ ...schedule, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" });
      setQuery({ ...schedule }); setScheduleError(null); setSelected(null); setPanel(null);
    } catch (failure) { setScheduleError(failure instanceof Error ? failure.message : "Revisá la fecha y hora elegidas."); }
  };

  const closeTableMenu = useCallback(() => setTableMenu(null), []);
  const openTableMenu = (id: string, point: { x: number; y: number }) => {
    if (saving) return;
    setTableMenu({ id, point }); setMovingTableId(null);
    if (id.startsWith("draft:")) setFocusedTableId(id.slice(6));
  };
  const actOnTable = (action: "edit" | "rotate" | "move") => {
    if (!tableMenu || !room || saving) return;
    const isDraft = tableMenu.id.startsWith("draft:");
    const tableId = isDraft ? tableMenu.id.slice(6) : tableMenu.id;
    const allocation = isDraft ? null : allocations.find((item) => item.poses.some((pose) => pose.tableId === tableId));
    if (!isDraft && (!allocation || !canArrange(allocation) || assembling)) return;
    const pose = isDraft ? draft.find((item) => item.tableId === tableId) : allocation?.poses.find((item) => item.tableId === tableId);
    const stock = room.tables.find((item) => item.id === tableId);
    if (!pose || !stock) return;
    setTableMenu(null); setFocusedTableId(tableId); setTableError(null); setOperationError(null);
    if (allocation) {
      const customTables = allocation.poses.map((item) => ({ tableId: item.tableId, x: item.x, y: item.y, rotation: action === "rotate" && item.tableId === tableId ? ((item.rotation + 90) % 360) as FloorTable["rotation"] : item.rotation }));
      setAssignment({ roomId: room.id, locationId: allocation.locationId ?? undefined, optionId: "custom", customTables, capacity: allocation.capacity,
        x: customTables.reduce((sum, item) => sum + item.x, 0) / customTables.length, y: customTables.reduce((sum, item) => sum + item.y, 0) / customTables.length,
        rotation: 0, expectedRoomRevision: room.revision, retainExisting: false });
      setEditingAllocation(allocation); setAssembling(true); setSelected(allocation);
      setWalkIn({ customerName: allocation.customerName, partySize: allocation.partySize, notes: allocation.notes,
        durationMinutes: Math.max(15, Math.round((Date.parse(allocation.serviceEndAt) - Date.parse(allocation.serviceStartAt)) / 60_000)) });
    } else if (action === "rotate") assembly.updateTable(tableId, { rotation: ((pose.rotation + 90) % 360) as FloorTable["rotation"] });
    if (action === "edit") { setTableEditor({ ...stock, x: pose.x, y: pose.y, rotation: pose.rotation }); setPanel("table"); }
    else { setPanel(null); if (action === "move") setMovingTableId(tableId); window.requestAnimationFrame(() => boardSurface.current?.focus()); }
  };
  const editAllocation = (allocation: FloorAllocationView) => {
    if (!canArrange(allocation) || assembling || !allocation.poses.length) return;
    // Open the same table actions used on the canvas, accessible from the list.
    const bounds = panelContent.current?.getBoundingClientRect();
    setPanel(null); setTableMenu({ id: allocation.poses[0].tableId, point: { x: bounds?.left ?? 16, y: bounds?.top ?? 120 } });
  };
  const applyTable = async (next: FloorTable) => {
    const source = room?.tables.find((item) => item.id === next.id);
    if (!room || !source || !assignment || !draft.some((item) => item.tableId === next.id) || saving || assembly.loading) return;
    setTableError(null);
    const stock = { ...source, label: next.label, shape: next.shape, width: next.width, height: next.height, capacity: next.capacity, active: next.active };
    const inventoryChanged = (["label", "shape", "width", "height", "capacity", "active"] as const).some((key) => stock[key] !== source[key]);
    const partial = { x: next.x, y: next.y, rotation: next.rotation };
    if (inventoryChanged && !canManageTables) { setTableError("No tenés permiso para modificar las mesas."); return; }
    if (inventoryChanged && !assembly.options) { setTableError("Actualizá la disponibilidad del armado antes de guardar cambios en el inventario."); return; }
    if (inventoryChanged) {
      const candidate = { ...room, tables: room.tables.map((item) => item.id === next.id ? stock : item) };
      const invalid = validateRoomLayout(candidate);
      if (invalid) { setTableError(invalid); return; }
      setSaving(true);
      try {
        const { room: savedRoom } = await saveFloorTables(restaurantId, { roomId: room.id, tables: candidate.tables, combinations: candidate.combinations, expectedRevision: room.revision });
        assembly.replaceRoom(savedRoom, next.id, partial);
        setBoard((previous) => previous ? { ...previous, rooms: previous.rooms.map((item) => item.id === savedRoom.id ? savedRoom : item) } : previous);
        setPanel(null); setTableEditor(null); assembly.refresh();
      } catch (failure) { setTableError(failure instanceof Error ? failure.message : "No se pudo guardar la mesa. Volvé a intentar."); }
      finally { setSaving(false); }
    } else { assembly.updateTable(next.id, partial); setPanel(null); setTableEditor(null); }
  };
  const menuTable = tables.find((item) => item.id === tableMenu?.id);
  const menuAllocation = tableMenu && !tableMenu.id.startsWith("draft:") ? allocations.find((item) => item.poses.some((pose) => pose.tableId === tableMenu.id)) : null;
  const menuDisabled = saving || (tableMenu?.id.startsWith("draft:") ? assembly.loading : !menuAllocation || !canArrange(menuAllocation) || assembling);
  const moveTable = (point: { x: number; y: number }, locationId?: string) => {
    if (movingTableId) { assembly.updateTable(movingTableId, point); setMovingTableId(null); }
    else { setFocusedTableId(null); assembly.place(point, locationId); }
  };

  const title = panel === "inventory" ? "Inventario de mesas" : panel === "table" ? `Editar mesa ${tableEditor?.label ?? ""}` : panel === "schedule" ? "Fecha y hora" : panel === "reservations" ? `Reservas de ${room?.name ?? "la sala"}` : panel === "walk-in" ? "Atender sin reserva" : panel === "release" ? "Liberar mesas" : "Detalle de la reserva";
  const when = query.date && board ? new Intl.DateTimeFormat("es-AR", { timeZone: board.timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(board.at)) : `Ahora${local.time ? ` · ${local.time}` : ""}`;

  return <main data-admin-panel className="fixed inset-0 isolate h-dvh overflow-hidden bg-[#f5f2e9] text-zinc-950 selection:bg-[#d6e8d4]">
    <h1 className="sr-only">Sala · {restaurantName}</h1>
    <div ref={boardSurface} tabIndex={-1} role="region" aria-label="Tablero principal de sala" className="absolute inset-0 outline-none" onKeyDown={(event) => { if (event.key === "Escape" && movingTableId) { event.preventDefault(); setMovingTableId(null); } }}>
      {room && <FloorCanvas key={room.id} fullScreen room={room} tables={tables} selectedIds={assembling ? focusedDraftId ? [`draft:${focusedDraftId}`] : draftIds : currentSelection?.poses.map((pose) => pose.tableId) ?? []} selectedLocationId={assembling ? assembly.locationId : undefined} draggableIds={assembling && !saving && !assembly.loading ? focusedDraftId ? [`draft:${focusedDraftId}`] : draftIds : []} onContextMenuTable={openTableMenu} onMove={assembling && !saving && !assembly.loading ? (ids, delta) => { const id = ids.length === 1 ? ids[0].replace(/^draft:/, "") : null; const pose = id ? draft.find((item) => item.tableId === id) : null; if (pose) assembly.updateTable(pose.tableId, { x: pose.x + delta.x, y: pose.y + delta.y }); else assembly.move(delta.x, delta.y); setMovingTableId(null); } : undefined} onPlace={assembling && !saving && !assembly.loading ? moveTable : undefined} onSelect={(id) => { if (assembling) { if (id.startsWith("draft:")) setFocusedTableId(id.slice(6)); return; } const allocation = allocations.find((item) => item.poses.some((pose) => pose.tableId === id)); if (allocation) showDetails(allocation); }} />}
    </div>
    {tableMenu && menuTable && !panel && <FloorTableContextMenu name={menuTable.label} point={tableMenu.point} disabled={Boolean(menuDisabled)} reason={menuDisabled && !saving ? assembling && menuAllocation ? "Terminá el armado actual antes de modificar otro grupo." : "Esta asignación ya no está vigente o no tenés permiso para modificar mesas." : undefined} onEdit={() => actOnTable("edit")} onRotate={() => actOnTable("rotate")} onMove={() => actOnTable("move")} onClose={closeTableMenu} />}
    {movingTableId && !panel && <div role="status" className="absolute bottom-24 left-1/2 z-30 flex max-w-[calc(100%_-_2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-[#182618] p-3 text-sm text-white shadow-lg"><Move size={18} className="shrink-0" /><span>Elegí el destino de la mesa {draft.find((item) => item.tableId === movingTableId)?.label} o arrastrala.</span><button type="button" aria-label="Cancelar movimiento" onClick={() => setMovingTableId(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2"><X size={18} /></button></div>}
    {!room && <div className="absolute inset-0 grid place-items-center p-8"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{board ? "No hay salones activos" : "Preparando la sala…"}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-600">{board ? "Usá la botonera para administrar los salones o volvé a actualizar." : "Cargando sectores y mesas asignadas."}</p></div></div>}

    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-start justify-between gap-3 px-4 sm:px-6">
      <div aria-label="Salón actual" className="min-w-0 rounded-xl bg-white px-3 py-2 text-[#263e23] shadow-[0_3px_16px_rgba(24,38,24,0.12)]">
        <span className="block max-w-[60vw] truncate text-[11px] text-[#52634b] sm:max-w-72">{restaurantName}</span><span className="block max-w-[60vw] truncate text-sm font-semibold sm:max-w-72">{room?.name ?? "Elegir salón"}</span>
      </div>
      <button type="button" aria-label="Actualizar" title="Actualizar sala" disabled={loading} onClick={() => { setOperationError(null); void refresh(); if (assembling) assembly.refresh(); }} className={`${floatingButton} pointer-events-auto h-12 w-12 shrink-0 px-0`}>{loading ? <Loader2 size={19} className="animate-spin" /> : <RefreshCw size={19} />}</button>
    </header>

    <div className="pointer-events-none absolute left-4 right-4 top-[calc(max(1rem,env(safe-area-inset-top))+4rem)] z-10 max-w-lg space-y-2 sm:left-6">
      <div className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]"><span className="font-semibold">{when}</span><span className="ml-2 text-[#52634b]" role="status">{refreshedAt ? `Actualizado ${new Intl.DateTimeFormat("es-AR", { timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(refreshedAt)}` : "Consultando…"}</span></div>
      {error && (!panel || panel === "rooms") && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
      {board && !board.enabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">La asignación de mesas todavía no está activada.</p>}
    </div>

    <FloorBoardToolbar rooms={board?.rooms ?? []} roomId={roomId} roomsOpen={panel === "rooms"} onRoomsOpenChange={(open) => { closeTableMenu(); setMovingTableId(null); setPanel(open ? "rooms" : null); }} onSelectRoom={(id) => { if (id !== roomId) { changeAssignment(null); setFocusedTableId(null); setMovingTableId(null); } setRoomId(id); setSelected(null); setPanel(null); }} onSchedule={openSchedule} onReservations={() => setPanel("reservations")} onAttend={openWalkIn} onTables={canManageTables && room ? () => { closeTableMenu(); setInventoryRoom(room); setInventoryDirty(false); setPanel("inventory"); } : undefined} attendButtonRef={attendButton} readOnly={readOnly} canManageWalkIns={canManageWalkIns} enabled={board?.enabled ?? false} hasBoard={Boolean(board)} assembling={assembling} saving={saving} reservationCount={allocations.length} restaurantId={restaurantId} activePanel={panel} />

    {assembling && <FloorAssemblyControls controller={{ ...assembly, refresh: () => { setOperationError(null); assembly.refresh(); void refresh(); } }} partySize={walkIn.partySize} customerName={walkIn.customerName.trim() || "Sin reserva"} durationMinutes={walkIn.durationMinutes} saving={saving} conflict={assemblyConflict} error={operationError} onConfirm={() => void createWalkIn()} onCancel={cancelAssembly} onEditData={() => setPanel(editingAllocation ? "detail" : "walk-in")} editDataLabel={editingAllocation ? "Ver datos" : undefined} confirmLabel={editingAllocation ? "Guardar armado" : undefined} onTableActions={(id, point) => openTableMenu(`draft:${id}`, point)} onChooseRoom={() => setPanel("rooms")} />}

    <AdminModal open={panel !== null && panel !== "rooms"} title={title} onClose={closePanel}>
      <div ref={panelContent} tabIndex={-1} className="outline-none">
        {panel === "inventory" && inventoryRoom && canManageTables && <FloorInventoryPanel key={inventoryRoom.id} restaurantId={restaurantId} room={inventoryRoom} onDirtyChange={setInventoryDirty} onBusyChange={setSaving} onClose={closePanel} onSaved={(next) => { setBoard((previous) => previous ? { ...previous, rooms: previous.rooms.map((item) => item.id === next.id ? next : item) } : previous); setInventoryDirty(false); setInventoryRoom(null); setPanel(null); }} />}
        {panel === "table" && tableEditor && <FloorTableEditor key={tableEditor.id} table={tableEditor} inventoryEditable={canManageTables} busy={saving || assembly.loading} error={tableError || assembly.error} onApply={(next) => { void applyTable(next); }} onCancel={closePanel} />}
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
        {panel === "schedule" && <form className="space-y-5" onSubmit={applySchedule}><p className="text-sm leading-relaxed text-zinc-600">Consultá el armado del salón para un momento específico. Los horarios corresponden a {board?.timeZone}.</p><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-medium text-zinc-700">Fecha<input type="date" required value={schedule.date} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, date: event.target.value }))} /></label><label className="grid gap-1 text-xs font-medium text-zinc-700">Hora<input type="time" required value={schedule.time} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, time: event.target.value }))} /></label></div>{scheduleError && <p role="alert" className="text-sm text-red-800">{scheduleError}</p>}<div className="flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-5"><button type="button" className={adminSecondaryButtonClass} onClick={() => { setQuery({ date: "", time: "" }); setSelected(null); setPanel(null); }}><Clock size={16} />Volver a ahora</button><button type="submit" className={adminPrimaryButtonClass}>Ver este horario</button></div></form>}

        {panel === "reservations" && <section aria-label="Reservas del salón" className="space-y-4"><p className="text-sm text-zinc-600">{when} · {allocations.length} grupos con mesas asignadas.</p>{!allocations.length ? <p className="py-6 text-sm text-zinc-600">No hay mesas armadas para este horario. Elegí otro momento o atendé una llegada desde el tablero.</p> : allocations.map((allocation) => <AllocationCard key={allocation.id} allocation={allocation} onDetails={() => showDetails(allocation)} onEdit={!assembling && canArrange(allocation) ? () => editAllocation(allocation) : undefined} onRelease={canRelease(allocation) ? () => askRelease(allocation) : undefined} />)}</section>}

        {panel === "detail" && selectedAllocation && <div className="space-y-4">{!currentSelection && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Esta asignación ya no ocupa mesas en el horario consultado.</p>}<AllocationCard allocation={selectedAllocation} onEdit={!assembling && currentSelection && canArrange(currentSelection) ? () => editAllocation(currentSelection) : undefined} onRelease={!assembling && currentSelection && canRelease(currentSelection) ? () => askRelease(currentSelection) : undefined} /><button type="button" className={adminSecondaryButtonClass} onClick={() => setPanel("reservations")}><ArrowLeft size={15} />Ver todas las reservas</button></div>}

        {panel === "release" && <div className="space-y-5"><p className="text-sm leading-relaxed text-zinc-600">¿El grupo {releaseTarget?.customerName} ya se retiró? Sus mesas quedarán disponibles y se conservará el registro de la visita.</p>{operationError && <p role="alert" className="text-sm text-red-800">{operationError}</p>}<div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-5"><button type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={() => setPanel("reservations")}>Cancelar</button><button type="button" disabled={saving} className={adminPrimaryButtonClass} onClick={() => void releaseWalkIn()}>{saving ? "Liberando…" : "Confirmar liberación"}</button></div></div>}

        {panel === "walk-in" && <form className="space-y-5" onSubmit={continueOnBoard}>
          <p className="text-sm leading-relaxed text-zinc-600">Completá los datos del grupo. Después elegís y acomodás sus mesas sobre el tablero principal.</p>
          {operationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{operationError}</p>}
          <label className="grid gap-1 text-xs font-medium text-zinc-700">Nombre del grupo<input value={walkIn.customerName} maxLength={100} placeholder="Sin reserva" className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, customerName: event.target.value }))} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-zinc-700">Personas<input type="number" min={1} max={40} required value={walkIn.partySize} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, partySize: Number(event.target.value) }))} /></label><label className="grid gap-1 text-xs font-medium text-zinc-700">Estadía prevista (minutos)<input type="number" min={15} max={720} step={15} required value={walkIn.durationMinutes} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} /></label></div><label className="grid gap-1 text-xs font-medium text-zinc-700">Notas de atención<textarea maxLength={500} rows={3} value={walkIn.notes} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, notes: event.target.value }))} /></label><p className="text-xs leading-relaxed text-zinc-600">El bloqueo empieza al ocupar las mesas. Podés liberarlas antes cuando el grupo se retire.</p>
          <div className="flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-5"><button type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={assembling ? closePanel : cancelAssembly}>{assembling ? "Volver al tablero" : "Cancelar"}</button><button type="submit" className={adminPrimaryButtonClass}>Elegir mesas<ArrowRight size={16} /></button></div>
        </form>}
      </div>
    </AdminModal>

  </main>;
}

function AllocationCard({ allocation, onDetails, onRelease, onEdit }: { allocation: FloorAllocationView; onDetails?: () => void; onRelease?: () => void; onEdit?: () => void }) {
  return <article className="border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-zinc-950">{allocation.customerName}</h3><p className="mt-1 text-sm text-zinc-700">{allocation.poses.map((pose) => pose.label).join(" + ")} · {allocation.time} hs{allocation.source === "WALK_IN" && " · Sin reserva"}</p></div><span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#eef2e9] px-2 py-1 text-xs font-semibold text-[#2d4628]"><Users size={13} />{allocation.partySize}</span></div>{allocation.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{allocation.notes}</p>}<div className="mt-3 flex flex-wrap gap-3">{onDetails && <button type="button" className={adminSecondaryButtonClass} onClick={onDetails}>Ver detalle</button>}{onEdit && <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}>Editar armado</button>}{onRelease && <button type="button" className={adminSecondaryButtonClass} onClick={onRelease}>Liberar mesas</button>}</div></article>;
}
