"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, Clock, List, Loader2, Package, ReceiptText, RefreshCw, Users } from "lucide-react";
import { AdminModal } from "@/ui/admin/AdminUI";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { emptyWalkIn, floorBoardReceived, floorBoardSeed, floorBoardWorkspace, floorAssignmentChanged, type Panel, type SelectionSnapshot, type ToolWindow } from "./floor-workspaces";
import { useFloatingWindows } from "@/ui/useFloatingWindows";
import { transientButtonProps } from "@/ui/button-state";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";
import styles from "./floor-operations.module.css";
import { calculateFloorInterval, composeRoomPoses, restaurantLocalDateTime, getJoinedTableGroups, validateTableArrangement, validateFloorPlacement, validateRoomLayout, type FloorAllocationView, type FloorAssignmentInput, type FloorBoardView, type FloorLease, type FloorPose, type FloorTable } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { FloorAssemblyControls } from "./FloorAssemblyControls";
import { FloorBoardToolbar } from "./FloorBoardToolbar";
import { FloorTableContextMenu } from "./FloorTableContextMenu";
import { FloorSelectionEditor, type FloorSelectionEditorMode } from "./FloorSelectionEditor";
import { buildSelectionLayout, canSeparateFloorSelection, contextFloorSelection, resolveFloorSelection, separateFloorSelection, type FloorSelectionLayout, type FloorSelectionState } from "./floor-selection";
import { FloorInventoryPanel } from "./FloorInventoryPanel";
import { FloorTableSummary } from "./FloorTableSummary";
import { FloorServiceAccounts, FloorServiceWindow, type FloorServiceTarget } from "./FloorServiceWindow";
import { useFloorService, type FloorServiceCommand } from "./useFloorService";
import { summarizeFloorTables } from "./floor-table-summary";
import { useFloorAssembly } from "./useFloorAssembly";
import { floorInputClass, getFloorBoard, reassignFloorSelection, saveFloorAction, saveFloorTables } from "./floor-api";

const toolId = (tool: ToolWindow) => tool.kind === "service" ? `service:${tool.serviceTarget!.allocationId}:${tool.serviceTarget!.tableId}` : tool.kind === "detail" ? `detail:${tool.allocation!.id}` : tool.kind === "table" ? "selection:" + tool.selection!.ids.slice().sort().map(encodeURIComponent).join("+") : tool.kind === "inventory" ? `inventory:${tool.room!.id}` : tool.kind;
const toolTitle = (tool: ToolWindow, roomName: string) => tool.kind === "service" ? `Cuenta · ${tool.serviceTarget!.customerName}` : tool.kind === "service-list" ? "Cuentas de servicio" : tool.kind === "assembly" ? "Armar mesas" : tool.kind === "inventory" ? "Inventario de mesas" : tool.kind === "table" ? (tool.selection?.tables.length === 1 ? "Editar mesa " + tool.selection.tables[0].label : "Editar selección (" + (tool.selection?.tables.length ?? 0) + " mesas)") : tool.kind === "schedule" ? "Fecha y hora" : tool.kind === "reservations" ? `Reservas de ${roomName}` : tool.kind === "walk-in" ? "Atender sin reserva" : "Detalle de la reserva";
const floorToolWindowSize = { width: 800, height: 1240 };
const floorAssemblyWindowLayout = { initialSize: { width: 800, height: 1280 } };
const floatingButton = "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[var(--floor-ink,#263e23)] shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--floor-focus,#3d5934)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function serviceTarget(allocation: FloorAllocationView, group: FloorPose[]): FloorServiceTarget {
  return { allocationId: allocation.id, customerName: allocation.customerName, reservationCode: allocation.code,
    tableLabels: group.map(({ label }) => label), tableId: group.map(({ tableId }) => tableId).sort()[0] };
}

type FloorBoardProps = { restaurantId: string; restaurantName: string; readOnly: boolean; canManageWalkIns?: boolean; initialBoard?: FloorBoardView | null };

export function FloorBoardScreen(props: FloorBoardProps) {
  const { restaurantId, readOnly, canManageWalkIns = false, initialBoard = null } = props;
  return (
    <floorBoardWorkspace.Provider key={restaurantId + ":" + readOnly + ":" + canManageWalkIns} seed={floorBoardSeed(initialBoard)}>
      <FloorBoardContent {...props} />
    </floorBoardWorkspace.Provider>
  );
}

