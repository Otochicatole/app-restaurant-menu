"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, Clock, List, Loader2, Move, Package, RefreshCw, Users, X } from "lucide-react";
import { AdminModal } from "@/ui/admin/AdminUI";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { useFloatingWindows } from "@/ui/useFloatingWindows";
import { transientButtonProps } from "@/ui/button-state";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";
import styles from "./floor-operations.module.css";
import { calculateFloorInterval, composeRoomPoses, restaurantLocalDateTime, getJoinedTableGroups, validateTableArrangement, validateFloorPlacement, validateRoomLayout, type FloorAllocationView, type FloorAssignmentInput, type FloorBoardView, type FloorLease, type FloorRoom, type FloorTable } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { FloorAssemblyControls } from "./FloorAssemblyControls";
import { FloorBoardToolbar } from "./FloorBoardToolbar";
import { FloorTableContextMenu } from "./FloorTableContextMenu";
import { FloorTableEditor } from "./FloorTableEditor";
import { FloorInventoryPanel } from "./FloorInventoryPanel";
import { FloorTableSummary } from "./FloorTableSummary";
import { summarizeFloorTables } from "./floor-table-summary";
import { defaultLayoutCapacity, separateLayoutTables } from "./floor-table-layout";
import { useFloorAssembly } from "./useFloorAssembly";
import { floorInputClass, getFloorBoard, reassignFloorTables, saveFloorAction, saveFloorTables } from "./floor-api";

