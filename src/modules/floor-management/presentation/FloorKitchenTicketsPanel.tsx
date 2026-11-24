"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCheck,
  ChefHat,
  Clock,
  ExternalLink,
  Flame,
  ReceiptText,
  RotateCw,
  Wine,
} from "lucide-react";
import type {
  KitchenStation,
  KitchenStatus,
  KitchenTicketLine,
  KitchenTicketView,
  ServiceAccountView,
} from "@/modules/reservation-management/contracts";
import { transientButtonProps } from "@/ui/button-state";
import { floorSecondaryButtonClass } from "./floor-ui";
import type { FloorServiceTarget } from "./FloorServiceWindow";

export function deriveKitchenTickets(accounts: ServiceAccountView[]): KitchenTicketView[] {
  const openAccounts = [...accounts]
    .filter((account) => !account.closedAt)
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt) || a.id.localeCompare(b.id));

  const tickets: KitchenTicketView[] = [];
  for (const account of openAccounts) {
    const uncancelledLines = account.lines.filter((line) => line.quantity > line.cancelledQuantity);
    if (!uncancelledLines.length) continue;

    const rounds = [...new Set(uncancelledLines.map((line) => line.round ?? 1))].sort((a, b) => a - b);
    for (const round of rounds) {
      const roundLines = uncancelledLines.filter((line) => (line.round ?? 1) === round);
      const hasUnserved = roundLines.some((line) => line.kitchenStatus !== "SERVED");
      if (!hasUnserved) continue;

      const kitchenLines = roundLines.filter((line) => (line.station ?? "KITCHEN") === "KITCHEN");
      const barLines = roundLines.filter((line) => line.station === "BAR");

      const hasKitchenItems = kitchenLines.some((line) => line.kitchenStatus !== "SERVED");
      const hasBarItems = barLines.some((line) => line.kitchenStatus !== "SERVED");
      const allReady = roundLines.every((line) => line.kitchenStatus === "READY" || line.kitchenStatus === "SERVED");
      const kitchenReady = kitchenLines.length > 0 && kitchenLines.every((line) => line.kitchenStatus === "READY" || line.kitchenStatus === "SERVED");
      const barReady = barLines.length > 0 && barLines.every((line) => line.kitchenStatus === "READY" || line.kitchenStatus === "SERVED");

      tickets.push({
        id: `${account.id}-${round}`,
        accountId: account.id,
        round,
        roomName: account.roomName,
        tableLabels: account.tableLabels,
        customerName: account.customerName,
        reservationCode: account.reservationCode,
        waiterName: account.assignedWaiterName ?? null,
        openedAt: account.openedAt,
        createdAt: roundLines[0].createdAt,
        allReady,
        kitchenReady,
        barReady,
        hasKitchenItems,
        hasBarItems,
        lines: roundLines.map((line) => ({
          id: line.id,
          name: line.name,
          quantity: line.quantity,
          deliveredQuantity: line.deliveredQuantity,
          cancelledQuantity: line.cancelledQuantity,
          notes: line.notes ?? "",
          kitchenStatus: (line.kitchenStatus ?? "PENDING") as KitchenStatus,
          station: (line.station ?? "KITCHEN") as KitchenStation,
          createdAt: line.createdAt,
        })),
      });
    }
  }
  return tickets;
}

const statusMeta: Record<KitchenStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "border border-zinc-200 bg-zinc-100 text-zinc-700" },
  IN_PREP: { label: "En marcha", className: "border border-amber-200 bg-amber-50 text-amber-900" },
  READY: { label: "Listo", className: "border border-emerald-200 bg-emerald-50 text-emerald-800" },
  SERVED: { label: "Servido", className: "border border-zinc-200 bg-zinc-50 text-zinc-400 line-through" },
  CANCELLED: { label: "Anulado", className: "border border-red-200 bg-red-50 text-red-700 line-through" },
};

function lineAction(status: KitchenStatus): { next: KitchenStatus; label: string } | null {
  if (status === "PENDING") return { next: "IN_PREP", label: "Marchar" };
  if (status === "IN_PREP") return { next: "READY", label: "Listo" };
  if (status === "READY") return { next: "SERVED", label: "Entregar" };
  return null;
}

function accountTargetFromTicket(accountById: Map<string, ServiceAccountView>, ticket: KitchenTicketView): FloorServiceTarget | null {
  const account = accountById.get(ticket.accountId);
  const tableId = account?.tableIds.slice().sort()[0];
  if (!account || !tableId) return null;
  return {
    allocationId: account.allocationId,
    customerName: account.customerName,
    reservationCode: account.reservationCode,
    tableLabels: account.tableLabels,
    tableId,
    partySize: account.partySize,
  };
}