function FloorBoardContent({ restaurantId, restaurantName, readOnly, canManageWalkIns = false, initialBoard = null }: FloorBoardProps) {
  const store = floorBoardWorkspace.useStore();
  const [board, setBoard] = floorBoardWorkspace.useField("board");
  const [roomId, setRoomId] = floorBoardWorkspace.useField("roomId");
  const [query, setQuery] = floorBoardWorkspace.useField("query");
  const initialQuery = useRef(query);
  const [schedule, setSchedule] = useState({ date: "", time: "" });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const tools = useFloatingWindows(floorBoardWorkspace.useField("windows"));
  const [error] = floorBoardWorkspace.useField("error");
  const [loading] = floorBoardWorkspace.useField("loading");
  const [releaseTarget, setReleaseTarget] = useState<FloorAllocationView | null>(null);
  const [refreshedAt] = floorBoardWorkspace.useField("refreshedAt");
  const [assembling, setAssembling] = floorBoardWorkspace.useField("assembling");
  const [walkIn, setWalkIn] = floorBoardWorkspace.useField("walkIn");
  const [assignment] = floorBoardWorkspace.useField("assignment");
  const [floorSaving, setSaving] = floorBoardWorkspace.useField("saving");
  const [operationError, setOperationError] = floorBoardWorkspace.useField("operationError");
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [tableMenu, setTableMenu] = useState<{ ids: string[]; point: { x: number; y: number } } | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = floorBoardWorkspace.useField("selectedResourceIds");
  const [interactionMode, setInteractionMode] = floorBoardWorkspace.useField("interactionMode");
  const [layoutPreview, setLayoutPreview] = floorBoardWorkspace.useField("layoutPreview");
  const [tableErrors, setTableErrors] = useState<Record<string, string | null>>({});
  const [inventoryDirty, setInventoryDirty] = floorBoardWorkspace.useField("inventoryDirty");
  const [dirtyWindows, setDirtyWindows] = floorBoardWorkspace.useField("dirtyWindows");
  const canManageTables = !readOnly || canManageWalkIns;
  const canUseService = Boolean(board?.enabled && canManageTables);
  const historical = Boolean(query.date);
  const serviceTime = historical ? calculateFloorInterval({ ...query, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" }).serviceStartAt : undefined;
  const service = useFloorService(restaurantId, canUseService && (interactionMode === "service" || tools.windows.some((entry) => entry.value.kind === "service" || entry.value.kind === "service-list")), serviceTime);
  const serviceAccounts = service.snapshot?.accounts ?? [];
  const serviceLoading = !service.snapshot && !service.error;
  const saving = floorSaving || service.busy;
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
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
  const changeAssignment = useCallback((value: FloorAssignmentInput | null) => {
    store.dispatch(floorAssignmentChanged(value));
  }, [store]);
  const hasPendingInputs = tools.windows.some((entry) => dirtyWindows[entry.id]);
  const hasPendingChanges = inventoryDirty || assembling || hasPendingInputs;
  const assemblyPartySize = walkIn.partySize;
  const assemblyDuration = walkIn.durationMinutes;
  const assembly = useFloorAssembly({ restaurantId, active: assembling, partySize: assemblyPartySize, durationMinutes: assemblyDuration, roomId, value: assignment, onChange: changeAssignment, fallbackRoom: board?.rooms.find((item) => item.id === roomId) });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!hasPendingChanges) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasPendingChanges]);

  const beginMutation = () => {
    if (store.getState().saving) return false;
    pending.current?.abort();
    store.dispatch(floorBoardWorkspace.changed({ loading: false, saving: true }));
    return true;
  };

  const inventoryBusyChanged = (busy: boolean) => {
    if (busy) beginMutation();
    else setSaving(false);
  };

  const refresh = useCallback(async (afterMutation = false) => {
    const snapshot = store.getState();
    if (!mounted.current || (snapshot.saving && !afterMutation)) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    store.dispatch(floorBoardWorkspace.changed({ loading: true }));
    const isCurrent = () => !controller.signal.aborted && store.getState().query === snapshot.query;
    try {
      const timeZone = snapshot.board?.timeZone ?? "America/Argentina/Buenos_Aires";
      const { query } = snapshot;
      const at = query.date ? calculateFloorInterval({ date: query.date, time: query.time || "20:00", timeZone }).serviceStartAt : new Date().toISOString();
      const next = query.date ? await getFloorBoard(restaurantId, at, controller.signal) : await getFloorBoard(restaurantId, at, controller.signal, true);
      if (isCurrent()) store.dispatch(floorBoardReceived({ board: next, refreshedAt: new Date().toISOString() }));
    } catch (failure) {
      if (isCurrent()) store.dispatch(floorBoardWorkspace.changed({ error: failure instanceof Error ? failure.message : "No se pudo actualizar la sala." }));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!controller.signal.aborted) store.dispatch(floorBoardWorkspace.changed({ loading: false }));
      }
    }
  }, [restaurantId, store]);

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
  const otherAllocations = board?.allocations ?? [];
  const draft = assembling ? assembly.selected : [];
  const poses = room && board ? composeRoomPoses(room, board.allocations, board.at) : [];
  const baseTables = [...poses.map((pose) => ({ ...pose, id: pose.tableId, active: true, state: "reserved" as const })), ...draft.map((pose) => ({ ...pose, id: "draft:" + pose.tableId, active: true, state: "available" as const }))];
  const tables = baseTables.map((table) => layoutPreview?.[table.id] ? { ...table, ...layoutPreview[table.id] } : table);
  const selectionState: FloorSelectionState | null = room ? { room, allocations: board?.allocations ?? [], draft: assembling && assembly.options ? { poses: draft, interval: assembly.options.interval, capacity: assembly.capacity, locationId: assembly.locationId || undefined } : null } : null;
  const availableIds = selectionState ? resolveFloorSelection(selectionState, baseTables.map((table) => table.id)).map((item) => item.resourceId) : [];
  const selection = selectedResourceIds.filter((id) => availableIds.includes(id));
  const draftOnlySelection = selection.length > 0 && selection.every((id) => id.startsWith("draft:"));
  const selectionIds = selection.filter((id) => id.startsWith("draft:")).map((id) => id.slice(6));
  const joinedGroups = [...allocations.flatMap((allocation) =>
    getJoinedTableGroups(allocation.poses).filter((group) => group.length > 1).map((group) => ({ id: `${allocation.id}:${group.map((pose) => pose.tableId).sort().join(":")}`, tableIds: group.map((pose) => pose.tableId), label: group.map((pose) => pose.label).join(" + ") }))),
    ...getJoinedTableGroups(draft).filter((group) => group.length > 1).map((group) => ({ id: `draft:${group.map((pose) => pose.tableId).sort().join(":")}`, tableIds: group.map((pose) => `draft:${pose.tableId}`), label: group.map((pose) => pose.label).join(" + ") }))];
  let assemblyConflict: string | null = null;
  if (assembling && assignment && room && assembly.options && draft.length) {
    const unavailable = assembly.options.options.find((option) => option.roomId === room.id && option.id.startsWith("table:") && !(option.resourceAvailable ?? option.available) && draft.some((pose) => option.id === `table:${pose.tableId}`));
    const proposal: FloorLease = { ...assembly.options.interval, id: "draft", reservationId: "draft", roomId: room.id, locationId: assignment.locationId, poses: draft, releasedAt: null };
    const inventoryChanged = draft.some((pose) => !room.tables.some((table) => table.id === pose.tableId && table.active) || !assembly.options!.options.some((option) => option.roomId === room.id && option.id === `table:${pose.tableId}`));
    assemblyConflict = assignment.expectedRoomRevision !== room.revision ? "El salón cambió. Volvé a elegir las mesas para actualizar el armado."
      : inventoryChanged ? "El inventario cambió. Elegí las mesas del armado nuevamente."
      : unavailable?.conflict ?? validateTableArrangement(draft) ?? validateFloorPlacement(room, proposal, otherAllocations);
  }
  const canRelease = (allocation: FloorAllocationView) => canManageWalkIns && !query.date && allocation.source === "WALK_IN" && !allocation.releasedAt
    && !allocation.serviceOverrun && !allocation.servicePartiallyReleased && !serviceAccounts.some((account) => account.allocationId === allocation.id && !account.closedAt);
  const canArrange = (allocation: FloorAllocationView) => canManageTables && !allocation.releasedAt && !allocation.serviceConflict
    && ((!historical && allocation.serviceOverrun) || Date.parse(allocation.blockedUntil) > Date.parse(board?.updatedAt ?? ""));
  const closeTool = (id: string) => {
    if (saving) return;
    if (id.startsWith("inventory:") && inventoryDirty && !window.confirm("Hay cambios de mesas sin guardar. ¿Querés descartarlos?")) return;
    if (id.startsWith("service:") && dirtyWindows[id] && !window.confirm("Hay datos de esta cuenta sin guardar. ¿Querés descartarlos?")) return;
    if (id.startsWith("inventory:")) setInventoryDirty(false);
    if (id === "walk-in" && !assembling) { setWalkIn(emptyWalkIn); setWalkInError(null); }
    discardWindow(id);
  };
  const closePanel = () => { if (!saving) setPanel(null); };
  const requestTool = (next: Panel, prepare?: () => void) => { if (!saving) { prepare?.(); openPanel(next); } };
  const openSchedule = () => requestTool("schedule", () => { if (!tools.windows.some((window) => window.id === "schedule")) { setSchedule({ date: query.date || local.date, time: query.time || local.time }); setScheduleError(null); } });
  const showDetails = (allocation: FloorAllocationView) => { if (!saving) { openPanel("detail", { kind: "detail", allocation }); } };
  const openServiceWindow = (target: FloorServiceTarget) => {
    if (!canUseService || saving) return;
    closeTableMenu();
    setInteractionMode("service");
    openPanel("service", { kind: "service", serviceTarget: target });
  };
  const serviceTargets = (allocation: FloorAllocationView) => getJoinedTableGroups(allocation.poses).map((group) => serviceTarget(allocation, group));
  const showServiceAtTable = (tableId: string) => {
    const matching = allocations.filter((allocation) => allocation.poses.some((pose) => pose.tableId === tableId));
    const allocation = matching.find((candidate) => !candidate.serviceConflict) ?? matching[0];
    if (!allocation) return;
    const group = getJoinedTableGroups(allocation.poses).find((poses) => poses.some((pose) => pose.tableId === tableId));
    if (!group) return;
    openServiceWindow(serviceTarget(allocation, group));
  };
  const runServiceCommand = async (command: FloorServiceCommand) => {
    try { return await service.mutate(command); }
    finally { if (command.action === "open" || command.action === "checkout" || command.action === "close-empty") void refresh(); }
  };
  const askRelease = (allocation: FloorAllocationView) => { setReleaseTarget(allocation); setReleaseError(null); openPanel("release"); };
  const openWalkIn = () => requestTool("walk-in", () => { if (!tools.windows.some((window) => window.id === "walk-in")) setWalkInError(null); });
  const focusAttend = () => { window.requestAnimationFrame(() => attendButton.current?.focus()); };
  const cancelAssembly = () => { setWalkIn(emptyWalkIn); discardWindow("walk-in"); discardWindow("assembly"); tools.windows.filter((window) => window.value.selection?.ids.some((id) => id.startsWith("draft:"))).forEach((window) => discardWindow(window.id)); setAssembling(false); changeAssignment(null); setSelectedResourceIds((current) => current.filter((id) => !id.startsWith("draft:"))); setTableMenu(null); setOperationError(null); setPanel(null); focusAttend(); };
  const continueOnBoard = (event: React.FormEvent) => { event.preventDefault(); setWalkInError(null); setQuery({ date: "", time: "" }); setAssembling(true); setSelectedResourceIds([]); discardWindow("walk-in"); tools.open("assembly", { kind: "assembly" }); setPanel(null); window.requestAnimationFrame(() => boardSurface.current?.focus()); };

  const createWalkIn = async () => {
    if (!assignment || !assembly.options || assemblyConflict || assembly.loading || assembly.error || assembly.capacity < walkIn.partySize) return;
    if (!beginMutation()) return;
    setOperationError(null);
    try {
      await saveFloorAction(restaurantId, { action: "walk-in", ...walkIn, customerName: walkIn.customerName.trim() || "Sin reserva",
        assignment: assignment.optionId === "custom" ? { ...assignment, capacity: assembly.capacity } : assignment });
      cancelAssembly();
      void refresh(true);
    } catch (failure) { setOperationError(failure instanceof Error ? failure.message : "No se pudo armar la mesa. Volvé a consultar disponibilidad."); }
    finally { setSaving(false); }
  };
  const releaseWalkIn = async () => {
    if (!releaseTarget || !beginMutation()) return;
    setReleaseError(null);
    try {
      await saveFloorAction(restaurantId, { action: "release-walk-in", reservationId: releaseTarget.reservationId, expectedRevision: releaseTarget.reservationRevision });
      setReleaseTarget(null); openPanel(null); await refresh(true);
    } catch (failure) { setReleaseError(failure instanceof Error ? failure.message : "No se pudieron liberar las mesas. Actualizá la sala y volvé a intentar."); }
    finally { setSaving(false); }
  };
  const applySchedule = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (assembling) { setScheduleError("Terminá o cancelá el armado antes de cambiar el horario."); return; }
      calculateFloorInterval({ ...schedule, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" });
      setQuery({ ...schedule }); setScheduleError(null); discardWindow("schedule"); setPanel(null);
    } catch (failure) { setScheduleError(failure instanceof Error ? failure.message : "Revisá la fecha y hora elegidas."); }
  };

  const closeTableMenu = useCallback(() => setTableMenu(null), []);
  const selectTables = (ids: string[], additive = false) => {
    if (saving) return;
    const chosen = [...new Set(ids)].filter((id) => availableIds.includes(id));
    setSelectedResourceIds((current) => additive ? [...new Set([...current, ...chosen])] : chosen);
    setTableMenu(null);
  };
  const selectTable = (id: string, additive: boolean) => {
    if (saving || !availableIds.includes(id)) return;
    setSelectedResourceIds((current) => additive ? current.includes(id) ? current.filter((item) => item !== id) : [...current, id] : [id]);
    setTableMenu(null);
  };
  const clearSelection = () => { setSelectedResourceIds([]); setTableMenu(null); };
  const openContext = (hit: string[], point: { x: number; y: number }) => {
    if (saving || interactionMode === "service") return;
    const ids = contextFloorSelection(selection, interactionMode === "pan" ? [] : hit, availableIds);
    if (!ids.length) { setTableMenu(null); return; }
    setSelectedResourceIds(ids); setTableMenu({ ids, point }); setOperationError(null);
  };
  const openTableMenu = (id: string, point: { x: number; y: number }) => openContext([id], point);
  const openGroupMenu = (ids: string[], point: { x: number; y: number }) => openContext(ids, point);
  const sourceStamp = (ids: string[]) => selectionState ? JSON.stringify(resolveFloorSelection(selectionState, ids).map((item) => ({ resourceId: item.resourceId, table: item.table, version: item.allocation?.version, revision: item.allocation?.reservationRevision }))) : "";
  const editableResources = (ids: string[]) => {
    if (!selectionState || !canManageTables || !ids.length) return false;
    const resources = resolveFloorSelection(selectionState, ids);
    return resources.length === ids.length && resources.every((item) => item.allocation ? canArrange(item.allocation) : !assembly.loading);
  };
  const openSelectionEditor = (ids = selection) => {
    if (saving || !selectionState || !editableResources(ids)) { setOperationError("La selección ya no se puede modificar. Actualizá la sala y volvé a seleccionar las mesas."); return; }
    const selected = resolveFloorSelection(selectionState, ids);
    const snapshot: SelectionSnapshot = { ids: selected.map((item) => item.resourceId), tables: selected.map((item) => item.table), stamp: sourceStamp(ids), roomId: roomId };
    setSelectedResourceIds(snapshot.ids); setTableMenu(null);
    openPanel("table", { kind: "table", selection: snapshot });
  };
  const applyDraftLayout = (next: NonNullable<FloorSelectionLayout["draft"]>) => {
    if (!assignment) return;
    const customTables = next.poses.map(({ tableId, x, y, rotation }) => ({ tableId, x, y, rotation }));
    changeAssignment({ ...assignment, optionId: "custom", customTables, capacity: next.capacity, rotation: 0, retainExisting: false,
      x: next.poses.reduce((sum, pose) => sum + pose.x, 0) / next.poses.length, y: next.poses.reduce((sum, pose) => sum + pose.y, 0) / next.poses.length });
  };
  const selectionError = (message: string | null, windowId?: string) => { if (windowId) setTableErrors((current) => ({ ...current, [windowId]: message })); else setOperationError(message); };
  const commitLayout = async (plan: FloorSelectionLayout | string, windowId?: string) => {
    if (typeof plan === "string") { selectionError(plan, windowId); return; }
    if (!board || saving) return;
    const preview: Record<string, Pick<FloorTable, "x" | "y" | "rotation">> = {};
    for (const update of plan.updates) for (const pose of update.assignment.customTables ?? []) preview[pose.tableId] = { x: pose.x, y: pose.y, rotation: pose.rotation };
    for (const pose of plan.draft?.poses ?? []) preview["draft:" + pose.tableId] = { x: pose.x, y: pose.y, rotation: pose.rotation };
    selectionError(null, windowId); setTableMenu(null);
    if (!plan.updates.length) { if (plan.draft) applyDraftLayout(plan.draft); if (windowId) discardWindow(windowId); return; }
    if (!beginMutation()) return;
    setLayoutPreview(preview);
    try {
      const next = await reassignFloorSelection(restaurantId, { updates: plan.updates }, board.at, !historical);
      store.dispatch(floorBoardReceived({ board: next, refreshedAt: next.updatedAt }));
      if (plan.draft) applyDraftLayout(plan.draft);
      if (windowId) discardWindow(windowId);
    } catch (failure) { selectionError(failure instanceof Error ? failure.message : "No se pudo guardar la selección. Se conservaron todos los armados.", windowId); }
    finally { store.dispatch(floorBoardWorkspace.changed({ layoutPreview: null, saving: false })); }
  };
  const applySelection = async (nextTables: FloorTable[], mode: FloorSelectionEditorMode, snapshot: SelectionSnapshot, windowId: string) => {
    if (saving || !room || !selectionState) return;
    if (snapshot.roomId !== roomId || snapshot.stamp !== sourceStamp(snapshot.ids) || !editableResources(snapshot.ids)) { selectionError("La selección cambió desde que abriste esta ventana. Cerrala y volvé a abrirla antes de aplicar.", windowId); return; }
    if (nextTables.length !== snapshot.ids.length || new Set(nextTables.map((table) => table.id)).size !== snapshot.ids.length || nextTables.some((table) => !snapshot.ids.includes(table.id))) { selectionError("La selección cambió. Volvé a abrir el editor.", windowId); return; }
    if (mode === "layout") {
      if (nextTables.every((table) => { const old = snapshot.tables.find((item) => item.id === table.id)!; return table.x === old.x && table.y === old.y && table.rotation === old.rotation; })) { discardWindow(windowId); return; }
      await commitLayout(buildSelectionLayout(selectionState, snapshot.ids, nextTables), windowId); return;
    }
    const changes = new Map<string, FloorTable>();
    for (const table of nextTables) {
      const id = table.id.replace(/^draft:/, "");
      const old = changes.get(id);
      if (old && (["label", "shape", "width", "height", "capacity", "active"] as const).some((key) => old[key] !== table[key])) { selectionError("Una misma mesa tiene cambios diferentes. Volvé a seleccionar las mesas.", windowId); return; }
      changes.set(id, table);
    }
    const tables = room.tables.map((table) => { const next = changes.get(table.id); return next ? { ...table, label: next.label, shape: next.shape, width: next.width, height: next.height, capacity: next.capacity, active: next.active } : table; });
    if (tables.every((table, index) => (["label", "shape", "width", "height", "capacity", "active"] as const).every((key) => table[key] === room.tables[index][key]))) { discardWindow(windowId); return; }
    const invalid = validateRoomLayout({ ...room, tables }); if (invalid) { selectionError(invalid, windowId); return; }
    if (!beginMutation()) return;
    selectionError(null, windowId);
    try {
      const { room: nextRoom } = await saveFloorTables(restaurantId, { roomId: room.id, expectedRevision: room.revision, tables, combinations: room.combinations });
      setBoard((previous) => previous ? { ...previous, rooms: previous.rooms.map((item) => item.id === nextRoom.id ? nextRoom : item) } : previous);
      if (assembling) { assembly.replaceRoom(nextRoom, "", {}); assembly.refresh(); }
      discardWindow(windowId);
    } catch (failure) { selectionError(failure instanceof Error ? failure.message : "No se pudo guardar el inventario de la selección. Volvé a intentar.", windowId); }
    finally { setSaving(false); }
  };
  const moveSelected = (ids: string[], delta: { x: number; y: number }) => {
    if (saving || !selectionState || !editableResources(ids)) return;
    if (!delta.x && !delta.y) return;
    const next = resolveFloorSelection(selectionState, ids).map(({ table }) => ({ ...table, x: table.x + delta.x, y: table.y + delta.y }));
    void commitLayout(buildSelectionLayout(selectionState, ids, next));
  };
  const separateSelected = (ids: string[]) => { if (!saving && selectionState && editableResources(ids)) void commitLayout(separateFloorSelection(selectionState, ids)); };
  const editAllocation = (allocation: FloorAllocationView) => { const ids = allocation.poses.map((pose) => pose.tableId); setSelectedResourceIds(ids); openSelectionEditor(ids); };
  const tableEditorsOpen = tools.windows.some((entry) => entry.value.kind === "table" && entry.value.selection?.ids.some((id) => id.startsWith("draft:")));
  const assemblyWindow = tools.windows.find((entry) => entry.value.kind === "assembly");
  const menuResources = selectionState && tableMenu ? resolveFloorSelection(selectionState, tableMenu.ids) : [];
  const menuName = menuResources.length === 1 ? "Mesa " + menuResources[0].table.label : menuResources.length + " mesas seleccionadas";
  const menuDisabled = saving || !tableMenu || !editableResources(tableMenu.ids);
  const menuCanSeparate = selectionState && tableMenu && canSeparateFloorSelection(selectionState, tableMenu.ids);

  const when = query.date && board ? new Intl.DateTimeFormat("es-AR", { timeZone: board.timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(board.at)) : `Ahora${local.time ? ` · ${local.time}` : ""}`;

  return <main data-admin-panel data-floor-operations className={`${styles.screen} fixed inset-0 isolate h-dvh overflow-hidden`}>
    <h1 className="sr-only">Sala · {restaurantName}</h1>
    <div ref={boardSurface} tabIndex={-1} role="region" aria-label="Tablero principal de sala" className="absolute inset-0 outline-none">
      {room && <FloorCanvas key={room.id} appearance="operational" fullScreen room={room} tables={tables} joinedGroups={joinedGroups} selectJoinedTables selectedIds={interactionMode === "service" ? [] : selection} selectedLocationId={assembling ? assembly.locationId : undefined}
        interactionMode={interactionMode} onInteractionModeChange={(mode) => { setInteractionMode(mode); setTableMenu(null); }}
        draggableIds={!saving ? availableIds.filter((id) => editableResources([id])) : []}
        onSelect={selectTable} onSelectMany={selectTables} onClearSelection={clearSelection}
        onServiceTable={canUseService ? showServiceAtTable : undefined}
        onContextMenuTable={openTableMenu} onContextMenuGroup={openGroupMenu} onContextMenuSelection={interactionMode === "service" ? undefined : (point) => openContext([], point)}
        onMove={!saving ? moveSelected : undefined} onPlace={assembling && !assembly.locationId && !saving ? assembly.place : undefined} />}
    </div>
    {tableMenu && menuResources.length > 0 && panel !== "release" && <FloorTableContextMenu name={menuName} point={tableMenu.point} disabled={menuDisabled} reason={menuDisabled && !saving ? "La selección ya no se puede modificar o no tenés permiso. Actualizá la sala para continuar." : undefined} onEdit={() => openSelectionEditor(tableMenu.ids)} onSeparate={menuCanSeparate ? () => separateSelected(tableMenu.ids) : undefined} onClose={closeTableMenu} />}
    {!room && <div className="absolute inset-0 grid place-items-center p-8"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{board ? "No hay salones activos" : "Preparando la sala…"}</h2><p className="mt-2 text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">{board ? "Usá la botonera para administrar los salones o volvé a actualizar." : "Cargando sectores y mesas asignadas."}</p></div></div>}

    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-start justify-between gap-3 px-4 sm:px-6">
      <div aria-label="Salón actual" className="min-w-0 rounded-xl bg-white px-3 py-2 text-[var(--floor-ink,#263e23)] shadow-[0_3px_16px_rgba(24,38,24,0.12)]">
        <span className="block max-w-[60vw] truncate text-[11px] text-[var(--floor-muted,#52634b)] sm:max-w-72">{restaurantName}</span><span className="block max-w-[60vw] truncate text-sm font-semibold sm:max-w-72">{room?.name ?? "Elegir salón"}</span>
      </div>
      <button {...transientButtonProps} type="button" aria-label="Actualizar" title="Actualizar sala" disabled={loading} onClick={() => { setOperationError(null); void refresh(); void service.refresh(); if (assembling) assembly.refresh(); }} className={`${floatingButton} pointer-events-auto h-12 w-12 shrink-0 px-0`}>{loading ? <Loader2 size={19} className="animate-spin" /> : <RefreshCw size={19} />}</button>
    </header>

    <div className="pointer-events-none absolute left-4 right-4 top-[calc(max(1rem,env(safe-area-inset-top))+4rem)] z-10 max-w-lg space-y-2 sm:left-6">
      <div className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]"><span className="font-semibold">{when}</span><span className="ml-2 text-[var(--floor-muted,#52634b)]" role="status">{refreshedAt ? `Actualizado ${new Intl.DateTimeFormat("es-AR", { timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(refreshedAt))}` : "Consultando…"}</span></div>
      {tableCounts && <FloorTableSummary counts={tableCounts} />}
      {canUseService && interactionMode === "service" && <p className="w-fit rounded-lg bg-white px-3 py-2 text-xs font-medium text-[var(--floor-ink,#263e23)] shadow-sm">{historical ? "Consulta de servicio · solo lectura" : "Servicio · tocá una mesa ocupada para ver su cuenta"}</p>}
      {error && (!panel || panel === "rooms") && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
      {operationError && !assemblyWindow && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{operationError}</p>}
      {board && !board.enabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">La asignación de mesas todavía no está activada.</p>}
    </div>

    <FloorBoardToolbar rooms={board?.rooms ?? []} roomId={roomId} roomsOpen={panel === "rooms"} onRoomsOpenChange={(open) => { if (open) { closeTableMenu();  setPanel("rooms"); } else if (panel === "rooms") setPanel(null); }} onSelectRoom={(id) => { if (id !== roomId) { if (hasPendingChanges && !window.confirm("Hay cambios sin guardar en las ventanas o en el armado. ¿Querés descartarlos y cambiar de salón?")) return; tools.clear(); if (assembling) tools.open("assembly", { kind: "assembly" }); else { setWalkIn(emptyWalkIn); setWalkInError(null); } setDirtyWindows({}); setTableErrors({}); setInventoryDirty(false); changeAssignment(null); setSelectedResourceIds([]); setLayoutPreview(null); } setRoomId(id); setSelectedResourceIds([]); openPanel(null); }} onSchedule={openSchedule} onReservations={() => requestTool("reservations")} onAttend={() => { if (assembling) { tools.open("assembly", { kind: "assembly" }); setPanel(null); } else openWalkIn(); }} onTables={canManageTables && savedRoom ? () => { closeTableMenu(); openPanel("inventory", { kind: "inventory", room: savedRoom }); } : undefined} onServiceAccounts={canUseService ? () => requestTool("service-list") : undefined} attendButtonRef={attendButton} readOnly={readOnly} canManageWalkIns={canManageWalkIns} enabled={board?.enabled ?? false} hasBoard={Boolean(board)} assembling={assembling} saving={saving} reservationCount={allocations.length} restaurantId={restaurantId} openPanels={tools.windows.filter((entry) => entry.visible).map((entry) => entry.value.kind)} hasPendingChanges={hasPendingChanges} />

    {assembling && assemblyWindow && <FloorAssemblyControls controller={{ ...assembly, refresh: () => { setOperationError(null); assembly.refresh(); void refresh(); } }} partySize={assemblyPartySize} customerName={walkIn.customerName.trim() || "Sin reserva"} durationMinutes={assemblyDuration} saving={saving} interactionLocked={tableEditorsOpen} windowLayout={floorAssemblyWindowLayout} floatingWindow={{ visible: assemblyWindow.visible, zIndex: assemblyWindow.zIndex, offset: assemblyWindow.offset, activation: assemblyWindow.activation, onFocus: () => tools.focus(assemblyWindow.id), onHide: () => discardWindow(assemblyWindow.id) }} conflict={assemblyConflict} error={operationError} selectedTableIds={selectionIds} onSelectTable={(id, additive) => { setInteractionMode("select"); selectTable("draft:" + id, additive); }} onSelectTableGroup={(ids) => { setInteractionMode("select"); selectTables(ids.map((id) => "draft:" + id)); }} selectionNotice={selection.length && !draftOnlySelection ? "La selección incluye mesas de otras reservas. Hacé clic derecho en el plano para editarlas juntas." : undefined} onJoinTables={draftOnlySelection ? () => setOperationError(assembly.joinTables(selectionIds)) : undefined} onSeparateTables={draftOnlySelection ? () => separateSelected(selection) : undefined} onEditSelection={draftOnlySelection ? () => openSelectionEditor(selection) : undefined} onConfirm={() => void createWalkIn()} onCancel={cancelAssembly} onEditData={openWalkIn} onChooseRoom={() => openPanel("rooms")} />}

    {tools.windows.filter((entry) => entry.value.kind !== "assembly").map((entry) => {
      const panel = entry.value.kind;
      const title = toolTitle(entry.value, room?.name ?? "la sala");
      const snapshot = entry.value.selection;
      const staleSelection = snapshot ? snapshot.roomId !== roomId || snapshot.stamp !== sourceStamp(snapshot.ids) : false;
      const inventoryRoom = entry.value.room ?? null;
      const currentSelection = entry.value.allocation ? board?.allocations.find((allocation) => allocation.id === entry.value.allocation!.id) : null;
      const selectedAllocation = currentSelection ?? entry.value.allocation;
      const tableError = staleSelection ? "La selección cambió desde que abriste esta ventana. Cerrala y volvé a abrirla antes de aplicar." : tableErrors[entry.id];
      const target = entry.value.serviceTarget;
      const serviceAllocation = target && board?.allocations.find((allocation) => allocation.id === target.allocationId && allocation.poses.some((pose) => pose.tableId === target.tableId));
      const serviceAccount = target && serviceAccounts.find((account) => account.allocationId === target.allocationId && account.tableIds.includes(target.tableId));
      const recoveryGroup = target?.recovery ? service.snapshot?.unserved.find((group) => group.allocationId === target.allocationId && group.tableId === target.tableId) : undefined;
      const currentGroup = serviceAllocation && target && getJoinedTableGroups(serviceAllocation.poses).find((group) => group.some(({ tableId }) => tableId === target.tableId));
      const currentTarget = currentGroup && serviceAllocation && target ? { ...target, tableLabels: currentGroup.map(({ label }) => label) } : target;
      const closePanel = () => closeTool(entry.id);
      return (
    <FloatingModalWindow key={entry.id} id={"floor-tools-" + entry.id} title={title} subtitle={currentTarget ? currentTarget.tableLabels.join(" + ") : room?.name ?? restaurantName} icon={panel === "service" || panel === "service-list" ? <ReceiptText size={17} /> : panel === "inventory" ? <Package size={17} /> : panel === "schedule" ? <CalendarClock size={17} /> : panel === "walk-in" ? <Users size={17} /> : <List size={17} />} isOpen={entry.visible} keepMounted onClose={() => closeTool(entry.id)} closeDisabled={saving} initialAnchor="right" initialOffset={entry.offset} activation={entry.activation} viewportInset={{ bottom: 100 }} initialPosition={{ x: 0, y: 112 }} initialSize={floorToolWindowSize} minWidth={320} minHeight={320} zIndex={entry.zIndex} onFocus={() => { tools.focus(entry.id); if (entry.value.selection) setSelectedResourceIds(entry.value.selection.ids); }}>
      <fieldset disabled={saving} id={"floor-content-" + entry.id} tabIndex={-1} onChangeCapture={() => setDirtyWindows((current) => current[entry.id] ? current : { ...current, [entry.id]: true })} className="flex min-h-0 flex-1 flex-col outline-none">
        {panel === "inventory" && inventoryRoom && canManageTables && <FloorInventoryPanel key={inventoryRoom.id} restaurantId={restaurantId} room={inventoryRoom} onDirtyChange={setInventoryDirty} onBusyChange={inventoryBusyChanged} onClose={closePanel} onSaved={(next) => { setBoard((previous) => previous ? { ...previous, rooms: previous.rooms.map((item) => item.id === next.id ? next : item) } : previous); setInventoryDirty(false); discardWindow(entry.id); }} />}
        {panel === "table" && snapshot && <FloorSelectionEditor disabled={staleSelection} tables={snapshot.tables} inventoryEditable={canManageTables} positionsEditable={canManageTables} busy={saving} error={tableError} onApply={(next, mode) => { void applySelection(next, mode, snapshot, entry.id); }} onCancel={closePanel} />}
        {error && <p role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
        {panel === "schedule" && <form className="flex min-h-0 flex-1 flex-col" onSubmit={applySchedule}><div className={floorWindowBodyClass}><p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">Consultá el armado del salón para un momento específico. Los horarios corresponden a {board?.timeZone}.</p><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Fecha<input type="date" required value={schedule.date} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, date: event.target.value }))} /></label><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Hora<input type="time" required value={schedule.time} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, time: event.target.value }))} /></label></div>{scheduleError && <p role="alert" className="text-sm text-red-800">{scheduleError}</p>}</div><footer className={`${floorWindowFooterClass} flex flex-wrap justify-between gap-2`}><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={() => { setQuery({ date: "", time: "" }); setSelectedResourceIds([]); discardWindow(entry.id); setPanel(null); }}><Clock size={16} />Volver a ahora</button><button {...transientButtonProps} type="submit" className={adminPrimaryButtonClass}>Ver este horario</button></footer></form>}

        {panel === "reservations" && <section aria-label="Reservas del salón" className={floorWindowBodyClass}><p className="text-sm text-[var(--floor-muted,#52525b)]">{when} · {allocations.length} grupos con mesas asignadas.</p>{!allocations.length ? <p className="py-6 text-sm text-[var(--floor-muted,#52525b)]">No hay mesas armadas para este horario. Elegí otro momento o atendé una llegada desde el tablero.</p> : allocations.map((allocation) => <AllocationCard key={allocation.id} allocation={allocation} serviceTargets={canUseService ? serviceTargets(allocation) : []} onService={openServiceWindow} onDetails={() => showDetails(allocation)} onEdit={canArrange(allocation) ? () => editAllocation(allocation) : undefined} onRelease={canRelease(allocation) ? () => askRelease(allocation) : undefined} />)}</section>}

        {panel === "service-list" && <FloorServiceAccounts accounts={serviceAccounts} unserved={service.snapshot?.unserved ?? []} loading={serviceLoading} error={service.error} historical={historical} onRefresh={() => void service.refresh()} onRecover={(group) => openServiceWindow({ ...group, recovery: true })} onChoose={(account) => {
          const tableId = account.tableIds.slice().sort()[0];
          if (tableId) openServiceWindow({ allocationId: account.allocationId, customerName: account.customerName, reservationCode: account.reservationCode, tableLabels: account.tableLabels, tableId });
        }} />}
        {panel === "service" && currentTarget && <FloorServiceWindow target={currentTarget} account={serviceAccount} products={service.snapshot?.products ?? []} restaurantName={restaurantName} timeZone={board?.timeZone ?? "America/Argentina/Buenos_Aires"} loading={serviceLoading} loadError={service.error} busy={saving} historical={historical}
          canOpen={canUseService && Boolean(serviceAllocation && !serviceAllocation.releasedAt)} allocationVersion={target?.recovery ? recoveryGroup?.expectedAllocationVersion : serviceAllocation?.version} conflict={Boolean(serviceAllocation?.serviceConflict)} cashClosed={Boolean(service.snapshot?.cashClosed)}
          onRefresh={() => { void service.refresh(); void refresh(); }} onCommand={async (command) => {
            const account = await runServiceCommand(command);
            if (command.action === "add-line" || command.action === "checkout" || command.action === "close-empty") setDirtyWindows((current) => ({ ...current, [entry.id]: false }));
            return account;
          }} />}

        {panel === "detail" && selectedAllocation && <div className="flex min-h-0 flex-1 flex-col"><div className={floorWindowBodyClass}>{!currentSelection && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Esta asignación ya no ocupa mesas en el horario consultado.</p>}<AllocationCard allocation={selectedAllocation} onEdit={currentSelection && canArrange(currentSelection) ? () => editAllocation(currentSelection) : undefined} onRelease={!assembling && currentSelection && canRelease(currentSelection) ? () => askRelease(currentSelection) : undefined} /></div><footer className={floorWindowFooterClass}><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={() => openPanel("reservations")}><ArrowLeft size={15} />Ver todas las reservas</button></footer></div>}


        {panel === "walk-in" && <form className="flex min-h-0 flex-1 flex-col" onSubmit={continueOnBoard}><div className={floorWindowBodyClass}>
          <p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">Completá los datos del grupo. Después elegís y acomodás sus mesas sobre el tablero principal.</p>
          {walkInError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{walkInError}</p>}
          <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Nombre del grupo<input value={walkIn.customerName} maxLength={100} placeholder="Sin reserva" className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, customerName: event.target.value }))} /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Personas<input type="number" min={1} max={40} required value={walkIn.partySize} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, partySize: Number(event.target.value) }))} /></label><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Estadía prevista (minutos)<input type="number" min={15} max={720} step={15} required value={walkIn.durationMinutes} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} /></label></div><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Notas de atención<textarea maxLength={500} rows={3} value={walkIn.notes} className={floorInputClass} onChange={(event) => setWalkIn((value) => ({ ...value, notes: event.target.value }))} /></label><p className="text-xs leading-relaxed text-[var(--floor-muted,#52525b)]">El bloqueo empieza al ocupar las mesas. Podés liberarlas antes cuando el grupo se retire.</p>
          </div><footer className={`${floorWindowFooterClass} flex flex-wrap justify-between gap-2`}><button {...transientButtonProps} type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={() => { if (!assembling) setWalkIn(emptyWalkIn); closePanel(); }}>{assembling ? "Volver al tablero" : "Cancelar"}</button><button {...transientButtonProps} type="submit" className={adminPrimaryButtonClass}>Elegir mesas<ArrowRight size={16} /></button></footer>
        </form>}
      </fieldset>
    </FloatingModalWindow>
      );
    })}
    <AdminModal open={panel === "release"} title="Liberar mesas" onClose={closePanel}>
        {panel === "release" && <div className="space-y-5"><p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">¿El grupo {releaseTarget?.customerName} ya se retiró? Sus mesas quedarán disponibles y se conservará el registro de la visita.</p>{releaseError && <p role="alert" className="text-sm text-red-800">{releaseError}</p>}<div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-5"><button {...transientButtonProps} type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={() => openPanel("reservations")}>Cancelar</button><button {...transientButtonProps} type="button" disabled={saving} className={adminPrimaryButtonClass} onClick={() => void releaseWalkIn()}>{saving ? "Liberando…" : "Confirmar liberación"}</button></div></div>}
    </AdminModal>

  </main>;
}

