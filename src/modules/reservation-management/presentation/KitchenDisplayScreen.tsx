"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal, flushSync } from "react-dom";
import { ArrowLeft, Bell, BellOff, Check, CheckCheck, Clock, Flame, Printer, RotateCw, UtensilsCrossed, Wine } from "lucide-react";
import type { KitchenSnapshot, KitchenStation, KitchenStatus, KitchenTicketView } from "../service-contracts";
import styles from "./kitchen-ticket.module.css";

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
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

function elapsedMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
}

function urgencyClass(minutes: number): { border: string; header: string; badge: string } {
  if (minutes >= 25) {
    return {
      border: "border-red-300 bg-white ring-1 ring-red-200",
      header: "border-red-200 bg-red-50/80",
      badge: "bg-red-600 text-white animate-pulse",
    };
  }
  if (minutes >= 15) {
    return {
      border: "border-amber-300 bg-white ring-1 ring-amber-200/80",
      header: "border-amber-200 bg-amber-50/80",
      badge: "bg-amber-500 text-zinc-950",
    };
  }
  return {
    border: "border-zinc-200/90 bg-white",
    header: "border-zinc-200/80 bg-[#f8faf7]",
    badge: "bg-zinc-200/80 text-zinc-800",
  };
}

const statusBadge: Record<KitchenStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "border border-zinc-200 bg-zinc-100 text-zinc-700" },
  IN_PREP: { label: "En marcha", className: "border border-amber-200 bg-amber-50 text-amber-900" },
  READY: { label: "Listo", className: "border border-emerald-200 bg-emerald-50 text-emerald-800" },
  SERVED: { label: "Servido", className: "border border-zinc-200 bg-zinc-50 text-zinc-400 line-through" },
  CANCELLED: { label: "Anulado", className: "border border-red-200 bg-red-50 text-red-700 line-through" },
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
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(initialSnapshot ?? null);
  const [loading, setLoading] = useState(false);
  const [stationFilter, setStationFilter] = useState<"ALL" | KitchenStation>(initialStation);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState(initialSnapshot?.tickets.length ?? 0);
  const [updatingLineId, setUpdatingLineId] = useState<string | null>(null);
  const [printingTicket, setPrintingTicket] = useState<KitchenTicketView | null>(null);

  const fetchKitchen = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/kitchen`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await res.json();
      if (payload.success && payload.data) {
        const next: KitchenSnapshot = payload.data;
        if (soundEnabled && next.tickets.length > lastTicketCount) {
          playChime();
        }
        setLastTicketCount(next.tickets.length);
        setSnapshot(next);
      }
    } catch {
      // Background poll failure
    } finally {
      setLoading(false);
    }
  }, [restaurantId, soundEnabled, lastTicketCount]);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchKitchen();
    }, 6000);
    return () => clearInterval(timer);
  }, [fetchKitchen]);

  const updateLineStatus = async (lineId: string, nextStatus: KitchenStatus) => {
    setUpdatingLineId(lineId);
    try {
      const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/kitchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "update-kitchen-status", lineId, status: nextStatus }),
      });
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

  const markTicketStationReady = async (ticket: KitchenTicketView, station: "ALL" | KitchenStation) => {
    const targetLines = station === "ALL" ? ticket.lines : ticket.lines.filter((l) => (l.station ?? "KITCHEN") === station);
    for (const line of targetLines) {
      if (line.kitchenStatus !== "READY" && line.kitchenStatus !== "SERVED" && line.kitchenStatus !== "CANCELLED") {
        await updateLineStatus(line.id, "READY");
      }
    }
  };

  const markTicketStationServed = async (ticket: KitchenTicketView, station: "ALL" | KitchenStation) => {
    const targetLines = station === "ALL" ? ticket.lines : ticket.lines.filter((l) => (l.station ?? "KITCHEN") === station);
    for (const line of targetLines) {
      if (line.kitchenStatus !== "SERVED" && line.kitchenStatus !== "CANCELLED") {
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

  const rawTickets = snapshot?.tickets ?? [];
  const kitchenTicketsCount = rawTickets.filter((t) => t.hasKitchenItems ?? t.lines.some((l) => (l.station ?? "KITCHEN") === "KITCHEN" && l.kitchenStatus !== "SERVED")).length;
  const barTicketsCount = rawTickets.filter((t) => t.hasBarItems ?? t.lines.some((l) => l.station === "BAR" && l.kitchenStatus !== "SERVED")).length;

  const tickets = rawTickets.filter((ticket) => {
    if (stationFilter === "KITCHEN") {
      return ticket.hasKitchenItems ?? ticket.lines.some((line) => (line.station ?? "KITCHEN") === "KITCHEN" && line.kitchenStatus !== "SERVED");
    }
    if (stationFilter === "BAR") {
      return ticket.hasBarItems ?? ticket.lines.some((line) => line.station === "BAR" && line.kitchenStatus !== "SERVED");
    }
    return true;
  });

  return (
    <div className="flex min-h-screen select-none flex-col bg-[#f8faf7] font-sans text-zinc-900">
      {/* Top Bar */}
      <header className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 ${!backUrl ? "pr-16 md:pr-6" : ""}`}>
        <div className="flex items-center gap-3">
          {backUrl && (
            <Link
              href={backUrl}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
            >
              <ArrowLeft size={15} /> Volver a Sala
            </Link>
          )}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8efe6] text-[#263e23]">
              <Flame size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-zinc-950 sm:text-lg">
                  {stationFilter === "KITCHEN" ? "Comandas de Cocina" : stationFilter === "BAR" ? "Comandas de Barra" : "Comandas de Cocina y Barra"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En vivo
                </span>
              </div>
              <p className="text-xs text-zinc-500">{snapshot?.restaurantName || restaurantName}</p>
            </div>
          </div>
        </div>

        {/* Station Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200/90 bg-[#f3f6f1] p-1">
          <button
            type="button"
            onClick={() => setStationFilter("KITCHEN")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              stationFilter === "KITCHEN"
                ? "bg-orange-600 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <UtensilsCrossed size={13} /> Cocina ({kitchenTicketsCount})
          </button>
          <button
            type="button"
            onClick={() => setStationFilter("BAR")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              stationFilter === "BAR"
                ? "bg-sky-600 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Wine size={13} /> Barra ({barTicketsCount})
          </button>
          <button
            type="button"
            onClick={() => setStationFilter("ALL")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              stationFilter === "ALL"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Todos ({rawTickets.length})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Silenciar avisos" : "Activar avisos sonoros"}
            aria-label={soundEnabled ? "Silenciar avisos" : "Activar avisos sonoros"}
            className={`cursor-pointer rounded-xl border p-2.5 transition ${
              soundEnabled
                ? "border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button
            type="button"
            onClick={() => void fetchKitchen()}
            disabled={loading}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </header>

      {/* Main Ticket Grid */}
      <main className="flex-1 overflow-x-auto p-4 sm:p-6">
        {!tickets.length ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-[0_4px_24px_-8px_rgba(24,24,27,0.04)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8efe6] text-[#2b4226]">
              {stationFilter === "BAR" ? <Wine size={26} /> : <UtensilsCrossed size={26} />}
            </div>
            <p className="mt-4 text-lg font-semibold text-zinc-900">
              {stationFilter === "KITCHEN"
                ? "No hay comandas pendientes en cocina"
                : stationFilter === "BAR"
                  ? "No hay comandas pendientes en barra"
                  : "No hay comandas pendientes"}
            </p>
            <p className="mt-1 max-w-md text-sm text-zinc-500">Los pedidos enviados desde la sala aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tickets.map((ticket) => {
              const minutes = elapsedMinutes(ticket.createdAt);
              const urgency = urgencyClass(minutes);

              const isKitchenMode = stationFilter === "KITCHEN";
              const isBarMode = stationFilter === "BAR";

              const kitchenLines = ticket.lines.filter((l) => (l.station ?? "KITCHEN") === "KITCHEN");
              const barLines = ticket.lines.filter((l) => l.station === "BAR");

              const primaryLines = isKitchenMode ? kitchenLines : isBarMode ? barLines : ticket.lines;
              const contextLines = isKitchenMode ? barLines : isBarMode ? kitchenLines : [];

              return (
                <div
                  key={ticket.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border shadow-[0_4px_24px_-8px_rgba(24,24,27,0.08)] transition ${urgency.border}`}
                >
                  {/* Ticket Header */}
                  <div className={`flex items-start justify-between gap-2 border-b p-3.5 ${urgency.header}`}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-extrabold tracking-tight text-zinc-950">
                          {ticket.tableLabels.join(" + ")}
                        </span>
                        <span className="rounded-md border border-zinc-200/80 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700">
                          {ticket.roomName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-zinc-600">
                        {ticket.customerName} · Tanda {ticket.round}
                        {ticket.waiterName && ` · Mozo: ${ticket.waiterName}`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${urgency.badge}`}>
                        <Clock size={12} /> {minutes} min
                      </span>
                      {ticket.allReady ? (
                        <span className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Check size={11} /> Todo listo
                        </span>
                      ) : isKitchenMode && ticket.kitchenReady ? (
                        <span className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Check size={11} /> Cocina lista
                        </span>
                      ) : isBarMode && ticket.barReady ? (
                        <span className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Check size={11} /> Bebidas listas
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Lines List & Context */}
                  <div className="flex-1 space-y-3 bg-white p-3.5">
                    {/* Primary Actionable Lines */}
                    <div>
                      {stationFilter !== "ALL" && (
                        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          {isKitchenMode ? <UtensilsCrossed size={12} /> : <Wine size={12} />}
                          {isKitchenMode ? "Platos a preparar (Cocina)" : "Bebidas a preparar (Barra)"}
                        </p>
                      )}
                      <ul className="divide-y divide-zinc-100">
                        {primaryLines.map((line) => {
                          const isPending = line.kitchenStatus === "PENDING";
                          const isInPrep = line.kitchenStatus === "IN_PREP";
                          const isReady = line.kitchenStatus === "READY";
                          const isServed = line.kitchenStatus === "SERVED";
                          const isBusy = updatingLineId === line.id;
                          const activeQuantity = line.quantity - line.cancelledQuantity;

                          return (
                            <li key={line.id} className="py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="min-w-0">
                                  <p className="flex items-baseline gap-1.5 text-sm font-semibold text-zinc-900">
                                    <span className="inline-block text-base font-bold tabular-nums text-[#263e23]">
                                      {activeQuantity}×
                                    </span>
                                    <span className={isReady || isServed ? "line-through text-zinc-400" : "text-zinc-900"}>{line.name}</span>
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {stationFilter === "ALL" && (
                                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                        line.station === "BAR"
                                          ? "border border-sky-200 bg-sky-50 text-sky-800"
                                          : "border border-zinc-200 bg-zinc-100 text-zinc-700"
                                      }`}>
                                        {line.station === "BAR" ? "Barra" : "Cocina"}
                                      </span>
                                    )}
                                    {line.notes && (
                                      <p className="inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                                        ⚠️ {line.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Item Status Toggle Button */}
                                <div className="flex shrink-0 items-center gap-1">
                                  {isPending && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void updateLineStatus(line.id, "IN_PREP")}
                                      className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Marcha
                                    </button>
                                  )}
                                  {isInPrep && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void updateLineStatus(line.id, "READY")}
                                      className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Check size={12} /> Listo
                                    </button>
                                  )}
                                  {isReady && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void updateLineStatus(line.id, "SERVED")}
                                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <CheckCheck size={13} /> Servido
                                    </button>
                                  )}
                                  {isServed && (
                                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
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

                    {/* Secondary Coordination Context */}
                    {contextLines.length > 0 && (
                      <div
                        data-testid="coordination-context"
                        className={`rounded-xl border p-2.5 ${
                          isKitchenMode
                            ? "border-sky-200/90 bg-sky-50/70"
                            : "border-amber-200/90 bg-amber-50/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 pb-1.5 text-xs font-bold border-b border-black/5">
                          <span className={`flex items-center gap-1.5 ${isKitchenMode ? "text-sky-950" : "text-amber-950"}`}>
                            {isKitchenMode ? <Wine size={13} className="text-sky-700" /> : <UtensilsCrossed size={13} className="text-amber-800" />}
                            {isKitchenMode ? "Bebidas de esta tanda (Barra)" : "Comida de esta tanda (Cocina)"}
                          </span>
                          {(isKitchenMode ? ticket.barReady : ticket.kitchenReady) && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Check size={10} /> {isKitchenMode ? "Listas" : "Lista"}
                            </span>
                          )}
                        </div>
                        <ul className="mt-1.5 space-y-1.5">
                          {contextLines.map((ctxLine) => {
                            const activeQty = ctxLine.quantity - ctxLine.cancelledQuantity;
                            const badge = statusBadge[ctxLine.kitchenStatus] ?? statusBadge.PENDING;
                            return (
                              <li key={ctxLine.id} className="flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <span className={`font-bold tabular-nums mr-1.5 ${isKitchenMode ? "text-sky-950" : "text-amber-950"}`}>
                                    {activeQty}×
                                  </span>
                                  <span className={`text-zinc-900 ${ctxLine.kitchenStatus === "SERVED" ? "line-through text-zinc-400" : ""}`}>
                                    {ctxLine.name}
                                  </span>
                                  {ctxLine.notes && (
                                    <span className="ml-1 text-[11px] text-amber-900 italic">
                                      ({ctxLine.notes})
                                    </span>
                                  )}
                                </div>
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ticket Footer Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-zinc-100 bg-[#f8faf7] p-2.5">
                    <button
                      type="button"
                      title="Imprimir comanda térmica"
                      aria-label="Imprimir comanda térmica"
                      onClick={() => printTicket(ticket)}
                      className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <Printer size={13} aria-hidden="true" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>
                    <div className="flex flex-1 items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void markTicketStationReady(ticket, stationFilter)}
                        className="flex-1 cursor-pointer rounded-xl bg-emerald-600 px-2.5 py-1.5 text-center text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                      >
                        <Check size={13} className="inline mr-1" />
                        {isKitchenMode ? "Cocina Lista" : isBarMode ? "Barra Lista" : "Todo Listo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void markTicketStationServed(ticket, stationFilter)}
                        className="flex-1 cursor-pointer rounded-xl border border-zinc-200/90 bg-white px-2.5 py-1.5 text-center text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                      >
                        <CheckCheck size={13} className="inline mr-1" />
                        {isKitchenMode ? "Despachar Cocina" : isBarMode ? "Despachar Barra" : "Despachar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Printable Thermal Ticket Portal */}
      {printingTicket &&
        createPortal(
          <div aria-hidden="true" className={styles.printTicket}>
            <CommandTicketPrint ticket={printingTicket} station={stationFilter} />
          </div>,
          document.body,
        )}
    </div>
  );
}

function CommandTicketPrint({ ticket, station }: { ticket: KitchenTicketView; station: "ALL" | KitchenStation }) {
  const isKitchen = station === "KITCHEN";
  const isBar = station === "BAR";
  const kitchenLines = ticket.lines.filter((l) => (l.station ?? "KITCHEN") === "KITCHEN");
  const barLines = ticket.lines.filter((l) => l.station === "BAR");

  const primaryLines = isKitchen ? kitchenLines : isBar ? barLines : ticket.lines;
  const contextLines = isKitchen ? barLines : isBar ? kitchenLines : [];

  return (
    <article className="space-y-2 text-black">
      <header className="border-b border-black pb-2 text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight">{ticket.tableLabels.join(" + ")}</h2>
        <p className="text-sm font-bold">{ticket.roomName} · Tanda {ticket.round}</p>
        <p className="text-xs">{ticket.customerName} {ticket.waiterName ? `· Mozo: ${ticket.waiterName}` : ""}</p>
        <p className="text-xs">{new Date(ticket.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
        <div className="mt-1 border-t border-dashed border-black pt-1 text-xs font-bold uppercase tracking-wider">
          {isKitchen ? "--- COMANDA COCINA ---" : isBar ? "--- COMANDA BARRA ---" : "--- COMANDA GENERAL ---"}
        </div>
      </header>

      {/* Primary Section */}
      <section className="py-1 border-b border-black">
        <h3 className="text-xs font-extrabold uppercase mb-1">
          {isKitchen ? "Platos a preparar:" : isBar ? "Bebidas a preparar:" : "Consumos:"}
        </h3>
        <ul className="space-y-1 text-sm">
          {primaryLines.map((line) => (
            <li key={line.id} className="leading-tight">
              <span className="font-black text-base mr-1.5">{line.quantity - line.cancelledQuantity}×</span>
              <span className="font-bold">{line.name}</span>
              {line.notes && <div className="text-xs pl-4 font-bold italic">** NOTA: {line.notes} **</div>}
            </li>
          ))}
        </ul>
      </section>

      {/* Secondary Coordination Context */}
      {contextLines.length > 0 && (
        <section className="pt-1 text-xs">
          <h4 className="font-bold uppercase text-[11px] mb-0.5">
            {isKitchen ? "[Bebidas de la tanda - Barra]:" : "[Comida de la tanda - Cocina]:"}
          </h4>
          <ul className="space-y-0.5 text-xs">
            {contextLines.map((line) => (
              <li key={line.id}>
                - {line.quantity - line.cancelledQuantity}× {line.name} ({line.kitchenStatus})
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
