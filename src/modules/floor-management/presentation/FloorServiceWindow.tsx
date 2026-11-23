"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { ArrowRight, Check, Printer, ReceiptText, RotateCw, UserCheck } from "lucide-react";
import type {
  KitchenStation,
  ServiceAccountPaymentView,
  ServiceAccountView,
  ServiceDraftRemovalInput,
  ServiceOrderItemInput,
  ServiceOrderLineView,
  ServiceProductView,
  ServiceUnservedGroup,
  StaffMemberView,
} from "@/modules/reservation-management/contracts";
import { floorInputClass } from "./floor-api";
import {
  amount,
  paymentLabels,
  splitModeLabels,
  type DraftOrderItem,
} from "./floor-service-format";
import { FloorServiceCatalog } from "./FloorServiceCatalog";
import { FloorServiceCheckoutView, type CheckoutSubmitPayload } from "./FloorServiceCheckoutView";
import { FloorServiceDraftPanel } from "./FloorServiceDraftPanel";
import { FloorServiceTicketPanel } from "./FloorServiceTicketPanel";
import { floorPrimaryButtonClass, floorSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";
import type { FloorServiceCommand } from "./useFloorService";
import styles from "./floor-service-receipt.module.css";
import modalStyles from "./floor-table-modal.module.css";

export type FloorServiceTarget = {
  allocationId: string;
  customerName: string;
  reservationCode: string;
  tableLabels: string[];
  tableId: string;
  partySize?: number;
  recovery?: boolean;
};

const fieldClass = "grid min-w-0 gap-1.5 text-xs font-medium text-[var(--floor-muted,#4b6470)]";
const cardClass = "rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-3";
const tableActionButtonClass = "inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--floor-border,#cad9df)] bg-white px-2 text-[11px] font-medium text-[var(--floor-ink,#173642)] transition-colors hover:border-[var(--floor-border-hover,#9fb8c3)] hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-45";

export function FloorServiceAccounts({ accounts, unserved, error, loading, historical, onChoose, onRecover, onRefresh }: {
  accounts: ServiceAccountView[]; unserved: ServiceUnservedGroup[]; error: string | null; loading: boolean; historical: boolean;
  onChoose: (account: ServiceAccountView) => void; onRecover: (group: ServiceUnservedGroup) => void; onRefresh: () => void;
}) {
  const visible = historical ? accounts : accounts.filter((account) => !account.closedAt);
  return <section aria-label={historical ? "Recibos del horario consultado" : "Cuentas abiertas"} className={floorWindowBodyClass}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-[var(--floor-muted,#4b6470)]">{historical ? "Consulta de recibos guardados." : "Cuentas abiertas en todos los salones."}</p>
      <button type="button" className={floorSecondaryButtonClass} onClick={onRefresh} aria-label="Actualizar cuentas"><RotateCw size={15} aria-hidden="true" /></button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
    {loading ? <p role="status" className="py-5 text-sm">Consultando las cuentas…</p>
      : !visible.length && !error ? <p className="py-5 text-sm text-[var(--floor-muted,#4b6470)]">{historical ? "No hay cuentas disponibles para este horario." : "No hay cuentas abiertas. Elegí una mesa ocupada en el plano o desde Reservas."}</p>
      : <ul className="space-y-2.5">{visible.map((account) => <li key={account.id}>
        <button type="button" onClick={() => onChoose(account)} className={`${cardClass} flex w-full items-center justify-between gap-3 text-left hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)]`}>
          <span className="min-w-0">
            <span className="block font-semibold">{account.customerName}</span>
            <span className="block text-xs text-[var(--floor-muted,#4b6470)]">
              {account.roomName} · {account.tableLabels.join(" + ")}
              {account.assignedWaiterName ? ` · Camarero: ${account.assignedWaiterName}` : ""}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">{amount(account.totalCents ?? account.orderedCents)}<ArrowRight size={14} aria-hidden="true" /></span>
        </button>
      </li>)}</ul>}
    {!historical && unserved.length > 0 && <section aria-label="Grupos vencidos sin cuenta" className="space-y-2.5">
      <h3 className="text-sm font-semibold">Grupos vencidos sin cuenta</h3>
      <ul className="space-y-2.5">{unserved.map((group) => <li key={`${group.allocationId}:${group.tableId}`} className={`${cardClass} flex flex-wrap items-center justify-between gap-2`}>
        <p className="min-w-0"><span className="block text-sm font-semibold">{group.customerName}</span><span className="block text-xs text-[var(--floor-muted,#4b6470)]">{group.roomName} · {group.tableLabels.join(" + ")}</span></p>
        <button type="button" className={floorSecondaryButtonClass} onClick={() => onRecover(group)}>Cerrar sin consumo</button>
      </li>)}</ul>
    </section>}
  </section>;
}

export function FloorServiceWindow({
  target,
  account,
  products,
  waiters,
  staffHref,
  restaurantName,
  timeZone,
  loading,
  loadError,
  busy,
  historical,
  canOpen,
  allocationVersion,
  conflict,
  cashClosed,
  onCommand,
  onRefresh,
  onClose,
  onDirtyChange,
}: {
  target: FloorServiceTarget;
  account?: ServiceAccountView;
  products: ServiceProductView[];
  waiters: StaffMemberView[];
  staffHref?: string;
  restaurantName: string;
  timeZone: string;
  loading: boolean;
  loadError: string | null;
  busy: boolean;
  historical: boolean;
  canOpen: boolean;
  allocationVersion?: number;
  conflict: boolean;
  cashClosed: boolean;
  onCommand: (command: FloorServiceCommand) => Promise<ServiceAccountView>;
  onRefresh: () => void;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ServiceAccountView | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [openPartySize, setOpenPartySize] = useState(target.partySize ? String(target.partySize) : "");
  const [reassigningWaiter, setReassigningWaiter] = useState(false);
  const [nextWaiterId, setNextWaiterId] = useState("");
  const [checkoutSession, setCheckoutSession] = useState<{ version: number; tab: "FULL" | "BY_ITEMS" | "BY_PEOPLE" } | null>(null);
  const [mobilePane, setMobilePane] = useState<"catalog" | "ticket">("catalog");
  const [lastPartialPayment, setLastPartialPayment] = useState<ServiceAccountPaymentView | null>(null);
  const [printingPayment, setPrintingPayment] = useState<ServiceAccountPaymentView | null>(null);
  const nextDraftKeyRef = useRef(0);
  const [draftState, setDraftState] = useState<{ accountId: string | null; items: DraftOrderItem[]; removals: ServiceDraftRemovalInput[] }>({
    accountId: account?.id ?? null,
    items: [],
    removals: [],
  });

  const savedReceipt = account?.closedAt ? account : historical ? null : receipt;
  const activeAccount = savedReceipt ? undefined : account;
  const draftItems = activeAccount && draftState.accountId === activeAccount.id ? draftState.items : [];
  const draftRemovals = activeAccount && draftState.accountId === activeAccount.id ? draftState.removals : [];
  const confirming = Boolean(activeAccount && checkoutSession !== null);
  const isDirty = Boolean(activeAccount && (draftItems.length > 0 || confirming));

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const printPartialPayment = (entry: ServiceAccountPaymentView) => {
    flushSync(() => setPrintingPayment(entry));
    try {
      window.print();
    } finally {
      setPrintingPayment(null);
    }
  };

  const run = async (command: FloorServiceCommand) => {
    setFailure(null);
    try {
      const updated = await onCommand(command);
      if (command.action === "checkout" || command.action === "close-empty" || (command.action === "pay-partial" && updated.closedAt !== null)) {
        setReceipt(updated);
      } else if (command.action === "pay-partial") {
        setLastPartialPayment(updated.payments[updated.payments.length - 1] ?? null);
      }
      return true;
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "No se pudo guardar la cuenta. Volvé a intentar.");
      return false;
    }
  };

  if (savedReceipt) {
    return <ServiceReceipt account={savedReceipt} restaurantName={restaurantName} timeZone={timeZone} onClose={onClose} />;
  }

  const error = failure || loadError;
  if (target.recovery && !historical && !account) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-5">
          <div>
            <h3 className="text-base font-bold text-[var(--floor-ink,#173642)]">{target.customerName}</h3>
            <p className="mt-1 text-sm text-[var(--floor-muted,#4b6470)]">{target.reservationCode} · {target.tableLabels.join(" + ")}</p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
          <p className="text-sm leading-relaxed text-[var(--floor-ink,#173642)]">
            {allocationVersion === undefined
              ? "El grupo ya no está disponible para este cierre."
              : cashClosed
                ? "La caja del día está cerrada. Un administrador debe reabrirla para cerrar este grupo."
                : "Se guardará un recibo de $0 y se liberarán las mesas de este grupo."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={floorPrimaryButtonClass}
              disabled={busy || cashClosed || Boolean(loadError) || allocationVersion === undefined}
              onClick={() => allocationVersion !== undefined && void run({
                action: "close-empty",
                allocationId: target.allocationId,
                tableId: target.tableId,
                expectedAllocationVersion: allocationVersion,
              })}
            >
              Confirmar cierre sin consumo
            </button>
            {loadError && <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={onRefresh}>Actualizar cuenta</button>}
          </div>
        </div>
      </div>
    );
  }

  const chosenWaiterId = waiters.some((waiter) => waiter.id === selectedWaiterId) ? selectedWaiterId : "";
  const parsedOpenPartySize = openPartySize.trim() ? Number(openPartySize) : undefined;
  if (!account) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4">
              <h3 className="text-base font-bold text-[var(--floor-ink,#173642)]">{target.customerName}</h3>
              <p className="mt-1 text-sm text-[var(--floor-muted,#4b6470)]">{target.reservationCode} · {target.tableLabels.join(" + ")}</p>
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {loading ? (
              <p role="status" className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 text-sm">Consultando el servicio…</p>
            ) : historical ? (
              <p className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 text-sm">No hay una cuenta disponible para este grupo en el horario consultado.</p>
            ) : conflict ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Hay una cuenta de otro grupo en estas mesas. Cerrá esa cuenta antes de abrir la siguiente.</p>
            ) : !canOpen || allocationVersion === undefined ? (
              <p className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 text-sm">La asignación ya no está disponible para abrir una cuenta.</p>
            ) : waiters.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-950">Todavía no hay camareros activos cargados para asignar a esta mesa.</p>
                {staffHref && <Link href={staffHref} className={floorSecondaryButtonClass}>Ir a Personal para cargar camareros</Link>}
              </div>
            ) : (
              <div className="grid gap-4 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--floor-ink,#173642)]">
                    Asigná el camarero que atiende esta mesa para iniciar el servicio.
                  </p>
                  <label className={`${fieldClass} max-w-52`}>
                    Comensales (opcional)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      placeholder="Según reserva"
                      value={openPartySize}
                      disabled={busy || Boolean(loadError)}
                      onChange={(event) => setOpenPartySize(event.target.value)}
                      className={`${floorInputClass} min-h-11`}
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <div role="radiogroup" aria-label="Camarero asignado" className="grid gap-2 sm:grid-cols-2">
                    {waiters.map((waiter) => {
                      const selected = chosenWaiterId === waiter.id;
                      return (
                        <button
                          key={waiter.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={busy || Boolean(loadError)}
                          onClick={() => setSelectedWaiterId(waiter.id)}
                          className={`${cardClass} flex min-h-13 w-full items-center justify-between gap-3 text-left transition-colors ${
                            selected
                              ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-hover,#e6f2f6)] ring-2 ring-[var(--floor-focus,#0e7490)]/20"
                              : "hover:bg-[var(--floor-hover,#e6f2f6)]"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-[var(--floor-ink,#173642)]">{waiter.name}</span>
                            {waiter.notes && <span className="block text-xs text-[var(--floor-muted,#4b6470)]">{waiter.notes}</span>}
                          </span>
                          {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-[var(--floor-action,#155e75)]" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button
                      type="button"
                      className={floorPrimaryButtonClass}
                      disabled={!chosenWaiterId || busy || conflict || Boolean(loadError)}
                      onClick={() => void run({
                        action: "open",
                        allocationId: target.allocationId,
                        tableId: target.tableId,
                        expectedAllocationVersion: allocationVersion,
                        waiterId: chosenWaiterId,
                        ...(parsedOpenPartySize && Number.isInteger(parsedOpenPartySize) && parsedOpenPartySize >= 1 && parsedOpenPartySize <= 100
                          ? { partySize: parsedOpenPartySize }
                          : {}),
                      })}
                    >
                      <UserCheck size={16} aria-hidden="true" />Asignar camarero y abrir cuenta
                    </button>
                  </div>
                </div>
              </div>
            )}
            {loadError && (
              <div>
                <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={onRefresh}>
                  Actualizar cuenta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const versionChanged = checkoutSession !== null && checkoutSession.version !== account.version;
  const locked = historical || busy || Boolean(loadError);
  const canCheckout = !locked && !cashClosed && account.pendingQuantity === 0 && draftItems.length === 0;
  const canPartialPay = !locked && !cashClosed && account.remainingCents > 0;
  const identity = { accountId: account.id, expectedVersion: account.version };

  const updateLine = (line: ServiceOrderLineView, field: "deliveredQuantity" | "cancelledQuantity", delta: number) => {
    void run({
      action: "update-line",
      ...identity,
      lineId: line.id,
      deliveredQuantity: line.deliveredQuantity,
      cancelledQuantity: line.cancelledQuantity,
      [field]: line[field] + delta,
    });
  };

  const toDraftRemoval = (item: DraftOrderItem, quantity: number, reason: ServiceDraftRemovalInput["reason"]): ServiceDraftRemovalInput => ({
    ...(item.productId ? { productId: item.productId } : {}),
    name: item.name,
    unitPriceCents: item.unitPriceCents,
    quantity,
    reason,
  });

  const updateDraftState = (
    updater: (items: DraftOrderItem[], removals: ServiceDraftRemovalInput[]) => { items: DraftOrderItem[]; removals: ServiceDraftRemovalInput[] },
  ) => {
    setFailure(null);
    setDraftState((current) => {
      const currentItems = current.accountId === account.id ? current.items : [];
      const currentRemovals = current.accountId === account.id ? current.removals : [];
      const next = updater(currentItems, currentRemovals);
      return { accountId: account.id, items: next.items, removals: next.removals.slice(-50) };
    });
  };

  const addDraftItem = (item: Omit<DraftOrderItem, "key">) => {
    updateDraftState((current, removals) => {
      const existingIndex = current.findIndex((entry) =>
        (item.productId ? entry.productId === item.productId : !entry.productId && entry.name === item.name && entry.unitPriceCents === item.unitPriceCents)
        && entry.notes === item.notes
        && entry.station === item.station
        && entry.quantity + item.quantity <= 99,
      );
      if (existingIndex >= 0) {
        return {
          items: current.map((entry, index) => index === existingIndex ? { ...entry, quantity: entry.quantity + item.quantity } : entry),
          removals,
        };
      }
      nextDraftKeyRef.current += 1;
      return { items: [...current, { ...item, key: `draft-${nextDraftKeyRef.current}` }], removals };
    });
  };

  const changeDraftQuantity = (key: string, delta: number) => {
    updateDraftState((current, removals) => {
      const targetItem = current.find((item) => item.key === key);
      if (!targetItem) return { items: current, removals };
      const nextQuantity = Math.min(99, Math.max(1, targetItem.quantity + delta));
      const reducedBy = targetItem.quantity - nextQuantity;
      const nextRemovals = reducedBy > 0 ? [...removals, toDraftRemoval(targetItem, reducedBy, "DECREMENTED")] : removals;
      return {
        items: current.map((item) => item.key === key ? { ...item, quantity: nextQuantity } : item),
        removals: nextRemovals,
      };
    });
  };

  const changeDraftStation = (key: string, station: KitchenStation) => {
    updateDraftState((current, removals) => ({
      items: current.map((item) => item.key === key ? { ...item, station } : item),
      removals,
    }));
  };

  const changeDraftNotes = (key: string, notes: string) => {
    updateDraftState((current, removals) => ({
      items: current.map((item) => item.key === key ? { ...item, notes } : item),
      removals,
    }));
  };

  const removeDraftItem = (key: string) => {
    updateDraftState((current, removals) => {
      const targetItem = current.find((item) => item.key === key);
      if (!targetItem) return { items: current, removals };
      return {
        items: current.filter((item) => item.key !== key),
        removals: [...removals, toDraftRemoval(targetItem, targetItem.quantity, "REMOVED")],
      };
    });
  };

  const clearDraftList = () => {
    updateDraftState((current, removals) => ({
      items: [],
      removals: [...removals, ...current.map((item) => toDraftRemoval(item, item.quantity, "CLEARED"))],
    }));
  };

  const confirmDraftOrder = async () => {
    if (locked || confirming || draftItems.length === 0) return;
    const items: ServiceOrderItemInput[] = draftItems.map((item) => item.productId
      ? { productId: item.productId, quantity: item.quantity, ...(item.notes.trim() ? { notes: item.notes.trim() } : {}), station: item.station }
      : { name: item.name, unitPriceCents: item.unitPriceCents, quantity: item.quantity, ...(item.notes.trim() ? { notes: item.notes.trim() } : {}), station: item.station },
    );
    const ok = await run({
      action: "confirm-order",
      ...identity,
      items,
      ...(draftRemovals.length > 0 ? { draftRemovals } : {}),
    });
    if (ok) {
      setDraftState({ accountId: account.id, items: [], removals: [] });
    }
  };

  const handleCheckoutSubmit = async (payload: CheckoutSubmitPayload) => {
    const commonPaymentFields = {
      tipCents: payload.tipCents > 0 ? payload.tipCents : undefined,
      discountCents: payload.discountCents > 0 ? payload.discountCents : undefined,
      discountReason: payload.discountReason || undefined,
      cashCents: payload.payment === "SPLIT" ? payload.cashCents : undefined,
      cardCents: payload.payment === "SPLIT" ? payload.cardCents : undefined,
      transferCents: payload.payment === "SPLIT" ? payload.transferCents : undefined,
      ...(draftRemovals.length > 0 ? { draftRemovals } : {}),
    };

    if (payload.checkoutTab === "FULL" || account.remainingCents === 0) {
      if (!canCheckout || (account.remainingCents > 0 && !payload.payment)) return;
      const ok = await run({
        action: "checkout",
        ...identity,
        paymentMethod: payload.payment || undefined,
        ...commonPaymentFields,
      });
      if (ok) {
        setDraftState({ accountId: account.id, items: [], removals: [] });
        setCheckoutSession(null);
      }
      return;
    }

    if (!canPartialPay || !payload.payment) return;
    if (payload.checkoutTab === "BY_ITEMS") {
      if (!payload.selectedItems.length) return;
      const ok = await run({
        action: "pay-partial",
        ...identity,
        splitMode: "BY_ITEMS",
        payerLabel: payload.payerLabel || undefined,
        paymentMethod: payload.payment,
        items: payload.selectedItems,
        ...commonPaymentFields,
      });
      if (ok) {
        setDraftState((current) => current.accountId === account.id ? { ...current, removals: [] } : current);
        setCheckoutSession(null);
        setMobilePane("ticket");
      }
      return;
    }

    const ok = await run({
      action: "pay-partial",
      ...identity,
      splitMode: "BY_PEOPLE",
      payerLabel: payload.payerLabel || undefined,
      paymentMethod: payload.payment,
      amountCents: payload.customPeopleCents,
      ...commonPaymentFields,
    });
    if (ok) {
      setDraftState((current) => current.accountId === account.id ? { ...current, removals: [] } : current);
      setCheckoutSession(null);
      setMobilePane("ticket");
    }
  };

  const draftUnits = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--floor-border,#cad9df)] bg-white px-4 py-2 text-xs sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <strong className="text-sm text-[var(--floor-ink,#173642)]">{account.customerName}</strong>
            <span className="text-[var(--floor-muted,#4b6470)]">
              {account.reservationCode} · {account.tableLabels.join(" + ")} · {account.partySize} {account.partySize === 1 ? "comensal" : "comensales"}
            </span>
            <span className="rounded-md bg-[var(--floor-hover,#e6f2f6)] px-2 py-0.5 font-semibold text-[var(--floor-action,#155e75)]">
              Cuenta abierta
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--floor-ink,#173642)]">
              <UserCheck size={14} aria-hidden="true" />
              Camarero: <strong>{account.assignedWaiterName ?? "Sin asignar"}</strong>
            </span>
            {!historical && waiters.length > 0 && !reassigningWaiter && (
              <button
                type="button"
                disabled={locked || confirming}
                onClick={() => { setNextWaiterId(account.assignedWaiterId ?? waiters[0]?.id ?? ""); setReassigningWaiter(true); }}
                className="font-semibold text-[var(--floor-action,#155e75)] underline underline-offset-2 disabled:opacity-50"
              >
                Cambiar camarero
              </button>
            )}
          </div>
        </div>

        {reassigningWaiter && !historical && (
          <form
            aria-label="Reasignar camarero"
            className="flex shrink-0 flex-wrap items-end gap-2 border-b border-[var(--floor-border,#cad9df)] bg-[var(--floor-hover,#e6f2f6)]/60 px-4 py-2.5 sm:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!nextWaiterId) return;
              void run({ action: "assign-waiter", ...identity, waiterId: nextWaiterId }).then((ok) => {
                if (ok) setReassigningWaiter(false);
              });
            }}
          >
            <label className={`${fieldClass} min-w-44 max-w-xs flex-1`}>
              Nuevo camarero
              <select className={floorInputClass} disabled={locked} value={nextWaiterId} onChange={(event) => setNextWaiterId(event.target.value)}>
                {waiters.map((waiter) => (
                  <option key={waiter.id} value={waiter.id}>{waiter.name}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-1.5">
              <button type="button" className={floorSecondaryButtonClass} disabled={locked} onClick={() => setReassigningWaiter(false)}>Cancelar</button>
              <button type="submit" className={floorPrimaryButtonClass} disabled={locked || !nextWaiterId || nextWaiterId === account.assignedWaiterId}>Guardar</button>
            </div>
          </form>
        )}

        {error && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 sm:px-6">
            <p role="alert">{error}</p>
            {loadError && <button type="button" className={tableActionButtonClass} disabled={busy} onClick={onRefresh}>Actualizar cuenta</button>}
          </div>
        )}

        {confirming ? (
          <FloorServiceCheckoutView
            key={`${account.id}:${checkoutSession!.version}:${checkoutSession!.tab}`}
            account={account}
            initialTab={checkoutSession!.tab}
            versionChanged={versionChanged}
            locked={locked}
            busy={busy}
            canCheckout={canCheckout}
            canPartialPay={canPartialPay}
            draftItemsCount={draftItems.length}
            onBack={() => setCheckoutSession(null)}
            onSubmit={(payload) => void handleCheckoutSubmit(payload)}
          />
        ) : (
          <>
            {!historical && (
              <div role="tablist" aria-label="Secciones de la cuenta" className={`${modalStyles.tabList} shrink-0 lg:hidden`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobilePane === "catalog"}
                  className={modalStyles.tabButton}
                  onClick={() => setMobilePane("catalog")}
                >
                  Agregar pedido
                  {draftUnits > 0 && (
                    <span className="rounded-full bg-[var(--floor-action,#155e75)] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                      {draftUnits}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobilePane === "ticket"}
                  className={modalStyles.tabButton}
                  onClick={() => setMobilePane("ticket")}
                >
                  Comanda y cobro
                  <span className="rounded-full bg-[var(--floor-canvas,#eef4f6)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--floor-ink,#173642)] tabular-nums">
                    {amount(account.remainingCents > 0 ? account.remainingCents : account.orderedCents)}
                  </span>
                </button>
              </div>
            )}

            <div className={`min-h-0 flex-1 overflow-hidden p-3 sm:p-4 ${historical ? "flex flex-col" : "flex flex-col lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-4"}`}>
              {!historical && (
                <div className={`${mobilePane === "catalog" ? "flex" : "hidden lg:flex"} min-h-0 flex-1 flex-col gap-3 overflow-hidden`}>
                  <FloorServiceCatalog
                    products={products}
                    draftItems={draftItems}
                    busy={locked}
                    onAddItem={addDraftItem}
                  />
                  <FloorServiceDraftPanel
                    items={draftItems}
                    busy={locked}
                    onChangeQuantity={changeDraftQuantity}
                    onChangeStation={changeDraftStation}
                    onChangeNotes={changeDraftNotes}
                    onRemoveItem={removeDraftItem}
                    onClearList={clearDraftList}
                    onConfirmOrder={() => void confirmDraftOrder()}
                  />
                </div>
              )}

              <div className={`${historical || mobilePane === "ticket" ? "flex" : "hidden lg:flex"} min-h-0 flex-1 flex-col overflow-hidden`}>
                <FloorServiceTicketPanel
                  account={account}
                  draftItemsCount={draftItems.length}
                  historical={historical}
                  locked={locked}
                  cashClosed={cashClosed}
                  canCheckout={canCheckout}
                  canPartialPay={canPartialPay}
                  lastPartialPayment={lastPartialPayment}
                  onUpdateLine={updateLine}
                  onMarchRound={() => void run({ action: "march-round", ...identity })}
                  onDeliverAll={() => void run({ action: "deliver-all", ...identity })}
                  onPrintPartial={printPartialPayment}
                  onOpenCheckout={(tab) => {
                    setLastPartialPayment(null);
                    setCheckoutSession({ version: account.version, tab });
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {printingPayment && createPortal(
        <div aria-hidden="true" className={styles.printReceipt}>
          <PartialPaymentReceipt payment={printingPayment} account={account} restaurantName={restaurantName} timeZone={timeZone} />
        </div>,
        document.body,
      )}
    </>
  );
}

type ServiceReceiptProps = { account: ServiceAccountView; restaurantName: string; timeZone: string; onClose?: () => void };

function ServiceReceipt({ onClose, ...props }: ServiceReceiptProps) {
  const [printing, setPrinting] = useState(false);
  const print = () => {
    flushSync(() => setPrinting(true));
    try { window.print(); } finally { setPrinting(false); }
  };
  return <>
    <section aria-label="Recibo de consumo" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-5">
        <ServiceReceiptContent {...props} />
      </div>
    </section>
    <footer className={`${floorWindowFooterClass} flex flex-wrap justify-end gap-2`}>
      {onClose && <button type="button" className={floorSecondaryButtonClass} onClick={onClose}>Volver al salón</button>}
      <button type="button" className={floorPrimaryButtonClass} onClick={print}><Printer size={16} aria-hidden="true" />Imprimir recibo</button>
    </footer>
    {printing && createPortal(<div aria-hidden="true" className={styles.printReceipt}><ServiceReceiptContent {...props} /></div>, document.body)}
  </>;
}

function ServiceReceiptContent({ account, restaurantName, timeZone }: Omit<ServiceReceiptProps, "onClose">) {
  const time = account.closedAt ? new Intl.DateTimeFormat("es-AR", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(account.closedAt)) : "";
  const splitPayments = account.payments.length > 1 || account.payments.some((entry) => entry.splitMode !== "FULL");
  return <div className="space-y-4">
    <header className="rounded-xl bg-[var(--floor-hover,#e6f2f6)] p-4"><ReceiptText size={22} aria-hidden="true" /><p className="mt-2 text-sm font-medium">{restaurantName}</p><h3 className="text-lg font-semibold">Recibo de consumo {account.receiptNumber != null && `#${account.receiptNumber}`}</h3><p className="mt-1 text-sm">{account.customerName} · {account.roomName} · {account.tableLabels.join(" + ")} · {account.partySize} {account.partySize === 1 ? "comensal" : "comensales"}</p><p className="mt-1 text-xs text-[var(--floor-muted,#4b6470)]">{time} · Reserva {account.reservationCode}</p></header>
    <ul className="divide-y divide-[var(--floor-border,#cad9df)] text-sm">{account.lines.filter((line) => line.deliveredQuantity > 0).map((line) => <li key={line.id} className="flex items-start justify-between gap-3 py-2"><div><span>{line.deliveredQuantity} × {line.name}</span>{line.notes && <p className="text-xs text-[var(--floor-muted,#4b6470)] italic">Nota: {line.notes}</p>}</div><span className="shrink-0 tabular-nums">{amount(line.deliveredQuantity * line.unitPriceCents)}</span></li>)}</ul>
    <div className="space-y-1.5 border-t border-[var(--floor-border,#cad9df)] pt-3 text-sm">
      <div className="flex justify-between text-xs text-[var(--floor-muted,#4b6470)]"><span>Subtotal entregado</span><span className="tabular-nums">{amount(account.deliveredCents)}</span></div>
      {account.discountCents > 0 && <div className="flex justify-between text-xs text-emerald-800"><span>Descuento {account.discountReason ? `(${account.discountReason})` : ""}</span><span className="tabular-nums">-{amount(account.discountCents)}</span></div>}
      {account.tipCents > 0 && <div className="flex justify-between text-xs text-[var(--floor-muted,#4b6470)]"><span>Propina</span><span className="tabular-nums">+{amount(account.tipCents)}</span></div>}
      <dl className="flex items-baseline justify-between gap-2 border-t border-[var(--floor-border,#cad9df)] pt-2"><div><dt className="text-sm font-semibold">Total cobrado</dt><dd className="text-lg font-bold tabular-nums">{amount(account.totalCents ?? 0)}</dd></div><div className="text-right"><dt className="text-xs text-[var(--floor-muted,#4b6470)]">Medio de pago</dt><dd className="text-sm font-medium">{account.paymentMethod ? paymentLabels[account.paymentMethod] : "Sin consumo"}</dd></div></dl>
      {account.paymentMethod === "SPLIT" && <div className="space-y-1 rounded-lg bg-[var(--floor-hover,#e6f2f6)] p-2.5 text-xs">
        <p className="font-semibold text-[var(--floor-ink,#173642)]">Desglose de cobro:</p>
        {account.cashCents > 0 && <div className="flex justify-between"><span>Efectivo:</span><span className="tabular-nums">{amount(account.cashCents)}</span></div>}
        {account.cardCents > 0 && <div className="flex justify-between"><span>Tarjeta:</span><span className="tabular-nums">{amount(account.cardCents)}</span></div>}
        {account.transferCents > 0 && <div className="flex justify-between"><span>Transferencia o QR:</span><span className="tabular-nums">{amount(account.transferCents)}</span></div>}
      </div>}
    </div>
    {splitPayments && (
      <section aria-label="Cómo se dividió la cuenta" className="space-y-2 border-t border-[var(--floor-border,#cad9df)] pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--floor-muted,#4b6470)]">
          Cómo se dividió la cuenta ({account.payments.length} {account.payments.length === 1 ? "pago" : "pagos"})
        </h4>
        <ul className="space-y-2 text-xs">
          {account.payments.map((entry) => (
            <li key={entry.id} className="space-y-1 rounded-lg border border-[var(--floor-border,#cad9df)] bg-white p-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{entry.receiptNumber} · {entry.payerLabel} ({splitModeLabels[entry.splitMode]})</span>
                <span className="font-semibold tabular-nums">{amount(entry.totalCents)} · {paymentLabels[entry.paymentMethod]}</span>
              </div>
              {entry.items.length > 0 && (
                <p className="text-[11px] text-[var(--floor-muted,#4b6470)]">
                  Productos: {entry.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                </p>
              )}
              {(entry.discountCents > 0 || entry.tipCents > 0) && (
                <p className="text-[11px] text-[var(--floor-muted,#4b6470)] tabular-nums">
                  {entry.discountCents > 0 && `Descuento: -${amount(entry.discountCents)}${entry.discountReason ? ` (${entry.discountReason})` : ""}`}
                  {entry.discountCents > 0 && entry.tipCents > 0 && " · "}
                  {entry.tipCents > 0 && `Propina: +${amount(entry.tipCents)}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    )}
    <p className="text-xs text-[var(--floor-muted,#4b6470)]">Recibo interno guardado para el cierre de caja.</p>
  </div>;
}

function PartialPaymentReceipt({ payment, account, restaurantName, timeZone }: { payment: ServiceAccountPaymentView; account: ServiceAccountView; restaurantName: string; timeZone: string }) {
  const time = new Intl.DateTimeFormat("es-AR", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(payment.paidAt));
  return (
    <div className="space-y-4">
      <header className="rounded-xl bg-[var(--floor-hover,#e6f2f6)] p-4">
        <p className="text-sm font-medium">{restaurantName}</p>
        <h3 className="text-lg font-semibold">Comprobante parcial {payment.receiptNumber}</h3>
        <p className="mt-1 text-sm">{payment.payerLabel} · {account.roomName} · {account.tableLabels.join(" + ")}</p>
        <p className="mt-1 text-xs text-[var(--floor-muted,#4b6470)]">{time} · {splitModeLabels[payment.splitMode]}</p>
      </header>
      {payment.items.length > 0 && (
        <ul className="divide-y divide-[var(--floor-border,#cad9df)] text-sm">
          {payment.items.map((item) => (
            <li key={item.lineId} className="flex items-start justify-between gap-3 py-2">
              <span>{item.quantity} × {item.name}</span>
              <span className="shrink-0 tabular-nums">{amount(item.quantity * item.unitPriceCents)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-1.5 border-t border-[var(--floor-border,#cad9df)] pt-3 text-sm">
        <div className="flex justify-between text-xs text-[var(--floor-muted,#4b6470)]"><span>Subtotal de esta parte</span><span className="tabular-nums">{amount(payment.subtotalCents)}</span></div>
        {payment.discountCents > 0 && <div className="flex justify-between text-xs text-emerald-800"><span>Descuento {payment.discountReason ? `(${payment.discountReason})` : ""}</span><span className="tabular-nums">-{amount(payment.discountCents)}</span></div>}
        {payment.tipCents > 0 && <div className="flex justify-between text-xs text-[var(--floor-muted,#4b6470)]"><span>Propina</span><span className="tabular-nums">+{amount(payment.tipCents)}</span></div>}
        <dl className="flex items-baseline justify-between gap-2 border-t border-[var(--floor-border,#cad9df)] pt-2">
          <div><dt className="text-sm font-semibold">Total abonado</dt><dd className="text-lg font-bold tabular-nums">{amount(payment.totalCents)}</dd></div>
          <div className="text-right"><dt className="text-xs text-[var(--floor-muted,#4b6470)]">Medio de pago</dt><dd className="text-sm font-medium">{paymentLabels[payment.paymentMethod]}</dd></div>
        </dl>
      </div>
    </div>
  );
}