function AllocationCard({ allocation, onDetails, onRelease, onEdit, serviceTargets = [], onService }: { allocation: FloorAllocationView; onDetails?: () => void; onRelease?: () => void; onEdit?: () => void; serviceTargets?: FloorServiceTarget[]; onService?: (target: FloorServiceTarget) => void }) {
  return <article className="border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--floor-ink,#09090b)]">{allocation.customerName}</h3><p className="mt-1 text-sm text-[var(--floor-muted,#3f3f46)]">{allocation.poses.map((pose) => pose.label).join(" + ")} · {allocation.time} hs{allocation.source === "WALK_IN" && " · Sin reserva"}</p></div><span className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--floor-hover,#eef2e9)] px-2 py-1 text-xs font-semibold text-[var(--floor-action,#2d4628)]"><Users size={13} />{allocation.partySize}</span></div>
    {allocation.serviceConflict && <p className="mt-2 text-xs text-amber-950">Las mesas siguen ocupadas por una cuenta anterior.</p>}
    {allocation.serviceOverrun && <p className="mt-2 text-xs text-amber-950">Servicio activo fuera del horario previsto.</p>}
    {allocation.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">{allocation.notes}</p>}
    <div className="mt-3 flex flex-wrap gap-3">{onDetails && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onDetails}>Ver detalle</button>}{onEdit && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onEdit}>Editar armado</button>}{onRelease && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onRelease}>Liberar mesas</button>}
      {onService && serviceTargets.map((target) => <button key={target.tableId} type="button" className={adminSecondaryButtonClass} onClick={() => onService(target)}><ReceiptText size={15} aria-hidden="true" />Cuenta {target.tableLabels.join(" + ")}</button>)}
    </div>
  </article>;
}
