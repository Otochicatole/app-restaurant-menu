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

function urgencyClass(minutes: number): { border: string; badge: string; text: string } {
  if (minutes >= 25) {
    return {
      border: "border-red-600 bg-red-950/20",
      badge: "bg-red-600 text-white animate-pulse",
      text: "text-red-400",
    };
  }
  if (minutes >= 15) {
    return {
      border: "border-amber-500 bg-amber-950/20",
      badge: "bg-amber-500 text-black",
      text: "text-amber-400",
    };
  }
  return {
    border: "border-zinc-800 bg-zinc-900",
    badge: "bg-zinc-800 text-zinc-300",
    text: "text-zinc-400",
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
          >
            <ArrowLeft size={15} /> Volver a Sala
          </Link>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Flame className="text-orange-500" size={18} />
              Comandas de Cocina · {snapshot?.restaurantName || restaurantName}
            </h1>
          </div>
        </div>

        {/* Station Filter Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setStationFilter("ALL")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              stationFilter === "ALL" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Todos ({rawTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setStationFilter("KITCHEN")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
              stationFilter === "KITCHEN" ? "bg-orange-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <UtensilsCrossed size={13} /> Cocina
          </button>
          <button
            type="button"
            onClick={() => setStationFilter("BAR")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
              stationFilter === "BAR" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
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
            className={`p-2 rounded-lg border transition ${
              soundEnabled
                ? "border-zinc-700 bg-zinc-800 text-zinc-200"
                : "border-red-900 bg-red-950/40 text-red-400"
            }`}
          >
            {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button
            type="button"
            onClick={() => void fetchKitchen()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition disabled:opacity-50"
          >
            <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </header>

      {/* Main Ticket Grid */}
      <main className="p-4 flex-1 overflow-x-auto">
        {!tickets.length ? (
          <div className="h-96 flex flex-col items-center justify-center text-center text-zinc-500">
            <UtensilsCrossed size={48} className="mb-3 opacity-30 text-zinc-400" />
            <p className="text-lg font-semibold text-zinc-300">No hay comandas pendientes</p>
            <p className="text-sm mt-1">Los pedidos enviados desde la sala aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {tickets.map((ticket) => {
              const minutes = elapsedMinutes(ticket.createdAt);
              const urgency = urgencyClass(minutes);
              const visibleLines = ticket.lines.filter((line) =>
                stationFilter === "ALL" ? true : line.station === stationFilter
              );

              return (
                <div
                  key={ticket.id}
                  className={`rounded-2xl border-2 shadow-xl flex flex-col overflow-hidden transition ${urgency.border}`}
                >
                  {/* Ticket Header */}
                  <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-white tracking-wide">
                          {ticket.tableLabels.join(" + ")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">
                          {ticket.roomName}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {ticket.customerName} · Ronda {ticket.round}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${urgency.badge}`}>
                        <Clock size={12} /> {minutes} min
                      </span>
                      {ticket.allReady && (
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-0.5">
                          <Check size={11} /> Listo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lines List */}
                  <ul className="divide-y divide-zinc-800/80 p-2 space-y-1 flex-1">
                    {visibleLines.map((line) => {
                      const isPending = line.kitchenStatus === "PENDING";
                      const isInPrep = line.kitchenStatus === "IN_PREP";
                      const isReady = line.kitchenStatus === "READY";
                      const isBusy = updatingLineId === line.id;

                      return (
                        <li key={line.id} className="pt-1.5 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                                <span className="inline-block text-base font-bold text-amber-400">
                                  {line.quantity}×
                                </span>
                                <span className={isReady ? "line-through text-zinc-500" : ""}>{line.name}</span>
                              </p>
                              {line.notes && (
                                <p className="mt-1 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded px-2 py-0.5 inline-block">
                                  ⚠️ {line.notes}
                                </p>
                              )}
                            </div>

                            {/* Item Status Toggle Button */}
                            <div className="shrink-0 flex items-center gap-1">
                              {isPending && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void updateLineStatus(line.id, "IN_PREP")}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                >
                                  Marcha
                                </button>
                              )}
                              {isInPrep && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void updateLineStatus(line.id, "READY")}
                                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1"
                                >
                                  <Check size={12} /> Listo
                                </button>
                              )}
                              {isReady && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void updateLineStatus(line.id, "SERVED")}
                                  className="px-2 py-1 text-xs font-medium rounded-md bg-zinc-800 text-emerald-400 hover:bg-zinc-700 transition flex items-center gap-1"
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
                  <div className="p-2.5 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void markAllTicketReady(ticket)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white transition flex-1 flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Todo Listo
                    </button>
                    <button
                      type="button"
                      onClick={() => void markAllTicketServed(ticket)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition flex-1 flex items-center justify-center gap-1"
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