type Panel = "rooms" | "schedule" | "reservations" | "walk-in" | "detail" | "release" | "table" | "inventory" | null;
type ToolWindow = { kind: Exclude<Panel, "rooms" | "release" | null> | "assembly"; allocation?: FloorAllocationView; table?: FloorTable; room?: FloorRoom };
const toolId = (tool: ToolWindow) => tool.kind === "detail" ? `detail:${tool.allocation!.id}` : tool.kind === "table" ? `table:${tool.table!.id}` : tool.kind === "inventory" ? `inventory:${tool.room!.id}` : tool.kind;
const toolTitle = (tool: ToolWindow, roomName: string) => tool.kind === "assembly" ? "Armar mesas" : tool.kind === "inventory" ? "Inventario de mesas" : tool.kind === "table" ? `Editar mesa ${tool.table?.label ?? ""}` : tool.kind === "schedule" ? "Fecha y hora" : tool.kind === "reservations" ? `Reservas de ${roomName}` : tool.kind === "walk-in" ? "Atender sin reserva" : "Detalle de la reserva";
const emptyWalkIn = { customerName: "", partySize: 2, notes: "", durationMinutes: 120 };
const floatingButton = "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[var(--floor-ink,#263e23)] shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--floor-focus,#3d5934)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function FloorBoardScreen({ restaurantId, restaurantName, readOnly, canManageWalkIns = false, initialBoard = null }: { restaurantId: string; restaurantName: string; readOnly: boolean; canManageWalkIns?: boolean; initialBoard?: FloorBoardView | null }) {
  const [board, setBoard] = useState<FloorBoardView | null>(initialBoard);
  const [roomId, setRoomId] = useState(() => initialBoard?.rooms.find((room) => room.active)?.id ?? "");
  const [query, setQuery] = useState({ date: "", time: "" });
  const initialQuery = useRef(query);
  const [schedule, setSchedule] = useState({ date: "", time: "" });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const tools = useFloatingWindows<ToolWindow>();
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
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<FloorAllocationView | null>(null);
  const [tableMenu, setTableMenu] = useState<{ id: string; point: { x: number; y: number }; scope?: "table" | "group" } | null>(null);
  const [tableErrors, setTableErrors] = useState<Record<string, string | null>>({});
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[] | null>(null);
  const [movingGroupIds, setMovingGroupIds] = useState<string[]>([]);
  const [inventoryDirty, setInventoryDirty] = useState(false);
  const [dirtyWindows, setDirtyWindows] = useState<Record<string, boolean>>({});
  const currentBoard = useRef(board);
  const pending = useRef<AbortController | null>(null);
  const panelContent = useRef<HTMLDivElement>(null);
  const boardSurface = useRef<HTMLDivElement>(null);
  const attendButton = useRef<HTMLButtonElement>(null);
  const discardWindow = (id: string) => { tools.close(id); setDirtyWindows((current) => ({ ...current, [id]: false })); setTableErrors((current) => current[id] ? { ...current, [id]: null } : current); };
  const openPanel = (next: Panel, value?: ToolWindow) => {
    setPanel(next);
    if (!next || next === "rooms" || next === "release") return;
    const tool = value ?? { kind: next };
    const id = toolId(tool);
    tools.open(id, tool);
    window.requestAnimationFrame(() => document.getElementById(`floor-content-${id}`)?.focus({ preventScroll: true }));
  };
  const changeAssignment = useCallback((value: FloorAssignmentInput | null) => { setAssignment(value); setOperationError(null); }, []);
  const hasPendingInputs = tools.windows.some((entry) => dirtyWindows[entry.id]);
  const hasPendingChanges = inventoryDirty || assembling || hasPendingInputs;
  const assemblyPartySize = editingAllocation?.partySize ?? walkIn.partySize;
  const assemblyDuration = editingAllocation ? Math.max(15, Math.round((Date.parse(editingAllocation.serviceEndAt) - Date.parse(editingAllocation.serviceStartAt)) / 60_000)) : walkIn.durationMinutes;
  const assembly = useFloorAssembly({ restaurantId, active: assembling, partySize: assemblyPartySize, durationMinutes: assemblyDuration, roomId, value: assignment, onChange: changeAssignment, editingAllocation, fallbackRoom: board?.rooms.find((item) => item.id === roomId) });
  useEffect(() => { currentBoard.current = board; }, [board]);
  useEffect(() => {
    if (!hasPendingChanges) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasPendingChanges]);

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

  const room = (assembling ? assembly.room : undefined) ?? board?.rooms.find((item) => item.id === roomId);
  const savedRoom = board?.rooms.find((item) => item.id === roomId);
  const tableCounts = board && savedRoom ? summarizeFloorTables(savedRoom, board.allocations, board.at) : null;
  const allocations = board?.allocations.filter((item) => item.roomId === roomId) ?? [];
  const local = board ? restaurantLocalDateTime(board.timeZone, new Date(board.at)) : { date: "", time: "" };
  const otherAllocations = board?.allocations.filter((item) => item.id !== editingAllocation?.id) ?? [];
  const draft = assembling ? assembly.selected : [];
  const focusedDraftId = draft.some((pose) => pose.tableId === focusedTableId) ? focusedTableId : null;
  const selectionIds = selectedTableIds ? selectedTableIds.filter((id) => draft.some((pose) => pose.tableId === id)) : focusedDraftId ? [focusedDraftId] : draft.map((pose) => pose.tableId);
  const poses = room && board ? composeRoomPoses(room, editingAllocation && draft.length ? otherAllocations : board.allocations, board.at) : [];
  const draftIds = draft.map((pose) => `draft:${pose.tableId}`);
  const tables = [...poses.map((pose) => ({ ...pose, id: pose.tableId, active: true, state: "reserved" as const })),
    ...draft.map((pose) => ({ ...pose, id: `draft:${pose.tableId}`, active: true, state: "selected" as const }))];
  const joinedGroups = [...allocations.filter((allocation) => !editingAllocation || !draft.length || allocation.id !== editingAllocation.id).flatMap((allocation) =>
    getJoinedTableGroups(allocation.poses).filter((group) => group.length > 1).map((group) => ({ id: `${allocation.id}:${group.map((pose) => pose.tableId).sort().join(":")}`, tableIds: group.map((pose) => pose.tableId), label: group.map((pose) => pose.label).join(" + ") }))),
    ...getJoinedTableGroups(draft).filter((group) => group.length > 1).map((group) => ({ id: `draft:${group.map((pose) => pose.tableId).sort().join(":")}`, tableIds: group.map((pose) => `draft:${pose.tableId}`), label: group.map((pose) => pose.label).join(" + ") }))];
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
      : unavailable?.conflict ?? validateTableArrangement(draft) ?? validateFloorPlacement(room, proposal, otherAllocations);
  }
  const currentSelection = selected ? board?.allocations.find((allocation) => allocation.id === selected.id) : null;
  const canRelease = (allocation: FloorAllocationView) => canManageWalkIns && !query.date && allocation.source === "WALK_IN" && !allocation.releasedAt;
  const canManageTables = !readOnly || canManageWalkIns;
  const canArrange = (allocation: FloorAllocationView) => canManageTables && !allocation.releasedAt && Date.parse(allocation.blockedUntil) > Date.parse(board?.updatedAt ?? "");
  const closeTool = (id: string) => {
    if (saving) return;
    if (id.startsWith("inventory:") && inventoryDirty && !window.confirm("Hay cambios de mesas sin guardar. ¿Querés descartarlos?")) return;
    if (id.startsWith("inventory:")) setInventoryDirty(false);
    if (id === "walk-in" && !assembling) { setWalkIn(emptyWalkIn); setWalkInError(null); }
    discardWindow(id);
  };
  const closePanel = () => { if (!saving) setPanel(null); };
  const requestTool = (next: Panel, prepare?: () => void) => { if (!saving) { prepare?.(); openPanel(next); } };
  const openSchedule = () => requestTool("schedule", () => { if (!tools.windows.some((window) => window.id === "schedule")) { setSchedule({ date: query.date || local.date, time: query.time || local.time }); setScheduleError(null); } });
  const showDetails = (allocation: FloorAllocationView) => { if (!saving) { setSelected(allocation); openPanel("detail", { kind: "detail", allocation }); } };
  const askRelease = (allocation: FloorAllocationView) => { setReleaseTarget(allocation); setReleaseError(null); openPanel("release"); };
  const openWalkIn = () => requestTool("walk-in", () => { if (!tools.windows.some((window) => window.id === "walk-in")) setWalkInError(null); });
  const focusAttend = () => { window.requestAnimationFrame(() => attendButton.current?.focus()); };
  const cancelAssembly = () => { if (!editingAllocation) { setWalkIn(emptyWalkIn); discardWindow("walk-in"); } discardWindow("assembly"); tools.windows.filter((window) => window.value.kind === "table").forEach((window) => discardWindow(window.id)); setAssembling(false); setAssignment(null); setEditingAllocation(null); setSelectedTableIds(null); setMovingGroupIds([]); setFocusedTableId(null); setMovingTableId(null); setTableMenu(null); setOperationError(null); setPanel(null); focusAttend(); };
  const continueOnBoard = (event: React.FormEvent) => { event.preventDefault(); if (editingAllocation) { setWalkInError("Terminá o cancelá el armado actual antes de atender otro grupo."); return; } setWalkInError(null); setQuery({ date: "", time: "" }); setAssembling(true); discardWindow("walk-in"); tools.open("assembly", { kind: "assembly" }); setPanel(null); window.requestAnimationFrame(() => boardSurface.current?.focus()); };

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
    setSaving(true); setReleaseError(null);
    try {
      await saveFloorAction(restaurantId, { action: "release-walk-in", reservationId: releaseTarget.reservationId, expectedRevision: releaseTarget.reservationRevision });
      setSelected(null); setReleaseTarget(null); openPanel(null); await refresh();
    } catch (failure) { setReleaseError(failure instanceof Error ? failure.message : "No se pudieron liberar las mesas. Actualizá la sala y volvé a intentar."); }
    finally { setSaving(false); }
  };
  const applySchedule = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (assembling) { setScheduleError("Terminá o cancelá el armado antes de cambiar el horario."); return; }
      calculateFloorInterval({ ...schedule, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" });
      setQuery({ ...schedule }); setScheduleError(null); setSelected(null); discardWindow("schedule"); setPanel(null);
    } catch (failure) { setScheduleError(failure instanceof Error ? failure.message : "Revisá la fecha y hora elegidas."); }
  };

  const closeTableMenu = useCallback(() => setTableMenu(null), []);
  const openTableMenu = (id: string, point: { x: number; y: number }) => {
    if (saving) return;
    setTableMenu({ id, point, scope: "table" }); setMovingTableId(null); setMovingGroupIds([]);
    if (id.startsWith("draft:")) setSelectedTableIds([id.slice(6)]);
    if (id.startsWith("draft:")) setFocusedTableId(id.slice(6));
  };
  const openGroupMenu = (ids: string[], point: { x: number; y: number }) => { if (!ids[0] || saving) return; setTableMenu({ id: ids[0], point, scope: "group" }); setMovingTableId(null); setMovingGroupIds([]); };
  const actOnTable = (action: "edit-group" | "edit" | "rotate" | "move" | "separate" | "move-group" | "rotate-group") => {
    if (!tableMenu || !room || saving) return;
    const isDraft = tableMenu.id.startsWith("draft:");
    const tableId = isDraft ? tableMenu.id.slice(6) : tableMenu.id;
    const allocation = isDraft ? null : allocations.find((item) => item.poses.some((pose) => pose.tableId === tableId));
    if (!isDraft && (!allocation || !canArrange(allocation) || assembling)) return;
    const pose = isDraft ? draft.find((item) => item.tableId === tableId) : allocation?.poses.find((item) => item.tableId === tableId);
    const stock = room.tables.find((item) => item.id === tableId);
    if (!pose || !stock) return;
    const members = getJoinedTableGroups(isDraft ? draft : allocation?.poses ?? []).find((group) => group.some((item) => item.tableId === tableId)) ?? [pose];
    const memberIds = members.map((item) => item.tableId);
    const groupAction = action === "edit-group" || action === "move-group" || action === "rotate-group";
    setTableMenu(null); setSelectedTableIds(groupAction ? memberIds : [tableId]); setFocusedTableId(groupAction ? null : tableId); setOperationError(null);
    if (allocation) {
      let nextPoses = allocation.poses;
      if (action === "rotate-group") {
        const x = members.reduce((sum, item) => sum + item.x, 0) / members.length;
        const y = members.reduce((sum, item) => sum + item.y, 0) / members.length;
        nextPoses = allocation.poses.map((item) => memberIds.includes(item.tableId) ? { ...item, x: x - (item.y - y), y: y + (item.x - x), rotation: ((item.rotation + 90) % 360) as FloorTable["rotation"] } : item);
      } else if (action === "rotate") nextPoses = allocation.poses.map((item) => item.tableId === tableId ? { ...item, rotation: ((item.rotation + 90) % 360) as FloorTable["rotation"] } : item);
      else if (action === "separate") {
        const location = room.locations.find((item) => item.id === allocation.locationId && item.active);
        const result = location ? separateLayoutTables(allocation.poses, [tableId], location) : "Elegí un sector para separar las mesas.";
        if (typeof result === "string") setOperationError(result); else nextPoses = result;
      }
      const customTables = nextPoses.map(({ tableId, x, y, rotation }) => ({ tableId, x, y, rotation }));
      const capacity = allocation.capacity === defaultLayoutCapacity(allocation.poses) ? defaultLayoutCapacity(nextPoses) : allocation.capacity;
      setAssignment({ roomId: room.id, locationId: allocation.locationId ?? undefined, optionId: "custom", customTables, capacity,
        x: customTables.reduce((sum, item) => sum + item.x, 0) / customTables.length, y: customTables.reduce((sum, item) => sum + item.y, 0) / customTables.length,
        rotation: 0, expectedRoomRevision: room.revision, retainExisting: false });
      setEditingAllocation(allocation); setAssembling(true); setSelected(allocation);

    } else if (action === "rotate") assembly.updateTable(tableId, { rotation: ((pose.rotation + 90) % 360) as FloorTable["rotation"] });
    else if (action === "separate") setOperationError(assembly.separateTables([tableId]));
    else if (action === "rotate-group") assembly.rotateTables(memberIds);
    tools.open("assembly", { kind: "assembly" });
    if (action === "edit") { openPanel("table", { kind: "table", table: { ...stock, x: pose.x, y: pose.y, rotation: pose.rotation } }); }
    else { openPanel(null); if (action === "move") setMovingTableId(tableId); if (action === "move-group") setMovingGroupIds(memberIds); window.requestAnimationFrame(() => boardSurface.current?.focus()); }
  };
  const editAllocation = (allocation: FloorAllocationView, sourceWindowId?: string) => {
    if (!canArrange(allocation) || assembling || !allocation.poses.length) return;
    // Open the same table actions used on the canvas, accessible from the list.
    const bounds = (sourceWindowId ? document.getElementById("floor-content-" + sourceWindowId) : panelContent.current)?.getBoundingClientRect();
    openPanel(null); setTableMenu({ id: allocation.poses[0].tableId, point: { x: bounds?.left ?? 16, y: bounds?.top ?? 120 } });
  };
  const applyTable = async (next: FloorTable, original: FloorTable, windowId: string) => {
    const source = room?.tables.find((item) => item.id === next.id);
    if (!room || !source || !assignment || !draft.some((item) => item.tableId === next.id) || saving || assembly.loading) return;
    const setTableError = (message: string | null) => setTableErrors((current) => ({ ...current, [windowId]: message }));
    setTableError(null);
    if ((["label", "shape", "width", "height", "capacity", "active"] as const).some((key) => source[key] !== original[key])) { setTableError("La mesa cambió desde que abriste esta ventana. Cerrala y volvé a abrirla antes de aplicar."); return; }
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
        discardWindow(windowId); assembly.refresh();
      } catch (failure) { setTableError(failure instanceof Error ? failure.message : "No se pudo guardar la mesa. Volvé a intentar."); }
      finally { setSaving(false); }
    } else { assembly.updateTable(next.id, partial); discardWindow(windowId); }
  };
  const tableEditorsOpen = tools.windows.some((entry) => entry.value.kind === "table");
  const assemblyWindow = tools.windows.find((entry) => entry.value.kind === "assembly");
  const menuTable = tables.find((item) => item.id === tableMenu?.id);
  const menuAllocation = tableMenu && !tableMenu.id.startsWith("draft:") ? allocations.find((item) => item.poses.some((pose) => pose.tableId === tableMenu.id)) : null;
  const menuTableId = tableMenu?.id.replace(/^draft:/, "");
  const menuMembers = getJoinedTableGroups(tableMenu?.id.startsWith("draft:") ? draft : menuAllocation?.poses ?? []).find((group) => group.some((pose) => pose.tableId === menuTableId)) ?? [];
  const menuJoined = menuMembers.length > 1;
  const menuDisabled = saving || (tableMenu?.id.startsWith("draft:") ? assembly.loading : !menuAllocation || !canArrange(menuAllocation) || assembling);
  const selectTables = (ids: string[]) => { setSelectedTableIds(ids); setFocusedTableId(null); setMovingTableId(null); setMovingGroupIds([]); };
  const selectTable = (id: string, additive: boolean) => {
    const ids = additive ? selectionIds.includes(id) ? selectionIds.filter((selected) => selected !== id) : [...selectionIds, id]
      : getJoinedTableGroups(draft).find((group) => group.some((pose) => pose.tableId === id))?.map((pose) => pose.tableId) ?? [id];
    selectTables(ids);
  };
  const moveSelection = () => { setMovingTableId(null); setMovingGroupIds(selectionIds); window.requestAnimationFrame(() => boardSurface.current?.focus()); };
  const moveTable = (point: { x: number; y: number }, locationId?: string) => {
    if (movingTableId) { assembly.updateTable(movingTableId, point); setMovingTableId(null); }
    else if (movingGroupIds.length) {
      const moving = draft.filter((pose) => movingGroupIds.includes(pose.tableId));
      if (moving.length) assembly.moveTables(movingGroupIds, point.x - moving.reduce((sum, pose) => sum + pose.x, 0) / moving.length, point.y - moving.reduce((sum, pose) => sum + pose.y, 0) / moving.length);
      setMovingGroupIds([]);
    } else { setFocusedTableId(null); setSelectedTableIds(null); assembly.place(point, locationId); }
  };

  const when = query.date && board ? new Intl.DateTimeFormat("es-AR", { timeZone: board.timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(board.at)) : `Ahora${local.time ? ` · ${local.time}` : ""}`;

  return <main data-admin-panel data-floor-operations className={`${styles.screen} fixed inset-0 isolate h-dvh overflow-hidden`}>
    <h1 className="sr-only">Sala · {restaurantName}</h1>
    <div ref={boardSurface} tabIndex={-1} role="region" aria-label="Tablero principal de sala" className="absolute inset-0 outline-none" onKeyDown={(event) => { if (event.key === "Escape" && (movingTableId || movingGroupIds.length)) { event.preventDefault(); setMovingTableId(null); setMovingGroupIds([]); } }}>
      {room && <FloorCanvas key={room.id} appearance="operational" fullScreen room={room} tables={tables} joinedGroups={joinedGroups} selectedIds={assembling ? selectionIds.map((id) => `draft:${id}`) : currentSelection?.poses.map((pose) => pose.tableId) ?? []} selectedLocationId={assembling ? assembly.locationId : undefined} draggableIds={assembling && !saving && !assembly.loading && !tableEditorsOpen && panel !== "release" ? draftIds : []} onContextMenuTable={openTableMenu} onContextMenuGroup={openGroupMenu} onMove={assembling && !saving && !assembly.loading && !tableEditorsOpen && panel !== "release" ? (ids, delta) => { assembly.moveTables(ids.map((id) => id.replace(/^draft:/, "")), delta.x, delta.y); setMovingTableId(null); setMovingGroupIds([]); } : undefined} onPlace={assembling && !saving && !assembly.loading && !tableEditorsOpen && panel !== "release" ? moveTable : undefined} onSelect={(id, additive) => { if (assembling) { if (id.startsWith("draft:")) selectTable(id.slice(6), additive); return; } const allocation = allocations.find((item) => item.poses.some((pose) => pose.tableId === id)); if (allocation) showDetails(allocation); }} />}
    </div>
    {tableMenu && menuTable && panel !== "release" && <FloorTableContextMenu name={tableMenu.scope === "group" ? menuMembers.map((member) => member.label).join(" + ") : menuTable.label} scope={tableMenu.scope} point={tableMenu.point} disabled={Boolean(menuDisabled)} reason={menuDisabled && !saving ? assembling && menuAllocation ? "Terminá el armado actual antes de modificar otro grupo." : "Esta asignación ya no está vigente o no tenés permiso para modificar mesas." : undefined} onEdit={() => actOnTable("edit")} onEditGroup={() => actOnTable("edit-group")} onRotate={() => actOnTable("rotate")} onMove={() => actOnTable("move")} onSeparate={menuJoined ? () => actOnTable("separate") : undefined} onMoveGroup={menuJoined ? () => actOnTable("move-group") : undefined} onRotateGroup={menuJoined ? () => actOnTable("rotate-group") : undefined} onClose={closeTableMenu} />}
    {(movingTableId || movingGroupIds.length > 0) && !panel && <div role="status" className="absolute bottom-24 left-1/2 z-30 flex max-w-[calc(100%_-_2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-[var(--floor-action,#182618)] p-3 text-sm text-white shadow-lg"><Move size={18} className="shrink-0" /><span>{movingTableId ? `Elegí el destino de la mesa ${draft.find((item) => item.tableId === movingTableId)?.label} o arrastrala.` : "Elegí el destino del grupo o arrastralo."}</span><button {...transientButtonProps} type="button" aria-label="Cancelar movimiento" onClick={() => { setMovingTableId(null); setMovingGroupIds([]); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2"><X size={18} /></button></div>}
    {!room && <div className="absolute inset-0 grid place-items-center p-8"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{board ? "No hay salones activos" : "Preparando la sala…"}</h2><p className="mt-2 text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">{board ? "Usá la botonera para administrar los salones o volvé a actualizar." : "Cargando sectores y mesas asignadas."}</p></div></div>}

    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-start justify-between gap-3 px-4 sm:px-6">
      <div aria-label="Salón actual" className="min-w-0 rounded-xl bg-white px-3 py-2 text-[var(--floor-ink,#263e23)] shadow-[0_3px_16px_rgba(24,38,24,0.12)]">
        <span className="block max-w-[60vw] truncate text-[11px] text-[var(--floor-muted,#52634b)] sm:max-w-72">{restaurantName}</span><span className="block max-w-[60vw] truncate text-sm font-semibold sm:max-w-72">{room?.name ?? "Elegir salón"}</span>
      </div>
      <button {...transientButtonProps} type="button" aria-label="Actualizar" title="Actualizar sala" disabled={loading} onClick={() => { setOperationError(null); void refresh(); if (assembling) assembly.refresh(); }} className={`${floatingButton} pointer-events-auto h-12 w-12 shrink-0 px-0`}>{loading ? <Loader2 size={19} className="animate-spin" /> : <RefreshCw size={19} />}</button>
    </header>

    <div className="pointer-events-none absolute left-4 right-4 top-[calc(max(1rem,env(safe-area-inset-top))+4rem)] z-10 max-w-lg space-y-2 sm:left-6">
      <div className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]"><span className="font-semibold">{when}</span><span className="ml-2 text-[var(--floor-muted,#52634b)]" role="status">{refreshedAt ? `Actualizado ${new Intl.DateTimeFormat("es-AR", { timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(refreshedAt)}` : "Consultando…"}</span></div>
      {tableCounts && <FloorTableSummary counts={tableCounts} />}
      {error && (!panel || panel === "rooms") && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
      {board && !board.enabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">La asignación de mesas todavía no está activada.</p>}
    </div>

    <FloorBoardToolbar rooms={board?.rooms ?? []} roomId={roomId} roomsOpen={panel === "rooms"} onRoomsOpenChange={(open) => { if (open) { closeTableMenu(); setMovingTableId(null); setMovingGroupIds([]); setPanel("rooms"); } else if (panel === "rooms") setPanel(null); }} onSelectRoom={(id) => { if (id !== roomId) { if (hasPendingChanges && !window.confirm("Hay cambios sin guardar en las ventanas o en el armado. ¿Querés descartarlos y cambiar de salón?")) return; tools.clear(); if (assembling) tools.open("assembly", { kind: "assembly" }); else { setWalkIn(emptyWalkIn); setWalkInError(null); } setDirtyWindows({}); setTableErrors({}); setInventoryDirty(false); changeAssignment(null); setSelectedTableIds(null); setFocusedTableId(null); setMovingTableId(null); setMovingGroupIds([]); } setRoomId(id); setSelected(null); openPanel(null); }} onSchedule={openSchedule} onReservations={() => requestTool("reservations")} onAttend={openWalkIn} onTables={canManageTables && savedRoom ? () => { closeTableMenu(); openPanel("inventory", { kind: "inventory", room: savedRoom }); } : undefined} attendButtonRef={attendButton} readOnly={readOnly} canManageWalkIns={canManageWalkIns} enabled={board?.enabled ?? false} hasBoard={Boolean(board)} assembling={assembling} saving={saving} reservationCount={allocations.length} restaurantId={restaurantId} openPanels={tools.windows.filter((entry) => entry.visible).map((entry) => entry.value.kind)} hasPendingChanges={hasPendingChanges} />

    {assembling && assemblyWindow && <FloorAssemblyControls controller={{ ...assembly, refresh: () => { setOperationError(null); assembly.refresh(); void refresh(); } }} partySize={assemblyPartySize} customerName={editingAllocation?.customerName ?? (walkIn.customerName.trim() || "Sin reserva")} durationMinutes={assemblyDuration} saving={saving} interactionLocked={tableEditorsOpen} floatingWindow={{ visible: assemblyWindow.visible, zIndex: assemblyWindow.zIndex, offset: assemblyWindow.offset, activation: assemblyWindow.activation, onFocus: () => tools.focus(assemblyWindow.id), onHide: () => discardWindow(assemblyWindow.id) }} conflict={assemblyConflict} error={operationError} selectedTableIds={selectionIds} onSelectTable={selectTable} onSelectTableGroup={selectTables} onJoinTables={() => setOperationError(assembly.joinTables(selectionIds))} onSeparateTables={() => setOperationError(assembly.separateTables(selectionIds))} onMoveTableGroup={moveSelection} onRotateTableGroup={() => assembly.rotateTables(selectionIds)} onConfirm={() => void createWalkIn()} onCancel={cancelAssembly} onEditData={() => editingAllocation ? showDetails(editingAllocation) : openWalkIn()} editDataLabel={editingAllocation ? "Ver datos" : undefined} confirmLabel={editingAllocation ? "Guardar armado" : undefined} onTableActions={(id, point) => openTableMenu(`draft:${id}`, point)} onGroupActions={(ids, point) => openGroupMenu(ids.map((id) => "draft:" + id), point)} onChooseRoom={() => openPanel("rooms")} />}

    {tools.windows.filter((entry) => entry.value.kind !== "assembly").map((entry) => {
      const panel = entry.value.kind;
      const title = toolTitle(entry.value, room?.name ?? "la sala");
      const tableEditor = entry.value.table ?? null;
      const inventoryRoom = entry.value.room ?? null;
      const currentSelection = entry.value.allocation ? board?.allocations.find((allocation) => allocation.id === entry.value.allocation!.id) : null;
      const selectedAllocation = currentSelection ?? entry.value.allocation;
      const tableError = tableErrors[entry.id];
      const closePanel = () => closeTool(entry.id);
      return (
    <FloatingModalWindow key={entry.id} id={"floor-tools-" + entry.id} title={title} subtitle={room?.name ?? restaurantName} icon={panel === "inventory" ? <Package size={17} /> : panel === "schedule" ? <CalendarClock size={17} /> : panel === "walk-in" ? <Users size={17} /> : <List size={17} />} isOpen={entry.visible} keepMounted onClose={() => closeTool(entry.id)} closeDisabled={saving} initialAnchor="right" initialOffset={entry.offset} activation={entry.activation} viewportInset={{ bottom: 100 }} initialPosition={{ x: 0, y: 112 }} initialSize={{ width: 400, height: 620 }} minWidth={320} minHeight={320} zIndex={entry.zIndex} onFocus={() => { tools.focus(entry.id); if (entry.value.table) setFocusedTableId(entry.value.table.id); if (entry.value.allocation) setSelected(entry.value.allocation); }}>
      <div id={"floor-content-" + entry.id} ref={panelContent} tabIndex={-1} onChangeCapture={() => setDirtyWindows((current) => current[entry.id] ? current : { ...current, [entry.id]: true })} className="flex min-h-0 flex-1 flex-col outline-none">
        {panel === "inventory" && inventoryRoom && canManageTables && <FloorInventoryPanel key={inventoryRoom.id} restaurantId={restaurantId} room={inventoryRoom} onDirtyChange={setInventoryDirty} onBusyChange={setSaving} onClose={closePanel} onSaved={(next) => { setBoard((previous) => previous ? { ...previous, rooms: previous.rooms.map((item) => item.id === next.id ? next : item) } : previous); setInventoryDirty(false); discardWindow(entry.id); }} />}
        {panel === "table" && tableEditor && <FloorTableEditor key={tableEditor.id} table={tableEditor} inventoryEditable={canManageTables} busy={saving || assembly.loading} error={tableError || assembly.error} onApply={(next) => { void applyTable(next, tableEditor, entry.id); }} onCancel={closePanel} />}
        {error && <p role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
        {panel === "schedule" && <form className="flex min-h-0 flex-1 flex-col" onSubmit={applySchedule}><div className={floorWindowBodyClass}><p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">Consultá el armado del salón para un momento específico. Los horarios corresponden a {board?.timeZone}.</p><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Fecha<input type="date" required value={schedule.date} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, date: event.target.value }))} /></label><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Hora<input type="time" required value={schedule.time} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, time: event.target.value }))} /></label></div>{scheduleError && <p role="alert" className="text-sm text-red-800">{scheduleError}</p>}</div><footer className={`${floorWindowFooterClass} flex flex-wrap justify-between gap-2`}><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={() => { setQuery({ date: "", time: "" }); setSelected(null); discardWindow(entry.id); setPanel(null); }}><Clock size={16} />Volver a ahora</button><button {...transientButtonProps} type="submit" className={adminPrimaryButtonClass}>Ver este horario</button></footer></form>}

        {panel === "reservations" && <section aria-label="Reservas del salón" className={floorWindowBodyClass}><p className="text-sm text-[var(--floor-muted,#52525b)]">{when} · {allocations.length} grupos con mesas asignadas.</p>{!allocations.length ? <p className="py-6 text-sm text-[var(--floor-muted,#52525b)]">No hay mesas armadas para este horario. Elegí otro momento o atendé una llegada desde el tablero.</p> : allocations.map((allocation) => <AllocationCard key={allocation.id} allocation={allocation} onDetails={() => showDetails(allocation)} onEdit={!assembling && canArrange(allocation) ? () => editAllocation(allocation, entry.id) : undefined} onRelease={canRelease(allocation) ? () => askRelease(allocation) : undefined} />)}</section>}

        {panel === "detail" && selectedAllocation && <div className="flex min-h-0 flex-1 flex-col"><div className={floorWindowBodyClass}>{!currentSelection && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Esta asignación ya no ocupa mesas en el horario consultado.</p>}<AllocationCard allocation={selectedAllocation} onEdit={!assembling && currentSelection && canArrange(currentSelection) ? () => editAllocation(currentSelection, entry.id) : undefined} onRelease={!assembling && currentSelection && canRelease(currentSelection) ? () => askRelease(currentSelection) : undefined} /></div><footer className={floorWindowFooterClass}><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={() => openPanel("reservations")}><ArrowLeft size={15} />Ver todas las reservas</button></footer></div>}


        {panel === "walk-in" && <form className="flex min-h-0 flex-1 flex-col" onSubmit={continueOnBoard}><div className={floorWindowBodyClass}>
          <p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">Completá los datos del grupo. Después elegís y acomodás sus mesas sobre el tablero principal.</p>
          {walkInError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{walkInError}</p>}
          <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Nombre del grupo<input value={walkIn.customerName} maxLength={100} placeholder="Sin reserva" className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, customerName: event.target.value }))} /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Personas<input type="number" min={1} max={40} required value={walkIn.partySize} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, partySize: Number(event.target.value) }))} /></label><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Estadía prevista (minutos)<input type="number" min={15} max={720} step={15} required value={walkIn.durationMinutes} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} /></label></div><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Notas de atención<textarea maxLength={500} rows={3} value={walkIn.notes} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, notes: event.target.value }))} /></label><p className="text-xs leading-relaxed text-[var(--floor-muted,#52525b)]">El bloqueo empieza al ocupar las mesas. Podés liberarlas antes cuando el grupo se retire.</p>
          </div><footer className={`${floorWindowFooterClass} flex flex-wrap justify-between gap-2`}><button {...transientButtonProps} type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={() => { if (!assembling || editingAllocation) setWalkIn(emptyWalkIn); closePanel(); }}>{assembling ? "Volver al tablero" : "Cancelar"}</button><button {...transientButtonProps} type="submit" className={adminPrimaryButtonClass}>Elegir mesas<ArrowRight size={16} /></button></footer>
        </form>}
      </div>
    </FloatingModalWindow>
      );
    })}
    <AdminModal open={panel === "release"} title="Liberar mesas" onClose={closePanel}>
        {panel === "release" && <div className="space-y-5"><p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">¿El grupo {releaseTarget?.customerName} ya se retiró? Sus mesas quedarán disponibles y se conservará el registro de la visita.</p>{releaseError && <p role="alert" className="text-sm text-red-800">{releaseError}</p>}<div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-5"><button {...transientButtonProps} type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={() => openPanel("reservations")}>Cancelar</button><button {...transientButtonProps} type="button" disabled={saving} className={adminPrimaryButtonClass} onClick={() => void releaseWalkIn()}>{saving ? "Liberando…" : "Confirmar liberación"}</button></div></div>}
    </AdminModal>

  </main>;
}

function AllocationCard({ allocation, onDetails, onRelease, onEdit }: { allocation: FloorAllocationView; onDetails?: () => void; onRelease?: () => void; onEdit?: () => void }) {
  return <article className="border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--floor-ink,#09090b)]">{allocation.customerName}</h3><p className="mt-1 text-sm text-[var(--floor-muted,#3f3f46)]">{allocation.poses.map((pose) => pose.label).join(" + ")} · {allocation.time} hs{allocation.source === "WALK_IN" && " · Sin reserva"}</p></div><span className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--floor-hover,#eef2e9)] px-2 py-1 text-xs font-semibold text-[var(--floor-action,#2d4628)]"><Users size={13} />{allocation.partySize}</span></div>{allocation.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">{allocation.notes}</p>}<div className="mt-3 flex flex-wrap gap-3">{onDetails && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onDetails}>Ver detalle</button>}{onEdit && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onEdit}>Editar armado</button>}{onRelease && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onRelease}>Liberar mesas</button>}</div></article>;
}
