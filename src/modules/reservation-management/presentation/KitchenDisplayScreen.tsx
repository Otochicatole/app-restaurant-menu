"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal, flushSync } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Flame,
  Printer,
  RotateCw,
  Search,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { matchesNormalizedSearch } from "@/platform/text/search";
import type {
  KitchenSnapshot,
  KitchenStation,
  KitchenStatus,
  KitchenTicketView,
} from "../service-contracts";
import styles from "./kitchen-ticket.module.css";

function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio context may be restricted by browser policy
  }
}

function elapsedMinutes(iso: string, nowMs: number): number {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor((nowMs - parsed) / 60000));
}

function urgencyStyle(minutes: number): {
  card: string;
  header: string;
  badge: string;
} {
  if (minutes >= 25) {
    return {
      card: "border-red-300 bg-white",
      header: "border-red-200 bg-red-50/70",
      badge: "border border-red-300 bg-red-600 text-white",
    };
  }
  if (minutes >= 15) {
    return {
      card: "border-amber-300 bg-white",
      header: "border-amber-200 bg-amber-50/70",
      badge: "border border-amber-300 bg-amber-100 text-amber-950",
    };
  }
  return {
    card: "border-stone-200 bg-white",
    header: "border-stone-200 bg-stone-50/80",
    badge: "border border-stone-200 bg-white text-stone-700",
  };
}

