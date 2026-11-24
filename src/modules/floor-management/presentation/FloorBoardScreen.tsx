"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Hand,
  List,
  Loader2,
  PanelRight,
  ReceiptText,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import { LogoutButton } from "@/modules/identity-access/ui";
import { AdminModal } from "@/ui/admin/AdminUI";
import { transientButtonProps } from "@/ui/button-state";
import {
  calculateFloorInterval,
  composeRoomPoses,
  getJoinedTableGroups,
  restaurantLocalDateTime,
  summarizeSectorQuota,
  type FloorAllocationView,
  type FloorBoardView,
  type FloorPose,
} from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import {
  FloorBoardInspector,
  buildAllocationTargets,
  type BoardInspectorTab,
  type BoardInspectorTableItem,
} from "./FloorBoardInspector";
import { deriveKitchenTickets } from "./FloorKitchenTicketsPanel";
import { FloorOpenTableView } from "./FloorOpenTableView";
import { FloorServiceWindow, type FloorServiceTarget } from "./FloorServiceWindow";
import { FloorTableModal } from "./FloorTableModal";
import { floorInputClass, getFloorBoard, saveFloorAction } from "./floor-api";
import styles from "./floor-operations.module.css";
import { summarizeFloorTables } from "./floor-table-summary";
import { floorPrimaryButtonClass, floorSecondaryButtonClass } from "./floor-ui";
import { floorBoardReceived, floorBoardSeed, floorBoardWorkspace } from "./floor-workspaces";
import { useFloorService, type FloorServiceCommand } from "./useFloorService";

function serviceTarget(allocation: FloorAllocationView, group: FloorPose[]): FloorServiceTarget {
  return {
    allocationId: allocation.id,
    customerName: allocation.customerName,
    reservationCode: allocation.code,
    tableLabels: group.map(({ label }) => label),
    tableId: group.map(({ tableId }) => tableId).sort()[0],
    partySize: allocation.partySize,
  };
}

type FloorBoardProps = {
  restaurantId: string;
  restaurantName: string;
  readOnly: boolean;
  canManageWalkIns?: boolean;
  initialBoard?: FloorBoardView | null;
};

export function FloorBoardScreen(props: FloorBoardProps) {
  const { restaurantId, readOnly, canManageWalkIns = false, initialBoard = null } = props;
  return (
    <floorBoardWorkspace.Provider
      key={restaurantId + ":" + readOnly + ":" + canManageWalkIns}
      seed={floorBoardSeed(initialBoard)}
    >
      <FloorBoardContent {...props} />
    </floorBoardWorkspace.Provider>
  );
}

