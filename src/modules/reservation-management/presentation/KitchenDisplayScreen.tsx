"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellOff, Check, CheckCheck, Clock, Flame, RotateCw, UtensilsCrossed, Wine } from "lucide-react";
import type { KitchenSnapshot, KitchenStation, KitchenStatus, KitchenTicketView } from "../service-contracts";

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

export function KitchenDisplayScreen({
  restaurantId,
  restaurantName,
  initialSnapshot,
  backUrl = "/floor",
}: {
  restaurantId: string;
  restaurantName: string;
  initialSnapshot?: KitchenSnapshot | null;
  backUrl?: string;
}) {
  const [snapshot, setSnapshot] = useState<KitchenSnapshot | null>(initialSnapshot ?? null);
  const [loading, setLoading] = useState(false);
  const [stationFilter, setStationFilter] = useState<"ALL" | KitchenStation>("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState(initialSnapshot?.tickets.length ?? 0);
  const [updatingLineId, setUpdatingLineId] = useState<string | null>(null);

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

  const markAllTicketReady = async (ticket: KitchenTicketView) => {
    for (const line of ticket.lines) {
      if (line.kitchenStatus !== "READY" && line.kitchenStatus !== "SERVED" && line.kitchenStatus !== "CANCELLED") {
        await updateLineStatus(line.id, "READY");
      }
    }
  };

  const markAllTicketServed = async (ticket: KitchenTicketView) => {
    for (const line of ticket.lines) {
      if (line.kitchenStatus !== "SERVED" && line.kitchenStatus !== "CANCELLED") {
        await updateLineStatus(line.id, "SERVED");
      }
    }
  };

  const rawTickets = snapshot?.tickets ?? [];
  const tickets = rawTickets.filter((ticket) => {
    if (stationFilter === "ALL") return true;
    return ticket.lines.some((line) => line.station === stationFilter);
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
                  Comandas de Cocina
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
            onClick={() => setStationFilter("ALL")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              stationFilter === "ALL"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Todos ({rawTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setStationFilter("KITCHEN")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              stationFilter === "KITCHEN"
                ? "bg-orange-600 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <UtensilsCrossed size={13} /> Cocina
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
            <Wine size={13} /> Barra
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
              <UtensilsCrossed size={26} />
            </div>
            <p className="mt-4 text-lg font-semibold text-zinc-900">No hay comandas pendientes</p>
            <p className="mt-1 max-w-md text-sm text-zinc-500">Los pedidos enviados desde la sala aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tickets.map((ticket) => {
              const minutes = elapsedMinutes(ticket.createdAt);
              const urgency = urgencyClass(minutes);
              const visibleLines = ticket.lines.filter((line) =>
                stationFilter === "ALL" ? true : line.station === stationFilter
              );

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
                        {ticket.customerName} · Ronda {ticket.round}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${urgency.badge}`}>
                        <Clock size={12} /> {minutes} min
                      </span>
                      {ticket.allReady && (
                        <span className="flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Check size={11} /> Listo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lines List */}
                  <ul className="flex-1 divide-y divide-zinc-100 bg-white px-3.5 py-2">
                    {visibleLines.map((line) => {
                      const isPending = line.kitchenStatus === "PENDING";
                      const isInPrep = line.kitchenStatus === "IN_PREP";
                      const isReady = line.kitchenStatus === "READY";
                      const isBusy = updatingLineId === line.id;
                      const activeQuantity = line.quantity - line.cancelledQuantity;

                      return (
                        <li key={line.id} className="py-2.5">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0">
                              <p className="flex items-baseline gap-1.5 text-sm font-semibold text-zinc-900">
                                <span className="inline-block text-base font-bold tabular-nums text-[#263e23]">
                                  {activeQuantity}×
                                </span>
                                <span className={isReady ? "line-through text-zinc-400" : "text-zinc-900"}>{line.name}</span>
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
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Ticket Footer Quick Actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-[#f8faf7] p-3">
                    <button
                      type="button"
                      onClick={() => void markAllTicketReady(ticket)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                    >
                      <Check size={14} /> Todo Listo
                    </button>
                    <button
                      type="button"
                      onClick={() => void markAllTicketServed(ticket)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                    >
                      <CheckCheck size={14} /> Despachar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