const statusBadge: Record<KitchenStatus, { label: string; className: string }> =
  {
    PENDING: {
      label: "Pendiente",
      className: "border border-stone-200 bg-stone-100 text-stone-700",
    },
    IN_PREP: {
      label: "En marcha",
      className: "border border-amber-200 bg-amber-50 text-amber-900",
    },
    READY: {
      label: "Listo",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    SERVED: {
      label: "Servido",
      className:
        "border border-stone-200 bg-stone-50 text-stone-400 line-through",
    },
    CANCELLED: {
      label: "Anulado",
      className: "border border-red-200 bg-red-50 text-red-700 line-through",
    },
  };

export function KitchenDisplayScreen({
  restaurantId,
  restaurantName,
  initialSnapshot,
  initialStation = "ALL",
  backUrl = "/floor",
}: {
  restaurantId: string;
  restaurantName: string;
  initialSnapshot?: KitchenSnapshot | null;
  initialStation?: "ALL" | KitchenStation;
  backUrl?: string;
}) {
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(
    initialSnapshot ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [stationFilter, setStationFilter] = useState<"ALL" | KitchenStation>(
    initialStation,
  );
  const [urgencyFilter, setUrgencyFilter] = useState<
    "ALL" | "DELAYED" | "READY"
  >("ALL");
  const [search, setSearch] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState(
    initialSnapshot?.tickets.length ?? 0,
  );
  const [updatingLineId, setUpdatingLineId] = useState<string | null>(null);
  const [printingTicket, setPrintingTicket] =
    useState<KitchenTicketView | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const fetchKitchen = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/kitchen`,
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      );
      const payload = await res.json();
      if (payload.success && payload.data) {
        const next: KitchenSnapshot = payload.data;
        if (soundEnabled && next.tickets.length > lastTicketCount) {
          playChime();
        }
        setLastTicketCount(next.tickets.length);
        setSnapshot(next);
        setNowMs(Date.now());
      }
    } catch {
      // Background poll failure
    } finally {
      setLoading(false);
    }
  }, [restaurantId, soundEnabled, lastTicketCount]);

  useEffect(() => {
    const pollTimer = setInterval(() => {
      void fetchKitchen();
    }, 6000);
    const clockTimer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => {
      clearInterval(pollTimer);
      clearInterval(clockTimer);
    };
  }, [fetchKitchen]);

  const updateLineStatus = async (
    lineId: string,
    nextStatus: KitchenStatus,
  ) => {
    setUpdatingLineId(lineId);
    try {
      const res = await fetch(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/kitchen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            action: "update-kitchen-status",
            lineId,
            status: nextStatus,
          }),
        },
      );
      const payload = await res.json();
      if (payload.success && payload.data) {
        setSnapshot(payload.data);
      }
    } catch {
      // Ignored
    } finally {
      setUpdatingLineId(null);
    }
  };

  const markTicketStationReady = async (
    ticket: KitchenTicketView,
    station: "ALL" | KitchenStation,
  ) => {
    const targetLines =
      station === "ALL"
        ? ticket.lines
        : ticket.lines.filter((l) => (l.station ?? "KITCHEN") === station);
    for (const line of targetLines) {
      if (
        line.kitchenStatus !== "READY" &&
        line.kitchenStatus !== "SERVED" &&
        line.kitchenStatus !== "CANCELLED"
      ) {
        await updateLineStatus(line.id, "READY");
      }
    }
  };

  const markTicketStationServed = async (
    ticket: KitchenTicketView,
    station: "ALL" | KitchenStation,
  ) => {
    const targetLines =
      station === "ALL"
        ? ticket.lines
        : ticket.lines.filter((l) => (l.station ?? "KITCHEN") === station);
    for (const line of targetLines) {
      if (
        line.kitchenStatus !== "SERVED" &&
        line.kitchenStatus !== "CANCELLED"
      ) {
        await updateLineStatus(line.id, "SERVED");
      }
    }
  };

  const printTicket = (ticket: KitchenTicketView) => {
    flushSync(() => setPrintingTicket(ticket));
    try {
      window.print();
    } finally {
      setPrintingTicket(null);
    }
  };

  const rawTickets = useMemo(() => snapshot?.tickets ?? [], [snapshot]);

  const kitchenTicketsCount = useMemo(
    () =>
      rawTickets.filter(
        (t) =>
          t.hasKitchenItems ??
          t.lines.some(
            (l) =>
              (l.station ?? "KITCHEN") === "KITCHEN" &&
              l.kitchenStatus !== "SERVED",
          ),
      ).length,
    [rawTickets],
  );

  const barTicketsCount = useMemo(
    () =>
      rawTickets.filter(
        (t) =>
          t.hasBarItems ??
          t.lines.some(
            (l) => l.station === "BAR" && l.kitchenStatus !== "SERVED",
          ),
      ).length,
    [rawTickets],
  );

  const stationTickets = useMemo(
    () =>
      rawTickets.filter((ticket) => {
        if (stationFilter === "KITCHEN") {
          return (
            ticket.hasKitchenItems ??
            ticket.lines.some(
              (line) =>
                (line.station ?? "KITCHEN") === "KITCHEN" &&
                line.kitchenStatus !== "SERVED",
            )
          );
        }
        if (stationFilter === "BAR") {
          return (
            ticket.hasBarItems ??
            ticket.lines.some(
              (line) =>
                line.station === "BAR" && line.kitchenStatus !== "SERVED",
            )
          );
        }
        return true;
      }),
    [rawTickets, stationFilter],
  );

  const delayedCount = useMemo(
    () =>
      stationTickets.filter((t) => elapsedMinutes(t.createdAt, nowMs) >= 15)
        .length,
    [stationTickets, nowMs],
  );

  const readyCount = useMemo(
    () =>
      stationTickets.filter((t) =>
        stationFilter === "KITCHEN"
          ? t.kitchenReady
          : stationFilter === "BAR"
            ? t.barReady
            : t.allReady,
      ).length,
    [stationTickets, stationFilter],
  );

  const tickets = useMemo(() => {
    return stationTickets.filter((ticket) => {
      if (
        urgencyFilter === "DELAYED" &&
        elapsedMinutes(ticket.createdAt, nowMs) < 15
      ) {
        return false;
      }
      if (urgencyFilter === "READY") {
        const isReady =
          stationFilter === "KITCHEN"
            ? ticket.kitchenReady
            : stationFilter === "BAR"
              ? ticket.barReady
              : ticket.allReady;
        if (!isReady) return false;
      }
      if (!search.trim()) return true;
      return matchesNormalizedSearch(search, [
        ticket.tableLabels.join(" "),
        ticket.roomName,
        ticket.customerName,
        ticket.waiterName ?? "",
        ...ticket.lines.map((l) => l.name),
      ]);
    });
  }, [stationTickets, urgencyFilter, stationFilter, nowMs, search]);

  return (
    <div className="flex min-h-screen select-none flex-col bg-[#f8faf7] font-sans text-stone-900">
      <header
        className={`sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 ${!backUrl ? "pr-16 md:pr-6" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {backUrl && (
              <Link
                href={backUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
              >
                <ArrowLeft size={14} /> Volver a Sala
              </Link>
            )}
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-800">
                <Flame size={17} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight text-stone-900 sm:text-lg">
                    {stationFilter === "KITCHEN"
                      ? "Comandas de Cocina"
                      : stationFilter === "BAR"
                        ? "Comandas de Barra"
                        : "Comandas de Cocina y Barra"}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    En vivo
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  {snapshot?.restaurantName || restaurantName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filtrar estación"
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-100/70 p-1"
            >
              <button
                type="button"
                onClick={() => setStationFilter("ALL")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  stationFilter === "ALL"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todos ({rawTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setStationFilter("KITCHEN")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  stationFilter === "KITCHEN"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <UtensilsCrossed size={13} /> Cocina ({kitchenTicketsCount})
              </button>
              <button
                type="button"
                onClick={() => setStationFilter("BAR")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  stationFilter === "BAR"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Wine size={13} /> Barra ({barTicketsCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Silenciar avisos" : "Activar avisos sonoros"}
              aria-label={
                soundEnabled ? "Silenciar avisos" : "Activar avisos sonoros"
              }
              className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                soundEnabled
                  ? "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>

            <button
              type="button"
              onClick={() => void fetchKitchen()}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>

        {stationTickets.length > 0 && (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mesa, mozo o plato…"
                aria-label="Buscar comandas"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/70 py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  ["ALL", `Activas (${stationTickets.length})`],
                  ["DELAYED", `En demora (${delayedCount})`],
                  ["READY", `Listas (${readyCount})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUrgencyFilter(value)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    urgencyFilter === value
                      ? "border-stone-900 bg-stone-900 text-white"
                      : value === "DELAYED" && delayedCount > 0
                        ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-6">
        {!tickets.length ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700">
              {stationFilter === "BAR" ? (
                <Wine size={22} />
              ) : (
                <UtensilsCrossed size={22} />
              )}
            </div>
            <p className="mt-4 text-base font-semibold text-stone-900">
              {stationTickets.length > 0
                ? "No hay comandas que coincidan con el filtro"
                : stationFilter === "KITCHEN"
                  ? "No hay comandas pendientes en cocina"
                  : stationFilter === "BAR"
                    ? "No hay comandas pendientes en barra"
                    : "No hay comandas pendientes"}
            </p>
            <p className="mt-1 max-w-md text-xs text-stone-500">
              {stationTickets.length > 0
                ? "Probá limpiar la búsqueda o cambiar el filtro de estado."
                : "Los pedidos enviados desde la sala aparecerán aquí automáticamente."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tickets.map((ticket) => {
              const minutes = elapsedMinutes(ticket.createdAt, nowMs);
              const urgency = urgencyStyle(minutes);

              const isKitchenMode = stationFilter === "KITCHEN";
              const isBarMode = stationFilter === "BAR";

              const kitchenLines = ticket.lines.filter(
                (l) => (l.station ?? "KITCHEN") === "KITCHEN",
              );
              const barLines = ticket.lines.filter((l) => l.station === "BAR");

              const primaryLines = isKitchenMode
                ? kitchenLines
                : isBarMode
                  ? barLines
                  : ticket.lines;
              const contextLines = isKitchenMode
                ? barLines
                : isBarMode
                  ? kitchenLines
                  : [];

              const hasActionableReady = primaryLines.some(
                (l) =>
                  l.kitchenStatus !== "READY" &&
                  l.kitchenStatus !== "SERVED" &&
                  l.kitchenStatus !== "CANCELLED",
              );
              const hasActionableServe = primaryLines.some(
                (l) =>
                  l.kitchenStatus !== "SERVED" &&
                  l.kitchenStatus !== "CANCELLED",
              );

              return (
                <article
                  key={ticket.id}
                  className={`flex flex-col overflow-hidden rounded-xl border transition-colors ${urgency.card}`}
                >
                  <div
                    className={`flex items-start justify-between gap-2 border-b p-3.5 ${urgency.header}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold tracking-tight text-stone-900">
                          {ticket.tableLabels.join(" + ")}
                        </span>
                        <span className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600">
                          {ticket.roomName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {ticket.customerName} · Tanda {ticket.round}
                        {ticket.waiterName && ` · Mozo: ${ticket.waiterName}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${urgency.badge}`}
                      >
                        <Clock size={11} /> {minutes} min
                      </span>
                      {ticket.allReady ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Check size={10} /> Todo listo
                        </span>
                      ) : isKitchenMode && ticket.kitchenReady ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Check size={10} /> Cocina lista
                        </span>
                      ) : isBarMode && ticket.barReady ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Check size={10} /> Bebidas listas
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 bg-white p-3.5">
                    <div>
                      {stationFilter !== "ALL" && (
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                          {isKitchenMode ? (
                            <UtensilsCrossed size={12} />
                          ) : (
                            <Wine size={12} />
                          )}
                          {isKitchenMode
                            ? "Platos a preparar (Cocina)"
                            : "Bebidas a preparar (Barra)"}
                        </p>
                      )}
                      <ul className="divide-y divide-stone-100">
                        {primaryLines.map((line) => {
                          const isPending = line.kitchenStatus === "PENDING";
                          const isInPrep = line.kitchenStatus === "IN_PREP";
                          const isReady = line.kitchenStatus === "READY";
                          const isServed = line.kitchenStatus === "SERVED";
                          const isBusy = updatingLineId === line.id;
                          const activeQuantity =
                            line.quantity - line.cancelledQuantity;

                          return (
                            <li
                              key={line.id}
                              className="py-2.5 first:pt-0 last:pb-0"
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="min-w-0">
                                  <p className="flex items-baseline gap-1.5 text-sm font-medium text-stone-900">
                                    <span className="inline-block text-sm font-bold tabular-nums text-stone-900">
                                      {activeQuantity}×
                                    </span>
                                    <span
                                      className={
                                        isReady || isServed
                                          ? "text-stone-400 line-through"
                                          : "text-stone-900"
                                      }
                                    >
                                      {line.name}
                                    </span>
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {stationFilter === "ALL" && (
                                      <span
                                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                          line.station === "BAR"
                                            ? "border border-sky-200 bg-sky-50 text-sky-800"
                                            : "border border-stone-200 bg-stone-100 text-stone-700"
                                        }`}
                                      >
                                        {line.station === "BAR"
                                          ? "Barra"
                                          : "Cocina"}
                                      </span>
                                    )}
                                    {line.notes && (
                                      <p className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                        <AlertTriangle
                                          size={11}
                                          className="shrink-0"
                                        />
                                        {line.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  {isPending && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        void updateLineStatus(
                                          line.id,
                                          "IN_PREP",
                                        )
                                      }
                                      className="cursor-pointer rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Marcha
                                    </button>
                                  )}
                                  {isInPrep && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        void updateLineStatus(line.id, "READY")
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Check size={12} /> Listo
                                    </button>
                                  )}
                                  {isReady && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        void updateLineStatus(line.id, "SERVED")
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <CheckCheck size={13} /> Servido
                                    </button>
                                  )}
                                  {isServed && (
                                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-400">
                                      Servido
                                    </span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {contextLines.length > 0 && (
                      <div
                        data-testid="coordination-context"
                        className={`rounded-lg border p-2.5 ${
                          isKitchenMode
                            ? "border-sky-200 bg-sky-50/60"
                            : "border-amber-200 bg-amber-50/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 border-b border-black/5 pb-1.5 text-xs font-semibold">
                          <span
                            className={`flex items-center gap-1.5 ${
                              isKitchenMode ? "text-sky-950" : "text-amber-950"
                            }`}
                          >
                            {isKitchenMode ? (
                              <Wine size={13} className="text-sky-700" />
                            ) : (
                              <UtensilsCrossed
                                size={13}
                                className="text-amber-800"
                              />
                            )}
                            {isKitchenMode
                              ? "Bebidas de esta tanda (Barra)"
                              : "Comida de esta tanda (Cocina)"}
                          </span>
                          {(isKitchenMode
                            ? ticket.barReady
                            : ticket.kitchenReady) && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              <Check size={10} />{" "}
                              {isKitchenMode ? "Listas" : "Lista"}
                            </span>
                          )}
                        </div>
                        <ul className="mt-1.5 space-y-1.5">
                          {contextLines.map((ctxLine) => {
                            const activeQty =
                              ctxLine.quantity - ctxLine.cancelledQuantity;
                            const badge =
                              statusBadge[ctxLine.kitchenStatus] ??
                              statusBadge.PENDING;
                            return (
                              <li
                                key={ctxLine.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span
                                    className={`mr-1.5 font-bold tabular-nums ${
                                      isKitchenMode
                                        ? "text-sky-950"
                                        : "text-amber-950"
                                    }`}
                                  >
                                    {activeQty}×
                                  </span>
                                  <span
                                    className={`text-stone-900 ${
                                      ctxLine.kitchenStatus === "SERVED"
                                        ? "text-stone-400 line-through"
                                        : ""
                                    }`}
                                  >
                                    {ctxLine.name}
                                  </span>
                                  {ctxLine.notes && (
                                    <span className="ml-1 text-[11px] italic text-amber-900">
                                      ({ctxLine.notes})
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-100 bg-stone-50/70 p-2.5">
                    <button
                      type="button"
                      title="Imprimir comanda térmica"
                      aria-label="Imprimir comanda térmica"
                      onClick={() => printTicket(ticket)}
                      className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      <Printer size={13} aria-hidden="true" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>
                    <div className="flex flex-1 items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={!hasActionableReady}
                        onClick={() =>
                          void markTicketStationReady(ticket, stationFilter)
                        }
                        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Check size={13} />
                        {isKitchenMode
                          ? "Cocina Lista"
                          : isBarMode
                            ? "Barra Lista"
                            : "Todo Listo"}
                      </button>
                      <button
                        type="button"
                        disabled={!hasActionableServe}
                        onClick={() =>
                          void markTicketStationServed(ticket, stationFilter)
                        }
                        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <CheckCheck size={13} />
                        {isKitchenMode
                          ? "Despachar Cocina"
                          : isBarMode
                            ? "Despachar Barra"
                            : "Despachar"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {printingTicket &&
        createPortal(
          <div aria-hidden="true" className={styles.printTicket}>
            <CommandTicketPrint
              ticket={printingTicket}
              station={stationFilter}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function CommandTicketPrint({
  ticket,
  station,
}: {
  ticket: KitchenTicketView;
  station: "ALL" | KitchenStation;
}) {
  const isKitchen = station === "KITCHEN";
  const isBar = station === "BAR";
  const kitchenLines = ticket.lines.filter(
    (l) => (l.station ?? "KITCHEN") === "KITCHEN",
  );
  const barLines = ticket.lines.filter((l) => l.station === "BAR");

  const primaryLines = isKitchen
    ? kitchenLines
    : isBar
      ? barLines
      : ticket.lines;
  const contextLines = isKitchen ? barLines : isBar ? kitchenLines : [];

  return (
    <article className="space-y-2 text-black">
      <header className="border-b border-black pb-2 text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          {ticket.tableLabels.join(" + ")}
        </h2>
        <p className="text-sm font-bold">
          {ticket.roomName} · Tanda {ticket.round}
        </p>
        <p className="text-xs">
          {ticket.customerName}{" "}
          {ticket.waiterName ? `· Mozo: ${ticket.waiterName}` : ""}
        </p>
        <p className="text-xs">
          {new Date(ticket.createdAt).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <div className="mt-1 border-t border-dashed border-black pt-1 text-xs font-bold uppercase tracking-wider">
          {isKitchen
            ? "--- COMANDA COCINA ---"
            : isBar
              ? "--- COMANDA BARRA ---"
              : "--- COMANDA GENERAL ---"}
        </div>
      </header>

      <section className="border-b border-black py-1">
        <h3 className="mb-1 text-xs font-extrabold uppercase">
          {isKitchen
            ? "Platos a preparar:"
            : isBar
              ? "Bebidas a preparar:"
              : "Consumos:"}
        </h3>
        <ul className="space-y-1 text-sm">
          {primaryLines.map((line) => (
            <li key={line.id} className="leading-tight">
              <span className="mr-1.5 text-base font-black">
                {line.quantity - line.cancelledQuantity}×
              </span>
              <span className="font-bold">{line.name}</span>
              {line.notes && (
                <div className="pl-4 text-xs font-bold italic">
                  ** NOTA: {line.notes} **
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {contextLines.length > 0 && (
        <section className="pt-1 text-xs">
          <h4 className="mb-0.5 text-[11px] font-bold uppercase">
            {isKitchen
              ? "[Bebidas de la tanda - Barra]:"
              : "[Comida de la tanda - Cocina]:"}
          </h4>
          <ul className="space-y-0.5 text-xs">
            {contextLines.map((line) => (
              <li key={line.id}>
                - {line.quantity - line.cancelledQuantity}× {line.name} (
                {line.kitchenStatus})
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
