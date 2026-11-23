"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, CalendarClock, Clock, List, Loader2, ReceiptText, RefreshCw, Users } from "lucide-react";
import { AdminModal } from "@/ui/admin/AdminUI";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { floorBoardReceived, floorBoardSeed, floorBoardWorkspace, type Panel, type ToolWindow } from "./floor-workspaces";
import { useFloatingWindows } from "@/ui/useFloatingWindows";
import { transientButtonProps } from "@/ui/button-state";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";
import styles from "./floor-operations.module.css";
import { calculateFloorInterval, composeRoomPoses, getJoinedTableGroups, restaurantLocalDateTime, summarizeSectorQuota, type FloorAllocationView, type FloorBoardView, type FloorPose } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { FloorBoardToolbar } from "./FloorBoardToolbar";
import { FloorTableSummary } from "./FloorTableSummary";
import { FloorServiceAccounts, FloorServiceWindow, type FloorServiceTarget } from "./FloorServiceWindow";
import { FloorOpenTableView } from "./FloorOpenTableView";
import { FloorTableModal } from "./FloorTableModal";
import { useFloorService, type FloorServiceCommand } from "./useFloorService";
import { summarizeFloorTables } from "./floor-table-summary";
import { floorInputClass, getFloorBoard, saveFloorAction } from "./floor-api";

const toolId = (tool: ToolWindow) =>
  tool.kind === "detail" ? `detail:${tool.allocation!.id}` : tool.kind;
const toolTitle = (tool: ToolWindow, roomName: string) =>
  tool.kind === "service-list" ? "Cuentas de servicio"
    : tool.kind === "schedule" ? "Fecha y hora"
      : tool.kind === "reservations" ? `Reservas de ${roomName}`
        : "Detalle de la reserva";