export function FloorKitchenTicketsPanel({
  accounts,
  loading,
  error,
  busy,
  historical,
  kitchenHref,
  onRefresh,
  onOpenService,
  onUpdateStatus,
}: {
  accounts: ServiceAccountView[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  historical: boolean;
  kitchenHref?: string;
  onRefresh: () => void;
  onOpenService: (target: FloorServiceTarget) => void;
  onUpdateStatus: (lineId: string, status: KitchenStatus) => Promise<void>;
}) {
  const [stationFilter, setStationFilter] = useState<"ALL" | KitchenStation>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "READY" | "ACTIVE">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setNowMs(Date.now());
    const init = window.setTimeout(sync, 0);
    const timer = window.setInterval(sync, 30_000);
    return () => {
      window.clearTimeout(init);
      window.clearInterval(timer);
    };
  }, []);

  const rawTickets = deriveKitchenTickets(accounts);
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const readyLineCount = rawTickets.reduce(
    (sum, ticket) => sum + ticket.lines.filter((line) => line.kitchenStatus === "READY").length,
    0,
  );

  const visibleTickets = rawTickets
    .map((ticket) => {
      const stationLines =
        stationFilter === "ALL" ? ticket.lines : ticket.lines.filter((line) => line.station === stationFilter);
      const hasUnserved = stationLines.some((line) => line.kitchenStatus !== "SERVED");
      if (!hasUnserved) return null;
      if (statusFilter === "READY" && !stationLines.some((line) => line.kitchenStatus === "READY")) return null;
      if (
        statusFilter === "ACTIVE" &&
        !stationLines.some((line) => line.kitchenStatus === "PENDING" || line.kitchenStatus === "IN_PREP")
      ) {
        return null;
      }
      return { ticket, lines: stationLines };
    })
    .filter((entry): entry is { ticket: KitchenTicketView; lines: KitchenTicketLine[] } => entry !== null);

  const runStatusUpdate = async (lineIds: string[], status: KitchenStatus, lockKey: string) => {
    if (historical || busy || updatingId) return;
    setActionError(null);
    setUpdatingId(lockKey);
    try {
      for (const lineId of lineIds) {
        await onUpdateStatus(lineId, status);
      }
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : "No se pudo actualizar el ticket.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section aria-label="Tickets de cocina y barra" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Tickets de cocina</h2>
          {readyLineCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900 tabular-nums">
              <CheckCheck size={12} aria-hidden="true" />
              {readyLineCount} {readyLineCount === 1 ? "listo" : "listos"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {kitchenHref && (
            <Link
              href={kitchenHref}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--floor-border,#cad9df)] bg-white px-2.5 text-[11px] font-semibold text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
            >
              <ExternalLink size={12} aria-hidden="true" />
              KDS
            </Link>
          )}
          <button
            {...transientButtonProps}
            type="button"
            className={`${floorSecondaryButtonClass} h-8 min-h-8 px-2.5 text-xs`}
            aria-label="Actualizar tickets"
            disabled={loading || busy}
            onClick={onRefresh}
          >
            <RotateCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div role="group" aria-label="Filtrar tickets por estación" className="grid grid-cols-3 gap-1 rounded-lg bg-[#eef4f6] p-1">
          {(
            [
              { id: "ALL", label: "Todos", icon: null },
              { id: "KITCHEN", label: "Cocina", icon: ChefHat },
              { id: "BAR", label: "Barra", icon: Wine },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={stationFilter === id}
              onClick={() => setStationFilter(id)}
              className={`inline-flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-colors ${
                stationFilter === id
                  ? "bg-white text-[var(--floor-ink,#173642)] shadow-xs"
                  : "text-[var(--floor-muted,#4b6470)] hover:text-[var(--floor-ink,#173642)]"
              }`}
            >
              {Icon && <Icon size={12} aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Filtrar tickets por estado" className="grid grid-cols-3 gap-1 rounded-lg bg-[#eef4f6] p-1">
          {(
            [
              { id: "ALL", label: "Todos" },
              { id: "ACTIVE", label: "En prep." },
              { id: "READY", label: "Listos" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={statusFilter === option.id}
              onClick={() => setStatusFilter(option.id)}
              className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${
                statusFilter === option.id
                  ? "bg-white text-[var(--floor-ink,#173642)] shadow-xs"
                  : "text-[var(--floor-muted,#4b6470)] hover:text-[var(--floor-ink,#173642)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {(error || actionError) && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          {actionError ?? error}
        </p>
      )}

      {loading && rawTickets.length === 0 ? (
        <p role="status" className="py-5 text-xs text-[var(--floor-muted,#4b6470)]">
          Consultando tickets de cocina…
        </p>
      ) : visibleTickets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--floor-border,#cad9df)] p-5 text-center text-xs text-[var(--floor-muted,#4b6470)]">
          {rawTickets.length === 0
            ? "No hay tickets activos en cocina o barra."
            : "No hay tickets que coincidan con el filtro seleccionado."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {visibleTickets.map(({ ticket, lines }) => {
            const minutes = nowMs !== null ? Math.max(0, Math.floor((nowMs - Date.parse(ticket.createdAt)) / 60000)) : null;
            const timeBadgeClass =
              minutes !== null && minutes >= 25
                ? "bg-red-600 text-white"
                : minutes !== null && minutes >= 15
                  ? "bg-amber-500 text-zinc-950"
                  : "bg-[#eef4f6] text-[var(--floor-muted,#4b6470)]";
            const readyIds = lines.filter((line) => line.kitchenStatus === "READY").map((line) => line.id);
            const activeIds = lines
              .filter((line) => line.kitchenStatus === "PENDING" || line.kitchenStatus === "IN_PREP")
              .map((line) => line.id);
            const target = accountTargetFromTicket(accountById, ticket);
            const isReadyBorder = readyIds.length > 0 && activeIds.length === 0;

            return (
              <li
                key={ticket.id}
                className={`overflow-hidden rounded-xl border bg-white ${
                  isReadyBorder ? "border-emerald-300 ring-1 ring-emerald-200" : "border-[var(--floor-border,#cad9df)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-[var(--floor-border,#cad9df)] bg-[#f7fbfc] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-md bg-[#155e75] px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                        Mesa {ticket.tableLabels.join(" + ")}
                      </span>
                      <span className="rounded-md border border-[var(--floor-border,#cad9df)] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[var(--floor-muted,#4b6470)] tabular-nums">
                        Tanda {ticket.round}
                      </span>
                      {minutes !== null && (
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${timeBadgeClass}`}>
                          <Clock size={10} aria-hidden="true" />
                          {minutes}m
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-[var(--floor-ink,#173642)]">
                      {ticket.customerName}
                      {ticket.waiterName ? ` · ${ticket.waiterName}` : ""}
                    </p>
                  </div>
                  {target && (
                    <button
                      type="button"
                      onClick={() => onOpenService(target)}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[var(--floor-border,#cad9df)] bg-white px-2 text-[11px] font-semibold text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
                    >
                      <ReceiptText size={12} aria-hidden="true" />
                      Cuenta
                    </button>
                  )}
                </div>

                <ul className="divide-y divide-[var(--floor-border,#cad9df)]/60 px-3 py-1">
                  {lines.map((line) => {
                    const pendingQty = line.quantity - line.cancelledQuantity;
                    const meta = statusMeta[line.kitchenStatus];
                    const nextAction = !historical ? lineAction(line.kitchenStatus) : null;
                    const lock = busy || updatingId !== null;
                    return (
                      <li key={line.id} className="flex items-start justify-between gap-2 py-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[var(--floor-ink,#173642)] tabular-nums">{pendingQty}×</span>
                            <span className={line.kitchenStatus === "SERVED" ? "text-zinc-400 line-through" : "font-medium text-[var(--floor-ink,#173642)]"}>
                              {line.name}
                            </span>
                            {stationFilter === "ALL" && (
                              <span
                                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  line.station === "BAR" ? "bg-sky-50 text-sky-900" : "bg-amber-50 text-amber-950"
                                }`}
                              >
                                {line.station === "BAR" ? <Wine size={10} aria-hidden="true" /> : <ChefHat size={10} aria-hidden="true" />}
                                {line.station === "BAR" ? "Barra" : "Cocina"}
                              </span>
                            )}
                          </div>
                          {line.notes && (
                            <p className="mt-0.5 text-[11px] italic text-[var(--floor-muted,#4b6470)]">
                              Nota: {line.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                            {meta.label}
                          </span>
                          {nextAction && (
                            <button
                              type="button"
                              disabled={lock}
                              aria-label={`${nextAction.label} ${line.name}`}
                              onClick={() => void runStatusUpdate([line.id], nextAction.next, line.id)}
                              className="inline-flex h-6 items-center gap-0.5 rounded-md border border-[var(--floor-action,#155e75)] bg-[var(--floor-action,#155e75)] px-2 text-[10px] font-semibold text-white hover:bg-[var(--floor-action-hover,#0e4d63)] disabled:opacity-50"
                            >
                              {nextAction.next === "IN_PREP" && <Flame size={10} aria-hidden="true" />}
                              {nextAction.next === "READY" && <Check size={10} aria-hidden="true" />}
                              {nextAction.next === "SERVED" && <CheckCheck size={10} aria-hidden="true" />}
                              {nextAction.label}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!historical && (activeIds.length > 0 || readyIds.length > 0) && (
                  <div className="flex flex-wrap justify-end gap-1.5 border-t border-[var(--floor-border,#cad9df)] bg-[#fafcfd] px-3 py-2">
                    {activeIds.length > 0 && (
                      <button
                        type="button"
                        disabled={busy || updatingId !== null}
                        onClick={() => void runStatusUpdate(activeIds, "READY", `ready:${ticket.id}`)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Check size={12} aria-hidden="true" />
                        Todo listo
                      </button>
                    )}
                    {readyIds.length > 0 && (
                      <button
                        type="button"
                        disabled={busy || updatingId !== null}
                        onClick={() => void runStatusUpdate(readyIds, "SERVED", `served:${ticket.id}`)}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--floor-action,#155e75)] px-2.5 text-[11px] font-semibold text-white hover:bg-[var(--floor-action-hover,#0e4d63)] disabled:opacity-50"
                      >
                        <CheckCheck size={12} aria-hidden="true" />
                        Entregar listos
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