function FloorBoardContent({
  restaurantId,
  restaurantName,
  readOnly,
  canManageWalkIns = false,
  initialBoard = null,
}: FloorBoardProps) {
  const store = floorBoardWorkspace.useStore();
  const [board] = floorBoardWorkspace.useField("board");
  const [roomId, setRoomId] = floorBoardWorkspace.useField("roomId");
  const [query, setQuery] = floorBoardWorkspace.useField("query");
  const initialQuery = useRef(query);
  const [schedule, setSchedule] = useState({ date: "", time: "" });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [roomsMenuOpen, setRoomsMenuOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<BoardInspectorTab>("summary");
  const [tableFilter, setTableFilter] = useState<"all" | "available" | "reserved" | "occupied">("all");
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);

  const [error] = floorBoardWorkspace.useField("error");
  const [loading] = floorBoardWorkspace.useField("loading");
  const [releaseTarget, setReleaseTarget] = useState<FloorAllocationView | null>(null);
  const [releaseReason, setReleaseReason] = useState<"COMPLETED" | "NO_SHOW">("COMPLETED");
  const [refreshedAt] = floorBoardWorkspace.useField("refreshedAt");
  const [floorSaving, setSaving] = floorBoardWorkspace.useField("saving");
  const [operationError, setOperationError] = floorBoardWorkspace.useField("operationError");
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = floorBoardWorkspace.useField("interactionMode");
  const [activeTableModal, setActiveTableModal] = floorBoardWorkspace.useField("activeTableModal");
  const [tableModalDirty, setTableModalDirty] = floorBoardWorkspace.useField("tableModalDirty");

  const roomsTriggerRef = useRef<HTMLButtonElement>(null);
  const roomsPopupRef = useRef<HTMLDivElement>(null);
  const scheduleTriggerRef = useRef<HTMLButtonElement>(null);
  const schedulePopupRef = useRef<HTMLDivElement>(null);
  const boardSurface = useRef<HTMLDivElement>(null);
  const roomsPopupId = useId();
  const scheduleDialogId = useId();

  const canManageTables = !readOnly || canManageWalkIns;
  const canUseService = Boolean(board?.enabled && canManageTables);
  const historical = Boolean(query.date);
  const serviceTime = historical
    ? calculateFloorInterval({ ...query, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" }).serviceStartAt
    : undefined;
  const service = useFloorService(restaurantId, canUseService, serviceTime);
  const serviceAccounts = service.snapshot?.accounts ?? [];
  const serviceLoading = !service.snapshot && !service.error;
  const saving = floorSaving || service.busy;
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const closeTableModal = () => {
    setActiveTableModal(null);
    setTableModalDirty(false);
  };
  const hasPendingChanges = tableModalDirty;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!hasPendingChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasPendingChanges]);

  useEffect(() => {
    if (!roomsMenuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const selected = roomsPopupRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      (selected ?? roomsPopupRef.current?.querySelector<HTMLButtonElement>("button") ?? roomsPopupRef.current)?.focus();
    });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !roomsPopupRef.current?.contains(target) && !roomsTriggerRef.current?.contains(target)) {
        setRoomsMenuOpen(false);
        if (!(target instanceof Element) || !target.closest("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")) {
          roomsTriggerRef.current?.focus();
        }
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setRoomsMenuOpen(false);
      roomsTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [roomsMenuOpen]);

  useEffect(() => {
    if (!scheduleOpen) return;
    const frame = window.requestAnimationFrame(() => {
      schedulePopupRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !schedulePopupRef.current?.contains(target) && !scheduleTriggerRef.current?.contains(target)) {
        setScheduleOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setScheduleOpen(false);
      scheduleTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [scheduleOpen]);

  const beginMutation = () => {
    if (store.getState().saving) return false;
    pending.current?.abort();
    store.dispatch(floorBoardWorkspace.changed({ loading: false, saving: true }));
    return true;
  };

  const refresh = useCallback(
    async (afterMutation = false) => {
      const snapshot = store.getState();
      if (!mounted.current || (snapshot.saving && !afterMutation)) return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      store.dispatch(floorBoardWorkspace.changed({ loading: true }));
      const isCurrent = () => !controller.signal.aborted && store.getState().query === snapshot.query;
      try {
        const timeZone = snapshot.board?.timeZone ?? "America/Argentina/Buenos_Aires";
        const currentQuery = snapshot.query;
        const at = currentQuery.date
          ? calculateFloorInterval({ date: currentQuery.date, time: currentQuery.time || "20:00", timeZone }).serviceStartAt
          : new Date().toISOString();
        const next = currentQuery.date
          ? await getFloorBoard(restaurantId, at, controller.signal)
          : await getFloorBoard(restaurantId, at, controller.signal, true);
        if (isCurrent()) store.dispatch(floorBoardReceived({ board: next, refreshedAt: new Date().toISOString() }));
      } catch (failure) {
        if (isCurrent()) {
          store.dispatch(
            floorBoardWorkspace.changed({
              error: failure instanceof Error ? failure.message : "No se pudo actualizar la sala.",
            }),
          );
        }
      } finally {
        if (pending.current === controller) {
          pending.current = null;
          if (!controller.signal.aborted) store.dispatch(floorBoardWorkspace.changed({ loading: false }));
        }
      }
    },
    [restaurantId, store],
  );

  useEffect(() => {
    // Reuse the server snapshot on arrival; a changed time query must still refresh immediately.
    const initial = initialBoard && query === initialQuery.current ? null : window.setTimeout(() => { void refresh(); }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      if (initial !== null) window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      pending.current?.abort();
    };
  }, [refresh, initialBoard, query]);

  const room = board?.rooms.find((item) => item.id === roomId);
  const allocations = board?.allocations.filter((item) => item.roomId === roomId) ?? [];
  const local = board ? restaurantLocalDateTime(board.timeZone, new Date(board.at)) : { date: "", time: "" };
  const poses = room && board ? composeRoomPoses(room, board.allocations, board.at) : [];

  const openAccountByTableId = new Map<string, (typeof serviceAccounts)[number]>();
  const readyByTable = new Map<string, number>();
  for (const acc of serviceAccounts) {
    if (!acc.closedAt) {
      for (const tid of acc.tableIds) openAccountByTableId.set(tid, acc);
    }
    if (acc.readyQuantity > 0) {
      for (const tid of acc.tableIds) readyByTable.set(tid, (readyByTable.get(tid) ?? 0) + acc.readyQuantity);
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
              ...table,
              x,
              y,
              rotation,
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
              ...table,
              x,
              y,
              rotation,
              state: "reserved" as const,
              partySize: guests,
              readyQuantity: readyByTable.get(table.id) ?? 0,
              subtitle: `${guests}p · Res.`,
            };
          }
          return {
            ...table,
            x,
            y,
            rotation,
            state: "available" as const,
            subtitle: `${table.capacity}p · Libre`,
          };
        })
    : [];

  const inspectorTables: BoardInspectorTableItem[] = room
    ? room.tables
        .filter((table) => table.active)
        .map((table) => {
          const openAccount = openAccountByTableId.get(table.id);
          const activePose = poseByTableId.get(table.id);
          const allocation = allocationByTableId.get(table.id);
          if (openAccount) {
            return {
              id: table.id,
              label: table.label,
              capacity: table.capacity,
              locationId: table.locationId,
              state: "occupied",
              partySize: openAccount.partySize,
              readyQuantity: openAccount.readyQuantity,
              hasPartialPayments: openAccount.payments.length > 0,
              customerName: openAccount.customerName,
              waiterName: openAccount.assignedWaiterName ?? undefined,
            };
          }
          if (activePose || allocation) {
            return {
              id: table.id,
              label: table.label,
              capacity: table.capacity,
              locationId: table.locationId,
              state: "reserved",
              partySize: allocation?.partySize ?? table.capacity,
              readyQuantity: readyByTable.get(table.id) ?? 0,
              customerName: allocation?.customerName,
            };
          }
          return {
            id: table.id,
            label: table.label,
            capacity: table.capacity,
            locationId: table.locationId,
            state: "available",
          };
        })
    : [];

  const activeSectors = room ? room.locations.filter((loc) => loc.active) : [];
  const boardRoom =
    room && board
      ? {
          ...room,
          locations: activeSectors.map((loc) => {
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
        }
      : room;

  const joinedGroups = allocations.flatMap((allocation) =>
    getJoinedTableGroups(allocation.poses)
      .filter((group) => group.length > 1)
      .map((group) => ({
        id: `${allocation.id}:${group.map((pose) => pose.tableId).sort().join(":")}`,
        tableIds: group.map((pose) => pose.tableId),
        label: group.map((pose) => pose.label).join(" + "),
      })),
  );

  const canRelease = (allocation: FloorAllocationView) =>
    canManageWalkIns &&
    !query.date &&
    !allocation.releasedAt &&
    !allocation.serviceOverrun &&
    !allocation.servicePartiallyReleased &&
    !serviceAccounts.some((account) => account.allocationId === allocation.id && !account.closedAt);

  const openServiceWindow = (target: FloorServiceTarget) => {
    if (!canUseService || saving) return;
    setInteractionMode("service");
    setTableModalDirty(false);
    setActiveTableModal({ kind: "service", target });
  };

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
      const group = getJoinedTableGroups(allocation.poses).find((groupPoses) =>
        groupPoses.some((pose) => pose.tableId === tableId),
      );
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
      command.action === "open" ||
      command.action === "open-table" ||
      command.action === "assign-waiter" ||
      command.action === "checkout" ||
      command.action === "close-empty" ||
      (command.action === "pay-partial" && account.closedAt !== null)
    ) {
      void refresh(true);
    }
    return account;
  };

  const askRelease = (allocation: FloorAllocationView) => {
    setReleaseTarget(allocation);
    setReleaseReason("COMPLETED");
    setReleaseError(null);
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
      setReleaseTarget(null);
      await refresh(true);
    } catch (failure) {
      setReleaseError(
        failure instanceof Error ? failure.message : "No se pudieron liberar las mesas. Actualizá la sala y volvé a intentar.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSchedule = () => {
    if (saving || !board) return;
    setRoomsMenuOpen(false);
    if (!scheduleOpen) {
      setSchedule({ date: query.date || local.date, time: query.time || local.time });
      setScheduleError(null);
    }
    setScheduleOpen((open) => !open);
  };

  const applySchedule = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      calculateFloorInterval({ ...schedule, timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires" });
      setQuery({ ...schedule });
      setScheduleError(null);
      setScheduleOpen(false);
    } catch (failure) {
      setScheduleError(failure instanceof Error ? failure.message : "Revisá la fecha y hora elegidas.");
    }
  };

  const openInspectorTab = (tab: BoardInspectorTab) => {
    setRoomsMenuOpen(false);
    setScheduleOpen(false);
    if (tab !== "reservations") setSelectedAllocationId(null);
    setInspectorTab(tab);
    setInspectorOpen(true);
  };

  const focusTableFilter = (filter: "all" | "available" | "reserved" | "occupied") => {
    setTableFilter(filter);
    openInspectorTab("summary");
  };

  const when =
    query.date && board
      ? new Intl.DateTimeFormat("es-AR", {
          timeZone: board.timeZone,
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(board.at))
      : `Ahora${local.time ? ` · ${local.time}` : ""}`;

  const syncedTimeLabel = refreshedAt
    ? `Actualizado ${new Intl.DateTimeFormat("es-AR", {
        timeZone: board?.timeZone ?? "America/Argentina/Buenos_Aires",
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(refreshedAt))}`
    : "Consultando…";

  const openAccountsCount = serviceAccounts.filter((acc) => !acc.closedAt).length;
  const kitchenTickets = deriveKitchenTickets(serviceAccounts);
  const kitchenReadyCount = kitchenTickets.reduce(
    (sum, ticket) => sum + ticket.lines.filter((line) => line.kitchenStatus === "READY").length,
    0,
  );
  const sectorAlert = tableCounts?.sectors.find((sector) => sector.status === "exceeded" || sector.status === "warning");
  const navigationDisabled = saving || hasPendingChanges;

  const modalOpenTableTarget = activeTableModal?.kind === "open-table" ? activeTableModal : undefined;
  const modalOpenTableRoom = modalOpenTableTarget ? board?.rooms.find((item) => item.id === modalOpenTableTarget.roomId) : undefined;
  const modalOpenTableEntity =
    modalOpenTableTarget && modalOpenTableRoom ? modalOpenTableRoom.tables.find((item) => item.id === modalOpenTableTarget.tableId) : undefined;
  const modalOpenTableSector = modalOpenTableEntity?.locationId
    ? modalOpenTableRoom?.locations.find((loc) => loc.id === modalOpenTableEntity.locationId && loc.active)
    : modalOpenTableRoom?.locations.find((loc) => loc.active);

  const modalServiceTarget = activeTableModal?.kind === "service" ? activeTableModal.target : undefined;
  const modalServiceAllocation =
    modalServiceTarget &&
    board?.allocations.find(
      (allocation) => allocation.id === modalServiceTarget.allocationId && allocation.poses.some((pose) => pose.tableId === modalServiceTarget.tableId),
    );
  const modalServiceAccount =
    modalServiceTarget &&
    serviceAccounts.find(
      (account) => account.allocationId === modalServiceTarget.allocationId && account.tableIds.includes(modalServiceTarget.tableId),
    );
  const modalRecoveryGroup = modalServiceTarget?.recovery
    ? service.snapshot?.unserved.find(
        (group) => group.allocationId === modalServiceTarget.allocationId && group.tableId === modalServiceTarget.tableId,
      )
    : undefined;
  const modalCurrentGroup =
    modalServiceAllocation &&
    modalServiceTarget &&
    getJoinedTableGroups(modalServiceAllocation.poses).find((group) => group.some(({ tableId }) => tableId === modalServiceTarget.tableId));
  const modalCurrentTarget =
    modalCurrentGroup && modalServiceAllocation && modalServiceTarget
      ? { ...modalServiceTarget, tableLabels: modalCurrentGroup.map(({ label }) => label) }
      : modalServiceTarget;

  const tableModalKey = activeTableModal
    ? activeTableModal.kind === "open-table"
      ? `open-table:${activeTableModal.roomId}:${activeTableModal.tableId}`
      : `service:${activeTableModal.target.allocationId}:${activeTableModal.target.tableId}`
    : "closed";
  const tableModalTitle =
    activeTableModal?.kind === "open-table"
      ? "Abrir mesa"
      : modalCurrentTarget
        ? `Cuenta · ${modalCurrentTarget.customerName}`
        : "Atención de mesa";
  const tableModalBadge =
    activeTableModal?.kind === "open-table"
      ? modalOpenTableEntity
        ? `Mesa ${modalOpenTableEntity.label}`
        : undefined
      : modalCurrentTarget
        ? `Mesa ${modalCurrentTarget.tableLabels.join(" + ")}`
        : undefined;
  const tableModalSubtitle =
    activeTableModal?.kind === "open-table"
      ? [modalOpenTableSector?.name, modalOpenTableRoom?.name].filter(Boolean).join(" · ")
      : modalCurrentTarget
        ? [
            modalServiceAccount?.roomName ?? room?.name ?? restaurantName,
            modalCurrentTarget.partySize
              ? `${modalCurrentTarget.partySize} ${modalCurrentTarget.partySize === 1 ? "comensal" : "comensales"}`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ")
        : undefined;

  const topBarButton =
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <main data-admin-panel data-floor-operations className={`${styles.screen} flex h-dvh flex-col overflow-hidden bg-[#eef4f6]`}>
      <h1 className="sr-only">Sala · {restaurantName}</h1>

      {/* Zone 1: Structural Top Operational Bar */}
      <header className="relative z-30 shrink-0 border-b border-[var(--floor-border,#cad9df)] bg-white px-3 py-2 sm:px-4">
        <nav aria-label="Herramientas de sala" className="flex w-full flex-wrap items-center justify-between gap-2">
        {/* Left: Room Selector, Schedule Picker & Sync Status */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative">
            <button
              ref={roomsTriggerRef}
              {...transientButtonProps}
              type="button"
              aria-label="Cambiar salón"
              title="Salones"
              aria-controls={roomsPopupId}
              aria-expanded={roomsMenuOpen}
              disabled={!board || saving}
              onClick={() => {
                setScheduleOpen(false);
                setRoomsMenuOpen((open) => !open);
              }}
              className="inline-flex h-10 max-w-60 items-center gap-2 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[#f7fbfc] px-3 text-left transition-colors hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Building2 size={16} className="shrink-0 text-[var(--floor-action,#155e75)]" aria-hidden="true" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[10px] font-medium text-[var(--floor-muted,#4b6470)]">{restaurantName}</span>
                <span className="block truncate text-xs font-bold text-[var(--floor-ink,#173642)]">{room?.name ?? "Elegir salón"}</span>
              </span>
              <ChevronDown size={14} className="shrink-0 text-[var(--floor-muted,#4b6470)]" aria-hidden="true" />
            </button>

            {roomsMenuOpen && (
              <div
                ref={roomsPopupRef}
                id={roomsPopupId}
                tabIndex={-1}
                className="absolute left-0 top-[calc(100%+0.5rem)] z-40 max-h-[min(22rem,calc(100dvh-6rem))] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-2.5 shadow-[0_12px_32px_-8px_rgba(15,45,58,0.2)] outline-none"
              >
                <p className="mb-1.5 px-2 text-xs font-bold text-[var(--floor-ink,#173642)]">Elegir salón</p>
                <nav aria-label="Salones" className="space-y-1">
                  {(board?.rooms ?? [])
                    .filter((item) => item.active)
                    .map((item) => (
                      <button
                        key={item.id}
                        {...transientButtonProps}
                        type="button"
                        aria-pressed={item.id === roomId}
                        onClick={() => {
                          if (item.id !== roomId) {
                            if (
                              hasPendingChanges &&
                              !window.confirm("Hay cambios sin guardar en las ventanas. ¿Querés descartarlos y cambiar de salón?")
                            ) {
                              return;
                            }
                            closeTableModal();
                            setSelectedAllocationId(null);
                          }
                          setRoomId(item.id);
                          setRoomsMenuOpen(false);
                          roomsTriggerRef.current?.focus();
                        }}
                        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] ${
                          item.id === roomId ? "bg-[var(--floor-hover,#e6f2f6)] font-semibold text-[var(--floor-ink,#173642)]" : ""
                        }`}
                      >
                        <span className="min-w-0 truncate">{item.name}</span>
                        {item.id === roomId && <Check size={15} className="shrink-0 text-[var(--floor-action,#155e75)]" />}
                      </button>
                    ))}
                </nav>
                {!(board?.rooms ?? []).some((item) => item.active) && (
                  <p className="px-2 py-3 text-xs text-[var(--floor-muted,#4b6470)]">No hay salones activos disponibles.</p>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              ref={scheduleTriggerRef}
              {...transientButtonProps}
              type="button"
              aria-label="Fecha y hora"
              title="Fecha y hora"
              aria-haspopup="dialog"
              aria-controls={scheduleDialogId}
              aria-expanded={scheduleOpen}
              disabled={!board || saving}
              onClick={toggleSchedule}
              className={`${topBarButton} border ${
                historical
                  ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                  : "border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
              }`}
            >
              <CalendarClock size={15} aria-hidden="true" />
              <span>{when}</span>
            </button>

            {scheduleOpen && (
              <div
                ref={schedulePopupRef}
                id={scheduleDialogId}
                role="dialog"
                aria-modal="false"
                aria-label="Fecha y hora"
                className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 shadow-[0_12px_32px_-8px_rgba(15,45,58,0.2)]"
              >
                <form className="space-y-3" onSubmit={applySchedule}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Consultar horario</h2>
                      <p className="mt-0.5 text-xs text-[var(--floor-muted,#4b6470)]">
                        Horarios en {board?.timeZone ?? "hora local"}.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Cerrar horario"
                      onClick={() => setScheduleOpen(false)}
                      className="rounded-md p-1 text-[var(--floor-muted,#4b6470)] hover:bg-[var(--floor-hover,#e6f2f6)] hover:text-[var(--floor-ink,#173642)]"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#4b6470)]">
                      Fecha
                      <input
                        type="date"
                        required
                        value={schedule.date}
                        className={floorInputClass}
                        onChange={(event) => setSchedule((value) => ({ ...value, date: event.target.value }))}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#4b6470)]">
                      Hora
                      <input
                        type="time"
                        required
                        value={schedule.time}
                        className={floorInputClass}
                        onChange={(event) => setSchedule((value) => ({ ...value, time: event.target.value }))}
                      />
                    </label>
                  </div>
                  {scheduleError && (
                    <p role="alert" className="text-xs text-red-800">
                      {scheduleError}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-between gap-2 pt-1">
                    <button
                      {...transientButtonProps}
                      type="button"
                      className={`${floorSecondaryButtonClass} min-h-9 px-3 text-xs`}
                      onClick={() => {
                        setQuery({ date: "", time: "" });
                        setScheduleOpen(false);
                      }}
                    >
                      <Clock size={14} aria-hidden="true" />
                      Volver a ahora
                    </button>
                    <button {...transientButtonProps} type="submit" className={`${floorPrimaryButtonClass} min-h-9 px-3 text-xs`}>
                      Ver este horario
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="inline-flex items-center rounded-lg border border-transparent md:border-[var(--floor-border,#cad9df)] md:bg-[#f7fbfc] md:px-2.5 md:py-1.5 text-[11px] text-[var(--floor-muted,#4b6470)]">
            <span role="status" className="sr-only md:not-sr-only md:inline">{syncedTimeLabel}</span>
          </div>

          <button
            {...transientButtonProps}
            type="button"
            aria-label="Actualizar"
            title="Actualizar sala"
            disabled={loading}
            onClick={() => {
              setOperationError(null);
              void refresh();
              void service.refresh();
            }}
            className={`${topBarButton} border border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span className="hidden 2xl:inline">Actualizar</span>
          </button>
        </div>

        {/* Center: Operational Interaction Mode + Quick KPI Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {canUseService && (
            <div
              role="group"
              aria-label="Modo del tablero"
              className="flex items-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-[#eef4f6] p-0.5"
            >
              <button
                {...transientButtonProps}
                type="button"
                aria-pressed={interactionMode === "service"}
                onClick={() => setInteractionMode("service")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                  interactionMode === "service"
                    ? "bg-[var(--floor-action,#155e75)] text-white"
                    : "text-[var(--floor-ink,#173642)] hover:bg-white"
                }`}
              >
                <ReceiptText size={14} aria-hidden="true" />
                <span>{historical ? "Consulta" : "Atender"}</span>
              </button>
              <button
                {...transientButtonProps}
                type="button"
                aria-pressed={interactionMode === "pan"}
                onClick={() => setInteractionMode("pan")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                  interactionMode === "pan"
                    ? "bg-[var(--floor-action,#155e75)] text-white"
                    : "text-[var(--floor-ink,#173642)] hover:bg-white"
                }`}
              >
                <Hand size={14} aria-hidden="true" />
                <span>Mover vista</span>
              </button>
            </div>
          )}

          {tableCounts && (
            <div className="hidden items-center gap-1.5 lg:flex" aria-label="Resumen rápido">
              <button
                type="button"
                onClick={() => focusTableFilter("available")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cad9df] bg-[#f4fafb] px-2.5 text-xs font-semibold text-[#155e75] hover:bg-[#e6f2f6]"
              >
                <span>Libres</span>
                <span className="tabular-nums">{tableCounts.free}</span>
              </button>
              <button
                type="button"
                onClick={() => focusTableFilter("reserved")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e7cab8] bg-[#fdf5ef] px-2.5 text-xs font-semibold text-[#8c4b2e] hover:bg-[#f8ebe2]"
              >
                <span>Reserv.</span>
                <span className="tabular-nums">{tableCounts.reserved}</span>
              </button>
              <button
                type="button"
                onClick={() => focusTableFilter("occupied")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#9ec9d8] bg-[#eaf5f9] px-2.5 text-xs font-semibold text-[#0e4d63] hover:bg-[#dbeff5]"
              >
                <span>Ocup.</span>
                <span className="tabular-nums">{tableCounts.occupied}</span>
              </button>
              {sectorAlert && (
                <button
                  type="button"
                  onClick={() => openInspectorTab("summary")}
                  title={`${sectorAlert.name}: ${sectorAlert.status === "exceeded" ? "Cupo superado" : "Cerca del cupo"}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
                >
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>Cupo</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Panel Tab Shortcuts, Panel Toggle, Admin & Logout */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            {...transientButtonProps}
            type="button"
            aria-label="Reservas"
            title={`Reservas · ${allocations.length}`}
            disabled={!board || saving}
            onClick={() => openInspectorTab("reservations")}
            className={`${topBarButton} border ${
              inspectorOpen && inspectorTab === "reservations"
                ? "border-[var(--floor-action,#155e75)] bg-[#e6f2f6] text-[var(--floor-ink,#173642)]"
                : "border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
            }`}
          >
            <List size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Reservas</span>
            <span className="rounded-full bg-[#eef4f6] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--floor-muted,#4b6470)]">
              {allocations.length}
            </span>
          </button>

          {canUseService && (
            <button
              {...transientButtonProps}
              type="button"
              aria-label="Cuentas de servicio"
              title="Cuentas de servicio"
              disabled={saving}
              onClick={() => openInspectorTab("accounts")}
              className={`${topBarButton} border ${
                inspectorOpen && inspectorTab === "accounts"
                  ? "border-[var(--floor-action,#155e75)] bg-[#e6f2f6] text-[var(--floor-ink,#173642)]"
                  : "border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
              }`}
            >
              <ReceiptText size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Cuentas</span>
              {openAccountsCount > 0 && (
                <span className="rounded-full bg-[var(--floor-action,#155e75)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                  {openAccountsCount}
                </span>
              )}
            </button>
          )}

          {canUseService && (
            <button
              {...transientButtonProps}
              type="button"
              aria-label="Tickets de cocina"
              title="Tickets de cocina y barra"
              disabled={saving}
              onClick={() => openInspectorTab("kitchen")}
              className={`${topBarButton} border ${
                inspectorOpen && inspectorTab === "kitchen"
                  ? "border-[var(--floor-action,#155e75)] bg-[#e6f2f6] text-[var(--floor-ink,#173642)]"
                  : kitchenReadyCount > 0
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                    : "border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
              }`}
            >
              <ChefHat size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Cocina</span>
              {(kitchenTickets.length > 0 || kitchenReadyCount > 0) && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    kitchenReadyCount > 0
                      ? "bg-emerald-700 text-white"
                      : "bg-[#eef4f6] text-[var(--floor-ink,#173642)]"
                  }`}
                >
                  {kitchenTickets.length}
                </span>
              )}
            </button>
          )}

          <button
            {...transientButtonProps}
            type="button"
            aria-label={inspectorOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
            title={inspectorOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
            aria-pressed={inspectorOpen}
            onClick={() => setInspectorOpen((open) => !open)}
            className={`${topBarButton} border border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]`}
          >
            <PanelRight size={15} aria-hidden="true" />
            <span className="hidden xl:inline">{inspectorOpen ? "Panel" : "Ver panel"}</span>
          </button>

          {!readOnly && (
            <Link
              href={`/admin/restaurants/${encodeURIComponent(restaurantId)}/rooms`}
              aria-label="Administrar"
              title="Administrar salones"
              aria-disabled={navigationDisabled || undefined}
              tabIndex={navigationDisabled ? -1 : undefined}
              onClick={(event) => {
                if (navigationDisabled) event.preventDefault();
                else setRoomsMenuOpen(false);
              }}
              className={`${topBarButton} border border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)] ${
                navigationDisabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <Settings2 size={15} aria-hidden="true" />
              <span className="hidden md:inline">Administrar</span>
            </Link>
          )}

          <LogoutButton compact disabled={navigationDisabled} />
        </div>
        </nav>
      </header>

      {/* Main Content Area: Unobstructed Canvas + Full-Height Docked Operational Inspector */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Zone 2: Clean 2D Operational Canvas */}
        <div
          ref={boardSurface}
          tabIndex={-1}
          role="region"
          aria-label="Tablero principal de sala"
          className="relative min-w-0 flex-1 bg-[#eef4f6] outline-none"
        >
          {boardRoom && (
            <FloorCanvas
              key={boardRoom.id}
              appearance="operational"
              fullScreen
              hideModeSwitch
              room={boardRoom}
              tables={canvasTables}
              joinedGroups={joinedGroups}
              selectJoinedTables
              interactionMode={interactionMode}
              onInteractionModeChange={setInteractionMode}
              onServiceTable={canUseService ? handleTableClick : undefined}
            />
          )}

          {!room && (
            <div className="absolute inset-0 grid place-items-center p-8">
              <div className="max-w-sm text-center">
                <Building2 size={30} className="mx-auto mb-4 text-[#4b6470]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-[var(--floor-ink,#173642)]">
                  {board ? "No hay salones activos" : "Preparando la sala…"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--floor-muted,#4b6470)]">
                  {board ? "Usá la barra superior para administrar los salones o volvé a actualizar." : "Cargando sectores y mesas asignadas."}
                </p>
              </div>
            </div>
          )}

          {/* Subtle Top Feedback Strip */}
          <div className="pointer-events-none absolute left-4 right-4 top-3 z-10 max-w-lg space-y-2">
            {canUseService && interactionMode === "service" && (
              <p className="w-fit rounded-lg border border-[var(--floor-border,#cad9df)] bg-white/95 px-2.5 py-1 text-xs font-medium text-[var(--floor-ink,#173642)] shadow-xs">
                {historical ? "Consulta de servicio · solo lectura" : "Tocá una mesa para abrirla o ver su cuenta"}
              </p>
            )}
            {error && (
              <p role="alert" className="pointer-events-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
                {board && " Se conserva la última vista disponible."}
              </p>
            )}
            {operationError && (
              <p role="alert" className="pointer-events-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {operationError}
              </p>
            )}
            {board && !board.enabled && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
                La asignación de mesas todavía no está activada.
              </p>
            )}
          </div>
        </div>

        {/* Zone 3: Full-Height Docked Operational Sidebar */}
        {inspectorOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => setInspectorOpen(false)}
              className="fixed inset-0 z-20 bg-zinc-950/25 xl:hidden"
            />
            <aside
              aria-label="Panel operativo de sala"
              className="fixed inset-y-0 right-0 z-30 flex h-full w-full max-w-sm shrink-0 flex-col border-l border-[var(--floor-border,#cad9df)] bg-white shadow-xl xl:static xl:z-auto xl:w-96 xl:max-w-none xl:shadow-none"
            >
              <FloorBoardInspector
                activeTab={inspectorTab}
                onTabChange={setInspectorTab}
                tableFilter={tableFilter}
                onTableFilterChange={setTableFilter}
                roomName={room?.name ?? "la sala"}
                when={when}
                historical={historical}
                canUseService={canUseService}
                saving={saving}
                tableCounts={tableCounts}
                sectors={activeSectors}
                tables={inspectorTables}
                allocations={allocations}
                serviceAccounts={serviceAccounts}
                unservedGroups={service.snapshot?.unserved ?? []}
                serviceLoading={serviceLoading}
                serviceError={service.error}
                kitchenHref={readOnly ? undefined : `/admin/restaurants/${encodeURIComponent(restaurantId)}/kitchen`}
                selectedAllocationId={selectedAllocationId}
                onSelectAllocationId={setSelectedAllocationId}
                onTableAction={handleTableClick}
                onOpenService={openServiceWindow}
                onRecoverGroup={(group) => openServiceWindow({ ...group, recovery: true })}
                onRefreshService={() => void service.refresh()}
                onUpdateKitchenStatus={service.updateKitchenStatus}
                onReleaseAllocation={askRelease}
                canReleaseAllocation={canRelease}
                serviceTargetsForAllocation={buildAllocationTargets}
                onCloseMobile={() => setInspectorOpen(false)}
              />
            </aside>
          </>
        )}
      </div>

      {/* Table Service & Onboarding Dialog */}
      <FloorTableModal
        key={tableModalKey}
        open={activeTableModal !== null}
        title={tableModalTitle}
        badge={tableModalBadge}
        subtitle={tableModalSubtitle}
        size={
          activeTableModal?.kind === "service" &&
          modalServiceAccount &&
          !modalServiceAccount.closedAt &&
          !modalCurrentTarget?.recovery
            ? "wide"
            : "compact"
        }
        closeDisabled={saving}
        hasUnsavedChanges={tableModalDirty && !modalServiceAccount?.closedAt}
        unsavedMessage={
          activeTableModal?.kind === "open-table"
            ? "Tenés datos ingresados para abrir esta mesa. ¿Descartar y cerrar?"
            : "Tenés ítems en el borrador o un cobro sin confirmar. ¿Descartar y cerrar?"
        }
        onRefresh={
          activeTableModal?.kind === "service"
            ? () => {
                void service.refresh();
                void refresh();
              }
            : undefined
        }
        refreshing={loading}
        onClose={closeTableModal}
      >
        {activeTableModal?.kind === "open-table" &&
          (modalOpenTableRoom && modalOpenTableEntity && modalOpenTableEntity.active ? (
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
          ))}

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
            allocationVersion={
              modalCurrentTarget.recovery ? modalRecoveryGroup?.expectedAllocationVersion : modalServiceAllocation?.version
            }
            conflict={Boolean(modalServiceAllocation?.serviceConflict)}
            cashClosed={Boolean(service.snapshot?.cashClosed)}
            onClose={closeTableModal}
            onDirtyChange={setTableModalDirty}
            onRefresh={() => {
              void service.refresh();
              void refresh();
            }}
            onCommand={runServiceCommand}
          />
        )}
      </FloorTableModal>

      <AdminModal open={releaseTarget !== null} title="Liberar mesas" onClose={() => { if (!saving) setReleaseTarget(null); }}>
        {releaseTarget && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-[var(--floor-muted,#4b6470)]">
              Liberación de mesas para <strong className="text-[var(--floor-ink,#173642)]">{releaseTarget.customerName}</strong> (
              {releaseTarget.code}) en {releaseTarget.poses.map((pose) => pose.label).join(" + ")}:
            </p>
            <div className="space-y-2 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-hover,#e6f2f6)] p-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--floor-ink,#173642)]">
                <input
                  type="radio"
                  name="releaseReason"
                  value="COMPLETED"
                  checked={releaseReason === "COMPLETED"}
                  onChange={() => setReleaseReason("COMPLETED")}
                />
                <span>El grupo ya se retiró (Finalizar visita)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-amber-900">
                <input
                  type="radio"
                  name="releaseReason"
                  value="NO_SHOW"
                  checked={releaseReason === "NO_SHOW"}
                  onChange={() => setReleaseReason("NO_SHOW")}
                />
                <span>No se presentó (Registrar No-Show)</span>
              </label>
            </div>
            {releaseError && (
              <p role="alert" className="text-sm text-red-800">
                {releaseError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-4">
              <button
                {...transientButtonProps}
                type="button"
                disabled={saving}
                className={floorSecondaryButtonClass}
                onClick={() => setReleaseTarget(null)}
              >
                Cancelar
              </button>
              <button
                {...transientButtonProps}
                type="button"
                disabled={saving}
                className={floorPrimaryButtonClass}
                onClick={() => void releaseReservation()}
              >
                {saving ? "Liberando…" : "Confirmar liberación"}
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </main>
  );
}