const floorToolWindowSize = { width: 520, height: 540 };
const floorListWindowSize = { width: 920, height: 640 };
const floatingButton = "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[var(--floor-ink,#263e23)] shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--floor-focus,#3d5934)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function serviceTarget(allocation: FloorAllocationView, group: FloorPose[]): FloorServiceTarget {
  return { allocationId: allocation.id, customerName: allocation.customerName, reservationCode: allocation.code,
    tableLabels: group.map(({ label }) => label), tableId: group.map(({ tableId }) => tableId).sort()[0], partySize: allocation.partySize };
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
  const [board] = floorBoardWorkspace.useField("board");
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
  const [releaseReason, setReleaseReason] = useState<"COMPLETED" | "NO_SHOW">("COMPLETED");
  const [refreshedAt] = floorBoardWorkspace.useField("refreshedAt");
  const [floorSaving, setSaving] = floorBoardWorkspace.useField("saving");
  const [operationError, setOperationError] = floorBoardWorkspace.useField("operationError");
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = floorBoardWorkspace.useField("interactionMode");
  const [dirtyWindows, setDirtyWindows] = floorBoardWorkspace.useField("dirtyWindows");
  const [activeTableModal, setActiveTableModal] = floorBoardWorkspace.useField("activeTableModal");
  const [tableModalDirty, setTableModalDirty] = floorBoardWorkspace.useField("tableModalDirty");
  const canManageTables = !readOnly || canManageWalkIns;
  const canUseService = Boolean(board?.enabled && canManageTables);
  const historical = Boolean(query.date);
  const serviceTime = historical ? calculateFloorInterval({ ...query, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" }).serviceStartAt : undefined;
  const service = useFloorService(restaurantId, canUseService, serviceTime);
  const serviceAccounts = service.snapshot?.accounts ?? [];
  const serviceLoading = !service.snapshot && !service.error;
  const saving = floorSaving || service.busy;
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const boardSurface = useRef<HTMLDivElement>(null);
  const discardWindow = (id: string) => { tools.close(id); setDirtyWindows((current) => ({ ...current, [id]: false })); };
  const closeTableModal = () => {
    setActiveTableModal(null);
    setTableModalDirty(false);
  };
  const openPanel = (next: Panel, value?: ToolWindow) => {
    setPanel(next);
    if (!next || next === "rooms" || next === "release") return;
    const tool = value ?? { kind: next };
    const id = toolId(tool);
    tools.open(id, tool);
    window.requestAnimationFrame(() => document.getElementById(`floor-content-${id}`)?.focus({ preventScroll: true }));
  };
  const hasPendingChanges = tableModalDirty || tools.windows.some((entry) => dirtyWindows[entry.id]);
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

  const room = board?.rooms.find((item) => item.id === roomId);
  const allocations = board?.allocations.filter((item) => item.roomId === roomId) ?? [];
  const local = board ? restaurantLocalDateTime(board.timeZone, new Date(board.at)) : { date: "", time: "" };
  const poses = room && board ? composeRoomPoses(room, board.allocations, board.at) : [];
  const openAccountByTableId = new Map<string, (typeof serviceAccounts)[number]>();
  const readyByTable = new Map<string, number>();
  for (const acc of serviceAccounts) {
    if (!acc.closedAt) {
      for (const tid of acc.tableIds) {
        openAccountByTableId.set(tid, acc);
      }
    }
    if (acc.readyQuantity > 0) {
      for (const tid of acc.tableIds) {
        readyByTable.set(tid, (readyByTable.get(tid) ?? 0) + acc.readyQuantity);
      }
    }
  }
  const tableCounts = board && room ? summarizeFloorTables(room, board.allocations, board.at, openAccountByTableId.keys()) : null;
  const poseByTableId = new Map(poses.map((pose) => [pose.tableId, pose]));
  const allocationByTableId = new Map<string, FloorAllocationView>();
  for (const allocation of allocations) {
    if (allocation.releasedAt) continue;
    for (const pose of allocation.poses) {
      if (!pose.releasedAt && (!allocation.serviceConflict || !allocationByTableId.has(pose.tableId))) {
        allocationByTableId.set(pose.tableId, allocation);
      }
    }
  }
  const canvasTables = room
    ? room.tables
        .filter((table) => table.active)
        .map((table) => {
          const openAccount = openAccountByTableId.get(table.id);
          const activePose = poseByTableId.get(table.id);
          const allocation = allocationByTableId.get(table.id);
          const x = table.locationId ? table.x : (activePose?.x ?? table.x);
          const y = table.locationId ? table.y : (activePose?.y ?? table.y);
          const rotation = table.locationId ? table.rotation : (activePose?.rotation ?? table.rotation);
          if (openAccount) {
            const partial = openAccount.payments.length > 0;
            return {
              ...table, x, y, rotation,
              state: "occupied" as const,
              partySize: openAccount.partySize,
              readyQuantity: openAccount.readyQuantity,
              hasPartialPayments: partial,
              subtitle: `${openAccount.partySize}p${partial ? " · Parcial" : ""}`,
            };
          }
          if (activePose || allocation) {
            const guests = allocation?.partySize ?? table.capacity;
            return {
              ...table, x, y, rotation,
              state: "reserved" as const,
              partySize: guests,
              readyQuantity: readyByTable.get(table.id) ?? 0,
              subtitle: `${guests}p · Res.`,
            };
          }
          return {
            ...table, x, y, rotation,
            state: "available" as const,
            subtitle: `${table.capacity}p · Libre`,
          };
        })
    : [];
  const boardRoom = room && board ? {
    ...room,
    locations: room.locations
      .filter((loc) => loc.active)
      .map((loc) => {
        const quota = summarizeSectorQuota(loc, room.tables, board.allocations, board.at);
        return {
          ...loc,
          quotaStatus: quota.status,
          quotaLabel: [
            quota.maxCapacity != null ? `${quota.occupiedPartySize}/${quota.maxCapacity}p` : `${quota.occupiedPartySize}p`,
            `${quota.freeTables}/${quota.placedTables} libres`,
          ].join(" · "),
        };
      }),
  } : room;
  const joinedGroups = allocations.flatMap((allocation) =>
    getJoinedTableGroups(allocation.poses).filter((group) => group.length > 1).map((group) => ({ id: `${allocation.id}:${group.map((pose) => pose.tableId).sort().join(":")}`, tableIds: group.map((pose) => pose.tableId), label: group.map((pose) => pose.label).join(" + ") })));
  const canRelease = (allocation: FloorAllocationView) => canManageWalkIns && !query.date && !allocation.releasedAt
    && !allocation.serviceOverrun && !allocation.servicePartiallyReleased && !serviceAccounts.some((account) => account.allocationId === allocation.id && !account.closedAt);
  const closeTool = (id: string) => {
    if (saving) return;
    discardWindow(id);
  };
  const closePanel = () => { if (!saving) setPanel(null); };
  const requestTool = (next: Panel, prepare?: () => void) => { if (!saving) { prepare?.(); openPanel(next); } };
  const openSchedule = () => requestTool("schedule", () => { if (!tools.windows.some((window) => window.id === "schedule")) { setSchedule({ date: query.date || local.date, time: query.time || local.time }); setScheduleError(null); } });
  const showDetails = (allocation: FloorAllocationView) => { if (!saving) { openPanel("detail", { kind: "detail", allocation }); } };
  const openServiceWindow = (target: FloorServiceTarget) => {
    if (!canUseService || saving) return;
    setInteractionMode("service");
    setTableModalDirty(false);
    setActiveTableModal({ kind: "service", target });
  };
  const serviceTargets = (allocation: FloorAllocationView) => getJoinedTableGroups(allocation.poses).map((group) => serviceTarget(allocation, group));
  const handleTableClick = (tableId: string) => {
    if (!canUseService || saving || !room) return;
    const openAccount = openAccountByTableId.get(tableId);
    if (openAccount) {
      openServiceWindow({
        allocationId: openAccount.allocationId,
        customerName: openAccount.customerName,
        reservationCode: openAccount.reservationCode,
        tableLabels: openAccount.tableLabels,
        tableId,
        partySize: openAccount.partySize,
      });
      return;
    }
    const matching = allocations.filter((allocation) => allocation.poses.some((pose) => pose.tableId === tableId));
    const allocation = matching.find((candidate) => !candidate.serviceConflict) ?? matching[0];
    if (allocation) {
      const group = getJoinedTableGroups(allocation.poses).find((groupPoses) => groupPoses.some((pose) => pose.tableId === tableId));
      if (group) {
        openServiceWindow(serviceTarget(allocation, group));
        return;
      }
    }
    if (!historical && canManageTables && board?.enabled) {
      setOperationError(null);
      setTableModalDirty(false);
      setActiveTableModal({ kind: "open-table", roomId: room.id, tableId });
    }
  };
  const runServiceCommand = async (command: FloorServiceCommand) => {
    const account = await service.mutate(command);
    if (
      command.action === "open"
      || command.action === "open-table"
      || command.action === "assign-waiter"
      || command.action === "checkout"
      || command.action === "close-empty"
      || (command.action === "pay-partial" && account.closedAt !== null)
    ) {
      void refresh(true);
    }
    return account;
  };
  const askRelease = (allocation: FloorAllocationView) => {
    setReleaseTarget(allocation);
    setReleaseReason("COMPLETED");
    setReleaseError(null);
    openPanel("release");
  };
  const releaseReservation = async () => {
    if (!releaseTarget || !beginMutation()) return;
    setReleaseError(null);
    try {
      await saveFloorAction(restaurantId, {
        action: "release-reservation",
        reservationId: releaseTarget.reservationId,
        expectedRevision: releaseTarget.reservationRevision,
        reason: releaseReason,
      });
      setReleaseTarget(null); openPanel(null); await refresh(true);
    } catch (failure) { setReleaseError(failure instanceof Error ? failure.message : "No se pudieron liberar las mesas. Actualizá la sala y volvé a intentar."); }
    finally { setSaving(false); }
  };
  const applySchedule = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      calculateFloorInterval({ ...schedule, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" });
      setQuery({ ...schedule }); setScheduleError(null); discardWindow("schedule"); setPanel(null);
    } catch (failure) { setScheduleError(failure instanceof Error ? failure.message : "Revisá la fecha y hora elegidas."); }
  };

  const when = query.date && board ? new Intl.DateTimeFormat("es-AR", { timeZone: board.timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(board.at)) : `Ahora${local.time ? ` · ${local.time}` : ""}`;

  const modalOpenTableTarget = activeTableModal?.kind === "open-table" ? activeTableModal : undefined;
  const modalOpenTableRoom = modalOpenTableTarget ? board?.rooms.find((item) => item.id === modalOpenTableTarget.roomId) : undefined;
  const modalOpenTableEntity = modalOpenTableTarget && modalOpenTableRoom ? modalOpenTableRoom.tables.find((item) => item.id === modalOpenTableTarget.tableId) : undefined;
  const modalOpenTableSector = modalOpenTableEntity?.locationId
    ? modalOpenTableRoom?.locations.find((loc) => loc.id === modalOpenTableEntity.locationId && loc.active)
    : modalOpenTableRoom?.locations.find((loc) => loc.active);

  const modalServiceTarget = activeTableModal?.kind === "service" ? activeTableModal.target : undefined;
  const modalServiceAllocation = modalServiceTarget && board?.allocations.find((allocation) => allocation.id === modalServiceTarget.allocationId && allocation.poses.some((pose) => pose.tableId === modalServiceTarget.tableId));
  const modalServiceAccount = modalServiceTarget && serviceAccounts.find((account) => account.allocationId === modalServiceTarget.allocationId && account.tableIds.includes(modalServiceTarget.tableId));
  const modalRecoveryGroup = modalServiceTarget?.recovery ? service.snapshot?.unserved.find((group) => group.allocationId === modalServiceTarget.allocationId && group.tableId === modalServiceTarget.tableId) : undefined;
  const modalCurrentGroup = modalServiceAllocation && modalServiceTarget && getJoinedTableGroups(modalServiceAllocation.poses).find((group) => group.some(({ tableId }) => tableId === modalServiceTarget.tableId));
  const modalCurrentTarget = modalCurrentGroup && modalServiceAllocation && modalServiceTarget
    ? { ...modalServiceTarget, tableLabels: modalCurrentGroup.map(({ label }) => label) }
    : modalServiceTarget;

  const tableModalKey = activeTableModal
    ? activeTableModal.kind === "open-table"
      ? `open-table:${activeTableModal.roomId}:${activeTableModal.tableId}`
      : `service:${activeTableModal.target.allocationId}:${activeTableModal.target.tableId}`
    : "closed";
  const tableModalTitle = activeTableModal?.kind === "open-table"
    ? "Abrir mesa"
    : modalCurrentTarget
      ? `Cuenta · ${modalCurrentTarget.customerName}`
      : "Atención de mesa";
  const tableModalBadge = activeTableModal?.kind === "open-table"
    ? (modalOpenTableEntity ? `Mesa ${modalOpenTableEntity.label}` : undefined)
    : modalCurrentTarget
      ? `Mesa ${modalCurrentTarget.tableLabels.join(" + ")}`
      : undefined;
  const tableModalSubtitle = activeTableModal?.kind === "open-table"
    ? [modalOpenTableSector?.name, modalOpenTableRoom?.name].filter(Boolean).join(" · ")
    : modalCurrentTarget
      ? [
          modalServiceAccount?.roomName ?? room?.name ?? restaurantName,
          modalCurrentTarget.partySize ? `${modalCurrentTarget.partySize} ${modalCurrentTarget.partySize === 1 ? "comensal" : "comensales"}` : undefined,
        ].filter(Boolean).join(" · ")
      : undefined;

  return <main data-admin-panel data-floor-operations className={`${styles.screen} fixed inset-0 isolate h-dvh overflow-hidden`}>
    <h1 className="sr-only">Sala · {restaurantName}</h1>
    <div ref={boardSurface} tabIndex={-1} role="region" aria-label="Tablero principal de sala" className="absolute inset-0 outline-none">
      {boardRoom && <FloorCanvas key={boardRoom.id} appearance="operational" fullScreen room={boardRoom} tables={canvasTables} joinedGroups={joinedGroups} selectJoinedTables
        interactionMode={interactionMode} onInteractionModeChange={setInteractionMode}
        onServiceTable={canUseService ? handleTableClick : undefined} />}
    </div>
    {!room && <div className="absolute inset-0 grid place-items-center p-8"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{board ? "No hay salones activos" : "Preparando la sala…"}</h2><p className="mt-2 text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">{board ? "Usá la botonera para administrar los salones o volvé a actualizar." : "Cargando sectores y mesas asignadas."}</p></div></div>}

    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-start justify-between gap-3 px-4 sm:px-6">
      <div aria-label="Salón actual" className="min-w-0 rounded-xl bg-white px-3 py-2 text-[var(--floor-ink,#263e23)] shadow-[0_3px_16px_rgba(24,38,24,0.12)]">
        <span className="block max-w-[60vw] truncate text-[11px] text-[var(--floor-muted,#52634b)] sm:max-w-72">{restaurantName}</span><span className="block max-w-[60vw] truncate text-sm font-semibold sm:max-w-72">{room?.name ?? "Elegir salón"}</span>
      </div>
      <button {...transientButtonProps} type="button" aria-label="Actualizar" title="Actualizar sala" disabled={loading} onClick={() => { setOperationError(null); void refresh(); void service.refresh(); }} className={`${floatingButton} pointer-events-auto h-12 w-12 shrink-0 px-0`}>{loading ? <Loader2 size={19} className="animate-spin" /> : <RefreshCw size={19} />}</button>
    </header>

    <div className="pointer-events-none absolute left-4 right-4 top-[calc(max(1rem,env(safe-area-inset-top))+4rem)] z-10 max-w-lg space-y-2 sm:left-6">
      <div className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]"><span className="font-semibold">{when}</span><span className="ml-2 text-[var(--floor-muted,#52634b)]" role="status">{refreshedAt ? `Actualizado ${new Intl.DateTimeFormat("es-AR", { timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(refreshedAt))}` : "Consultando…"}</span></div>
      {tableCounts && <FloorTableSummary counts={tableCounts} />}
      {canUseService && interactionMode === "service" && <p className="w-fit rounded-lg bg-white px-3 py-2 text-xs font-medium text-[var(--floor-ink,#263e23)] shadow-sm">{historical ? "Consulta de servicio · solo lectura" : "Servicio · tocá una mesa para abrirla o ver su cuenta"}</p>}
      {error && (!panel || panel === "rooms") && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
      {operationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{operationError}</p>}
      {board && !board.enabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">La asignación de mesas todavía no está activada.</p>}
    </div>

    <FloorBoardToolbar rooms={board?.rooms ?? []} roomId={roomId} roomsOpen={panel === "rooms"} onRoomsOpenChange={(open) => { if (open) setPanel("rooms"); else if (panel === "rooms") setPanel(null); }} onSelectRoom={(id) => { if (id !== roomId) { if (hasPendingChanges && !window.confirm("Hay cambios sin guardar en las ventanas. ¿Querés descartarlos y cambiar de salón?")) return; tools.clear(); setDirtyWindows({}); closeTableModal(); } setRoomId(id); openPanel(null); }} onSchedule={openSchedule} onReservations={() => requestTool("reservations")} onServiceAccounts={canUseService ? () => requestTool("service-list") : undefined} readOnly={readOnly} hasBoard={Boolean(board)} saving={saving} reservationCount={allocations.length} restaurantId={restaurantId} openPanels={tools.windows.filter((entry) => entry.visible).map((entry) => entry.value.kind)} hasPendingChanges={hasPendingChanges} />

    {tools.windows.map((entry) => {
      const panelKind = entry.value.kind;
      const title = toolTitle(entry.value, room?.name ?? "la sala");
      const currentSelection = entry.value.allocation ? board?.allocations.find((allocation) => allocation.id === entry.value.allocation!.id) : null;
      const selectedAllocation = currentSelection ?? entry.value.allocation;
      const windowSize = panelKind === "service-list" || panelKind === "reservations"
        ? floorListWindowSize
        : floorToolWindowSize;
      return (
    <FloatingModalWindow key={entry.id} id={"floor-tools-" + entry.id} title={title} subtitle={room?.name ?? restaurantName} icon={panelKind === "service-list" ? <ReceiptText size={17} /> : panelKind === "schedule" ? <CalendarClock size={17} /> : <List size={17} />} isOpen={entry.visible} keepMounted onClose={() => closeTool(entry.id)} closeDisabled={saving} initialAnchor="center" initialOffset={entry.offset} activation={entry.activation} viewportInset={{ bottom: 16 }} initialPosition={{ x: 0, y: 76 }} initialSize={windowSize} minWidth={320} minHeight={240} zIndex={entry.zIndex} onFocus={() => tools.focus(entry.id)}>
      <fieldset disabled={saving} id={"floor-content-" + entry.id} tabIndex={-1} onChangeCapture={() => setDirtyWindows((current) => current[entry.id] ? current : { ...current, [entry.id]: true })} className="flex min-h-0 flex-1 flex-col outline-none">
        {error && <p role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-800">{error}{board && " Se conserva la última vista disponible."}</p>}
        {panelKind === "schedule" && <form className="flex min-h-0 flex-1 flex-col" onSubmit={applySchedule}><div className={floorWindowBodyClass}><p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">Consultá el salón para un momento específico. Los horarios corresponden a {board?.timeZone}.</p><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Fecha<input type="date" required value={schedule.date} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, date: event.target.value }))} /></label><label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#3f3f46)]">Hora<input type="time" required value={schedule.time} className={floorInputClass} onChange={(event) => setSchedule((value) => ({ ...value, time: event.target.value }))} /></label></div>{scheduleError && <p role="alert" className="text-sm text-red-800">{scheduleError}</p>}</div><footer className={`${floorWindowFooterClass} flex flex-wrap justify-between gap-2`}><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={() => { setQuery({ date: "", time: "" }); discardWindow(entry.id); setPanel(null); }}><Clock size={16} />Volver a ahora</button><button {...transientButtonProps} type="submit" className={adminPrimaryButtonClass}>Ver este horario</button></footer></form>}

        {panelKind === "reservations" && <section aria-label="Reservas del salón" className={floorWindowBodyClass}><p className="text-sm text-[var(--floor-muted,#52525b)]">{when} · {allocations.length} grupos con mesas asignadas.</p>{!allocations.length ? <p className="py-6 text-sm text-[var(--floor-muted,#52525b)]">No hay reservas asignadas para este horario.</p> : allocations.map((allocation) => <AllocationCard key={allocation.id} allocation={allocation} serviceTargets={canUseService ? serviceTargets(allocation) : []} onService={openServiceWindow} onDetails={() => showDetails(allocation)} onRelease={canRelease(allocation) ? () => askRelease(allocation) : undefined} />)}</section>}

        {panelKind === "service-list" && <FloorServiceAccounts accounts={serviceAccounts} unserved={service.snapshot?.unserved ?? []} loading={serviceLoading} error={service.error} historical={historical} onRefresh={() => void service.refresh()} onRecover={(group) => openServiceWindow({ ...group, recovery: true })} onChoose={(account) => {
          const tableId = account.tableIds.slice().sort()[0];
          if (tableId) openServiceWindow({ allocationId: account.allocationId, customerName: account.customerName, reservationCode: account.reservationCode, tableLabels: account.tableLabels, tableId, partySize: account.partySize });
        }} />}

        {panelKind === "detail" && selectedAllocation && <div className="flex min-h-0 flex-1 flex-col"><div className={floorWindowBodyClass}>{!currentSelection && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Esta asignación ya no ocupa mesas en el horario consultado.</p>}<AllocationCard allocation={selectedAllocation} onRelease={currentSelection && canRelease(currentSelection) ? () => askRelease(currentSelection) : undefined} /></div><footer className={floorWindowFooterClass}><button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={() => openPanel("reservations")}><ArrowLeft size={15} />Ver todas las reservas</button></footer></div>}
      </fieldset>
    </FloatingModalWindow>
      );
    })}

    <FloorTableModal
      key={tableModalKey}
      open={activeTableModal !== null}
      title={tableModalTitle}
      badge={tableModalBadge}
      subtitle={tableModalSubtitle}
      closeDisabled={saving}
      hasUnsavedChanges={tableModalDirty && !modalServiceAccount?.closedAt}
      unsavedMessage={
        activeTableModal?.kind === "open-table"
          ? "Tenés datos ingresados para abrir esta mesa. ¿Descartar y cerrar?"
          : "Tenés ítems en el borrador o un cobro sin confirmar. ¿Descartar y cerrar?"
      }
      onRefresh={activeTableModal?.kind === "service" ? () => { void service.refresh(); void refresh(); } : undefined}
      refreshing={loading}
      onClose={closeTableModal}
    >
      {activeTableModal?.kind === "open-table" && (
        modalOpenTableRoom && modalOpenTableEntity && modalOpenTableEntity.active ? (
          <FloorOpenTableView
            room={modalOpenTableRoom}
            table={modalOpenTableEntity}
            sector={modalOpenTableSector}
            allocations={board?.allocations ?? []}
            at={board?.at ?? new Date().toISOString()}
            waiters={service.snapshot?.waiters ?? []}
            staffHref={readOnly ? undefined : `/admin/restaurants/${encodeURIComponent(restaurantId)}/staff`}
            loadingWaiters={serviceLoading}
            busy={saving}
            cashClosed={Boolean(service.snapshot?.cashClosed)}
            onDirtyChange={setTableModalDirty}
            onCancel={closeTableModal}
            onSubmit={async (payload) => {
              const account = await runServiceCommand({
                action: "open-table",
                roomId: modalOpenTableRoom.id,
                tableId: modalOpenTableEntity.id,
                ...payload,
              });
              setTableModalDirty(false);
              setActiveTableModal({
                kind: "service",
                target: {
                  allocationId: account.allocationId,
                  customerName: account.customerName,
                  reservationCode: account.reservationCode,
                  tableLabels: account.tableLabels,
                  tableId: modalOpenTableEntity.id,
                  partySize: account.partySize,
                },
              });
            }}
          />
        ) : (
          <div className="p-6">
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              La mesa ya no está disponible en este salón.
            </p>
          </div>
        )
      )}

      {activeTableModal?.kind === "service" && modalCurrentTarget && (
        <FloorServiceWindow
          target={modalCurrentTarget}
          account={modalServiceAccount}
          products={service.snapshot?.products ?? []}
          waiters={service.snapshot?.waiters ?? []}
          staffHref={readOnly ? undefined : `/admin/restaurants/${encodeURIComponent(restaurantId)}/staff`}
          restaurantName={restaurantName}
          timeZone={board?.timeZone ?? "America/Argentina/Buenos_Aires"}
          loading={serviceLoading}
          loadError={service.error}
          busy={saving}
          historical={historical}
          canOpen={canUseService && Boolean(modalServiceAllocation && !modalServiceAllocation.releasedAt)}
          allocationVersion={modalCurrentTarget.recovery ? modalRecoveryGroup?.expectedAllocationVersion : modalServiceAllocation?.version}
          conflict={Boolean(modalServiceAllocation?.serviceConflict)}
          cashClosed={Boolean(service.snapshot?.cashClosed)}
          onClose={closeTableModal}
          onDirtyChange={setTableModalDirty}
          onRefresh={() => { void service.refresh(); void refresh(); }}
          onCommand={runServiceCommand}
        />
      )}
    </FloorTableModal>

    <AdminModal open={panel === "release"} title="Liberar mesas" onClose={closePanel}>
        {panel === "release" && <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">
            Liberación de mesas para <strong className="text-[var(--floor-ink,#09090b)]">{releaseTarget?.customerName}</strong> ({releaseTarget?.code}) en {releaseTarget?.poses.map((pose) => pose.label).join(" + ")}:
          </p>
          <div className="space-y-2 rounded-xl border border-[var(--floor-border,#e4e4e7)] bg-[var(--floor-hover,#edf2e9)] p-3">
            <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--floor-ink,#09090b)] cursor-pointer">
              <input type="radio" name="releaseReason" value="COMPLETED" checked={releaseReason === "COMPLETED"} onChange={() => setReleaseReason("COMPLETED")} />
              <span>El grupo ya se retiró (Finalizar visita)</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm font-medium text-amber-900 cursor-pointer">
              <input type="radio" name="releaseReason" value="NO_SHOW" checked={releaseReason === "NO_SHOW"} onChange={() => setReleaseReason("NO_SHOW")} />
              <span>No se presentó (Registrar No-Show)</span>
            </label>
          </div>
          {releaseError && <p role="alert" className="text-sm text-red-800">{releaseError}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-4">
            <button {...transientButtonProps} type="button" disabled={saving} className={adminSecondaryButtonClass} onClick={() => openPanel("reservations")}>Cancelar</button>
            <button {...transientButtonProps} type="button" disabled={saving} className={adminPrimaryButtonClass} onClick={() => void releaseReservation()}>{saving ? "Liberando…" : "Confirmar liberación"}</button>
          </div>
        </div>}
    </AdminModal>

  </main>;
}

function AllocationCard({ allocation, onDetails, onRelease, serviceTargets = [], onService }: { allocation: FloorAllocationView; onDetails?: () => void; onRelease?: () => void; serviceTargets?: FloorServiceTarget[]; onService?: (target: FloorServiceTarget) => void }) {
  return <article className="border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--floor-ink,#09090b)]">{allocation.customerName}</h3><p className="mt-1 text-sm text-[var(--floor-muted,#3f3f46)]">{allocation.poses.map((pose) => pose.label).join(" + ")} · {allocation.time} hs{allocation.source === "WALK_IN" && " · Sin reserva"}</p></div><span className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--floor-hover,#eef2e9)] px-2 py-1 text-xs font-semibold text-[var(--floor-action,#2d4628)]"><Users size={13} />{allocation.partySize}</span></div>
    {allocation.serviceConflict && <p className="mt-2 text-xs text-amber-950">Las mesas siguen ocupadas por una cuenta anterior.</p>}
    {allocation.serviceOverrun && <p className="mt-2 text-xs text-amber-950">Servicio activo fuera del horario previsto.</p>}
    {allocation.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--floor-muted,#52525b)]">{allocation.notes}</p>}
    <div className="mt-3 flex flex-wrap gap-3">{onDetails && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onDetails}>Ver detalle</button>}{onRelease && <button {...transientButtonProps} type="button" className={adminSecondaryButtonClass} onClick={onRelease}>Liberar mesas</button>}
      {onService && serviceTargets.map((target) => <button key={target.tableId} type="button" className={adminSecondaryButtonClass} onClick={() => onService(target)}><ReceiptText size={15} aria-hidden="true" />Cuenta {target.tableLabels.join(" + ")}</button>)}
    </div>
  </article>;
}
