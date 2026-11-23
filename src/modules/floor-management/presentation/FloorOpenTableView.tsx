"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, Minus, Plus, UserCheck, Users } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";
import type { StaffMemberView } from "@/modules/reservation-management/contracts";
import { summarizeSectorQuota, type FloorAllocationView, type FloorLocation, type FloorRoom, type FloorTable } from "../contracts";
import { floorInputClass } from "./floor-api";
import { floorPrimaryButtonClass, floorSecondaryButtonClass } from "./floor-ui";

const quickPartySizes = [2, 4, 6, 8, 10] as const;
const fieldLabelClass = "grid min-w-0 gap-1.5 text-xs font-medium text-[var(--floor-muted,#4b6470)]";

export type FloorOpenTableViewProps = {
  room: FloorRoom;
  table: FloorTable;
  sector?: FloorLocation;
  allocations: FloorAllocationView[];
  at: string;
  waiters: StaffMemberView[];
  staffHref?: string;
  loadingWaiters: boolean;
  busy: boolean;
  cashClosed: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel: () => void;
  onSubmit: (payload: { partySize: number; waiterId: string; customerName?: string; notes?: string }) => Promise<void>;
};

export function FloorOpenTableView({
  room,
  table,
  sector,
  allocations,
  at,
  waiters,
  staffHref,
  loadingWaiters,
  busy,
  cashClosed,
  onDirtyChange,
  onCancel,
  onSubmit,
}: FloorOpenTableViewProps) {
  const [partySize, setPartySize] = useState(table.capacity);
  const [waiterId, setWaiterId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const chosenWaiterId = waiters.some((waiter) => waiter.id === waiterId)
    ? waiterId
    : waiters.length === 1
      ? waiters[0].id
      : "";

  const validPartySize = Number.isInteger(partySize) && partySize >= 1 && partySize <= 100;
  const quota = sector
    ? summarizeSectorQuota(sector, room.tables, allocations, at, validPartySize ? partySize : 0)
    : null;

  const notifyDirty = (nextPartySize: number, nextName: string, nextNotes: string) => {
    onDirtyChange?.(nextPartySize !== table.capacity || nextName.trim().length > 0 || nextNotes.trim().length > 0);
  };

  const updatePartySize = (next: number) => {
    const normalized = Math.min(100, Math.max(1, next));
    setPartySize(normalized);
    notifyDirty(normalized, customerName, notes);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chosenWaiterId || !validPartySize) return;
    setSubmitError(null);
    try {
      await onSubmit({
        partySize,
        waiterId: chosenWaiterId,
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : "No se pudo abrir la mesa.");
    }
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void submit(event)}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <section className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[var(--floor-ink,#173642)]">
                    Mesa {table.label}{sector ? ` · ${sector.name}` : ""}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--floor-muted,#4b6470)]">
                    Capacidad nominal de referencia: {table.capacity} {table.capacity === 1 ? "persona" : "personas"}. Podés sentar la cantidad real de comensales sin armar ni unir mesas.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--floor-hover,#e6f2f6)] px-3 py-1.5 text-xs font-semibold text-[var(--floor-action,#155e75)] tabular-nums">
                  <Users size={14} aria-hidden="true" />
                  {table.capacity}p base
                </span>
              </div>
            </section>

            {quota && (quota.status === "warning" || quota.status === "exceeded") && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  {quota.status === "exceeded"
                    ? `Este sector quedará por encima de su cupo (${quota.occupiedPartySize}/${quota.maxCapacity} personas). Podés abrir la mesa igual.`
                    : `Este sector quedará cerca de su cupo (${quota.occupiedPartySize}/${quota.maxCapacity} personas). Podés abrir la mesa igual.`}
                </span>
              </div>
            )}

            {cashClosed && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-950">
                La caja del día está cerrada. Un administrador deberá reabrirla antes de cobrar esta cuenta.
              </p>
            )}

            {submitError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                {submitError}
              </p>
            )}

            <section className="space-y-4 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4">
              <div className="space-y-2">
                <span className="block text-xs font-medium text-[var(--floor-muted,#4b6470)]">
                  Cantidad de comensales
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] p-1">
                    <button
                      type="button"
                      disabled={busy || partySize <= 1}
                      aria-label="Restar comensal"
                      onClick={() => updatePartySize((validPartySize ? partySize : table.capacity) - 1)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[var(--floor-ink,#173642)] shadow-xs hover:bg-[var(--floor-hover,#e6f2f6)] disabled:opacity-40"
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      aria-label="Comensales"
                      min={1}
                      max={100}
                      step={1}
                      required
                      disabled={busy}
                      value={Number.isNaN(partySize) ? "" : partySize}
                      onChange={(event) => {
                        const raw = event.target.value;
                        const next = raw === "" ? NaN : Number(raw);
                        setPartySize(next);
                        notifyDirty(next, customerName, notes);
                      }}
                      className="h-10 w-16 rounded-lg bg-white text-center text-base font-bold text-[var(--floor-ink,#173642)] tabular-nums outline-none focus:ring-2 focus:ring-[var(--floor-focus,#0e7490)]"
                    />
                    <button
                      type="button"
                      disabled={busy || partySize >= 100}
                      aria-label="Sumar comensal"
                      onClick={() => updatePartySize((validPartySize ? partySize : table.capacity) + 1)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[var(--floor-ink,#173642)] shadow-xs hover:bg-[var(--floor-hover,#e6f2f6)] disabled:opacity-40"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Comensales rápidos">
                    {quickPartySizes.map((count) => {
                      const active = partySize === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          disabled={busy}
                          onClick={() => updatePartySize(count)}
                          className={`min-h-10 rounded-lg border px-3 text-xs font-semibold tabular-nums transition-colors ${
                            active
                              ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-action,#155e75)] text-white"
                              : "border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
                          }`}
                        >
                          {count}p
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  Nombre del grupo (opcional)
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Sin reserva"
                    disabled={busy}
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value);
                      notifyDirty(partySize, event.target.value, notes);
                    }}
                    className={`${floorInputClass} min-h-11`}
                  />
                </label>

                <label className={fieldLabelClass}>
                  Notas de atención (opcional)
                  <input
                    type="text"
                    maxLength={500}
                    placeholder="Ej: mesa grande, silla para bebé"
                    disabled={busy}
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value);
                      notifyDirty(partySize, customerName, event.target.value);
                    }}
                    className={`${floorInputClass} min-h-11`}
                  />
                </label>
              </div>
            </section>
          </div>

          <section className="flex flex-col rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4">
            <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Camarero asignado</h4>
            <p className="mt-1 text-xs text-[var(--floor-muted,#4b6470)]">
              Elegí quién atiende la mesa para abrir la comanda.
            </p>
            <div className="mt-3 flex-1">
              {loadingWaiters ? (
                <p role="status" className="text-sm text-[var(--floor-muted,#4b6470)]">Cargando camareros…</p>
              ) : waiters.length === 0 ? (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <p className="text-xs font-medium text-amber-950">No hay camareros activos cargados para asignar a esta mesa.</p>
                  {staffHref && <Link href={staffHref} className={floorSecondaryButtonClass}>Ir a Personal para cargar camareros</Link>}
                </div>
              ) : (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Camarero asignado</legend>
                  <div role="radiogroup" aria-label="Camarero asignado" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {waiters.map((waiter) => {
                      const selected = chosenWaiterId === waiter.id;
                      return (
                        <button
                          key={waiter.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={busy}
                          onClick={() => setWaiterId(waiter.id)}
                          className={`flex min-h-13 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                            selected
                              ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-hover,#e6f2f6)] ring-2 ring-[var(--floor-focus,#0e7490)]/25"
                              : "border-[var(--floor-border,#cad9df)] bg-white hover:bg-[var(--floor-hover,#e6f2f6)]"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-[var(--floor-ink,#173642)]">{waiter.name}</span>
                            {waiter.notes && <span className="block truncate text-xs text-[var(--floor-muted,#4b6470)]">{waiter.notes}</span>}
                          </span>
                          {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-[var(--floor-action,#155e75)]" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--floor-border,#cad9df)] bg-white px-4 py-3 sm:px-6">
        <button {...transientButtonProps} type="button" disabled={busy} className={floorSecondaryButtonClass} onClick={onCancel}>
          Cancelar
        </button>
        <button
          {...transientButtonProps}
          type="submit"
          disabled={busy || !chosenWaiterId || !validPartySize}
          className={floorPrimaryButtonClass}
        >
          <UserCheck size={16} aria-hidden="true" />Abrir mesa
        </button>
      </footer>
    </form>
  );
}
