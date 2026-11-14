"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { createPortal, flushSync } from "react-dom";
import { ArrowRight, Check, CheckCheck, Clock3, Minus, Plus, Printer, ReceiptText, RotateCw, Search, Send, Trash2, UserCheck, Utensils } from "lucide-react";
import type { KitchenStation, KitchenStatus, ServiceAccountView, ServiceOrderItemInput, ServiceOrderLineView, ServicePaymentMethod, ServiceProductView, ServiceUnservedGroup, StaffMemberView } from "@/modules/reservation-management/contracts";
import { floorInputClass } from "./floor-api";
import { floorPrimaryButtonClass, floorSecondaryButtonClass, floorWindowBodyClass, floorWindowFooterClass } from "./floor-ui";
import type { FloorServiceCommand } from "./useFloorService";
import styles from "./floor-service-receipt.module.css";
import tableStyles from "./floor-service-table.module.css";

export type FloorServiceTarget = {
  allocationId: string;
  customerName: string;
  reservationCode: string;
  tableLabels: string[];
  tableId: string;
  recovery?: boolean;
};

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const amount = (cents: number) => money.format(cents / 100);
const fieldClass = "grid min-w-0 gap-1.5 text-xs font-medium text-[var(--floor-muted,#52634b)]";
const cardClass = "rounded-xl border border-[var(--floor-border,#e4e4e7)] bg-white p-3";
const tableActionButtonClass = "inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--floor-border,#d4d4d8)] bg-white px-2 text-[11px] font-medium text-[var(--floor-ink,#27272a)] transition-colors hover:border-[var(--floor-border-hover,#a1a1aa)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-45";
const tableDangerButtonClass = "inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-white px-2 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-45";
const paymentLabels: Record<ServicePaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER_QR: "Transferencia o QR",
  SPLIT: "Pago Dividido / Mixto",
};
const kitchenStatusBadge: Record<KitchenStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-zinc-100 text-zinc-600" },
  IN_PREP: { label: "En preparación", className: "bg-amber-100 text-amber-900 font-semibold animate-pulse" },
  READY: { label: "¡Listo para servir!", className: "bg-emerald-100 text-emerald-800 font-bold" },
  SERVED: { label: "Entregado", className: "bg-zinc-100 text-zinc-500" },
  CANCELLED: { label: "Anulado", className: "bg-zinc-100 text-zinc-400" },
};
const quantityLabel = (quantity: number, label: string) => `${quantity} ${label}${quantity === 1 ? "" : "s"}`;

function parsePrice(value: string) {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return 0;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function FloorServiceAccounts({ accounts, unserved, error, loading, historical, onChoose, onRecover, onRefresh }: {
  accounts: ServiceAccountView[]; unserved: ServiceUnservedGroup[]; error: string | null; loading: boolean; historical: boolean;
  onChoose: (account: ServiceAccountView) => void; onRecover: (group: ServiceUnservedGroup) => void; onRefresh: () => void;
}) {
  const visible = historical ? accounts : accounts.filter((account) => !account.closedAt);
  return <section aria-label={historical ? "Recibos del horario consultado" : "Cuentas abiertas"} className={floorWindowBodyClass}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-[var(--floor-muted,#52634b)]">{historical ? "Consulta de recibos guardados." : "Cuentas abiertas en todos los salones."}</p>
      <button type="button" className={floorSecondaryButtonClass} onClick={onRefresh} aria-label="Actualizar cuentas"><RotateCw size={15} aria-hidden="true" /></button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
    {loading ? <p role="status" className="py-5 text-sm">Consultando las cuentas…</p>
      : !visible.length && !error ? <p className="py-5 text-sm text-[var(--floor-muted,#52634b)]">{historical ? "No hay cuentas disponibles para este horario." : "No hay cuentas abiertas. Elegí una mesa ocupada en el plano o desde Reservas."}</p>
      : <ul className="space-y-2.5">{visible.map((account) => <li key={account.id}>
        <button type="button" onClick={() => onChoose(account)} className={`${cardClass} flex w-full items-center justify-between gap-3 text-left hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#3d5934)]`}>
          <span className="min-w-0">
            <span className="block font-semibold">{account.customerName}</span>
            <span className="block text-xs text-[var(--floor-muted,#52634b)]">
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
        <p className="min-w-0"><span className="block text-sm font-semibold">{group.customerName}</span><span className="block text-xs text-[var(--floor-muted,#52634b)]">{group.roomName} · {group.tableLabels.join(" + ")}</span></p>
        <button type="button" className={floorSecondaryButtonClass} onClick={() => onRecover(group)}>Cerrar sin consumo</button>
      </li>)}</ul>
    </section>}
  </section>;
}

export function FloorServiceWindow({ target, account, products, waiters, staffHref, restaurantName, timeZone, loading, loadError, busy, historical, canOpen, allocationVersion, conflict, cashClosed, onCommand, onRefresh }: {
  target: FloorServiceTarget; account?: ServiceAccountView; products: ServiceProductView[]; waiters: StaffMemberView[]; staffHref?: string;
  restaurantName: string; timeZone: string; loading: boolean;
  loadError: string | null; busy: boolean; historical: boolean; canOpen: boolean; allocationVersion?: number;
  conflict: boolean; cashClosed: boolean; onCommand: (command: FloorServiceCommand) => Promise<ServiceAccountView>; onRefresh: () => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ServiceAccountView | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [reassigningWaiter, setReassigningWaiter] = useState(false);
  const [nextWaiterId, setNextWaiterId] = useState("");
  const [checkoutVersion, setCheckoutVersion] = useState<number | null>(null);
  const [payment, setPayment] = useState<ServicePaymentMethod | "">("");
  const [tip, setTip] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");
  const nextDraftKeyRef = useRef(0);
  const [draftState, setDraftState] = useState<{ accountId: string | null; items: DraftOrderItem[] }>({ accountId: account?.id ?? null, items: [] });
  const draftCaptionId = useId();
  const confirmedCaptionId = useId();

  const resetCheckoutState = () => {
    setCheckoutVersion(null);
    setPayment("");
    setTip("");
    setDiscount("");
    setDiscountReason("");
    setSplitCash("");
    setSplitCard("");
    setSplitTransfer("");
  };

  const run = async (command: FloorServiceCommand) => {
    setFailure(null);
    try {
      const updated = await onCommand(command);
      if (command.action === "checkout" || command.action === "close-empty") setReceipt(updated);
      return true;
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "No se pudo guardar la cuenta. Volvé a intentar.");
      return false;
    }
  };
  const savedReceipt = account?.closedAt ? account : historical ? null : receipt;
  if (savedReceipt) return <ServiceReceipt account={savedReceipt} restaurantName={restaurantName} timeZone={timeZone} />;
  const error = failure || loadError;
  if (target.recovery && !historical && !account) return <div className={floorWindowBodyClass}>
    <h3 className="font-semibold">{target.customerName}</h3>
    <p className="text-sm text-[var(--floor-muted,#52634b)]">{target.reservationCode} · {target.tableLabels.join(" + ")}</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
    <p className="text-sm">{allocationVersion === undefined ? "El grupo ya no está disponible para este cierre." : cashClosed ? "La caja del día está cerrada. Un administrador debe reabrirla para cerrar este grupo." : "Se guardará un recibo de $0 y se liberarán las mesas de este grupo."}</p>
    <button type="button" className={floorPrimaryButtonClass} disabled={busy || cashClosed || Boolean(loadError) || allocationVersion === undefined} onClick={() => allocationVersion !== undefined && void run({ action: "close-empty", allocationId: target.allocationId, tableId: target.tableId, expectedAllocationVersion: allocationVersion })}>Confirmar cierre sin consumo</button>
    {loadError && <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={onRefresh}>Actualizar cuenta</button>}
  </div>;
  const chosenWaiterId = waiters.some((waiter) => waiter.id === selectedWaiterId) ? selectedWaiterId : "";
  if (!account) return <div className={floorWindowBodyClass}>
    <div><h3 className="font-semibold">{target.customerName}</h3><p className="mt-1 text-sm text-[var(--floor-muted,#52634b)]">{target.reservationCode} · {target.tableLabels.join(" + ")}</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
    {loading ? <p role="status" className="text-sm">Consultando el servicio…</p> : historical ? <p className="text-sm">No hay una cuenta disponible para este grupo en el horario consultado.</p>
      : conflict ? <p className="text-sm">Hay una cuenta de otro grupo en estas mesas. Cerrá esa cuenta antes de abrir la siguiente.</p>
      : !canOpen || allocationVersion === undefined ? <p className="text-sm">La asignación ya no está disponible para abrir una cuenta.</p>
      : waiters.length === 0 ? <div className="space-y-3">
          <p className="text-sm">Todavía no hay camareros activos cargados para asignar a esta mesa.</p>
          {staffHref && <Link href={staffHref} className={floorSecondaryButtonClass}>Ir a Personal para cargar camareros</Link>}
        </div>
      : <div className="space-y-3">
          <p className="text-sm">Asigná el camarero que atiende esta mesa para iniciar el servicio.</p>
          <div role="radiogroup" aria-label="Camarero asignado" className="grid gap-2">
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
                  className={`${cardClass} flex w-full items-center justify-between gap-3 text-left transition-colors ${
                    selected
                      ? "border-[#3d5934] bg-[var(--floor-hover,#edf2e9)] ring-2 ring-[#3d5934]/25"
                      : "hover:bg-[var(--floor-hover,#edf2e9)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-zinc-950">{waiter.name}</span>
                    {waiter.notes && <span className="block text-xs text-[var(--floor-muted,#52634b)]">{waiter.notes}</span>}
                  </span>
                  {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-[#263e23]" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={floorPrimaryButtonClass}
            disabled={!chosenWaiterId || busy || conflict || Boolean(loadError)}
            onClick={() => void run({ action: "open", allocationId: target.allocationId, tableId: target.tableId, expectedAllocationVersion: allocationVersion, waiterId: chosenWaiterId })}
          >
            <UserCheck size={16} aria-hidden="true" />Asignar camarero y abrir cuenta
          </button>
        </div>}
    {loadError && <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={onRefresh}>Actualizar cuenta</button>}
  </div>;

  const confirming = checkoutVersion !== null;
  const versionChanged = confirming && checkoutVersion !== account.version;
  const locked = historical || busy || Boolean(loadError);
  const draftItems = draftState.accountId === account.id ? draftState.items : [];
  const canCheckout = !locked && !cashClosed && account.pendingQuantity === 0 && draftItems.length === 0;
  const identity = { accountId: account.id, expectedVersion: account.version };
  const updateLine = (line: ServiceOrderLineView, field: "deliveredQuantity" | "cancelledQuantity", delta: number) => {
    void run({ action: "update-line", ...identity, lineId: line.id, deliveredQuantity: line.deliveredQuantity, cancelledQuantity: line.cancelledQuantity, [field]: line[field] + delta });
  };

  const updateDraftItems = (updater: (current: DraftOrderItem[]) => DraftOrderItem[]) => {
    setFailure(null);
    setDraftState((current) => ({
      accountId: account.id,
      items: updater(current.accountId === account.id ? current.items : []),
    }));
  };

  const addDraftItem = (item: Omit<DraftOrderItem, "key">) => {
    updateDraftItems((current) => {
      const existingIndex = current.findIndex((entry) =>
        (item.productId ? entry.productId === item.productId : !entry.productId && entry.name === item.name && entry.unitPriceCents === item.unitPriceCents)
        && entry.notes === item.notes
        && entry.station === item.station
        && entry.quantity + item.quantity <= 99,
      );
      if (existingIndex >= 0) {
        return current.map((entry, index) => index === existingIndex ? { ...entry, quantity: entry.quantity + item.quantity } : entry);
      }
      nextDraftKeyRef.current += 1;
      return [...current, { ...item, key: `draft-${nextDraftKeyRef.current}` }];
    });
  };

  const changeDraftQuantity = (key: string, delta: number) => {
    updateDraftItems((current) => current.map((item) =>
      item.key === key ? { ...item, quantity: Math.min(99, Math.max(1, item.quantity + delta)) } : item,
    ));
  };

  const removeDraftItem = (key: string) => {
    updateDraftItems((current) => current.filter((item) => item.key !== key));
  };

  const confirmDraftOrder = async () => {
    if (locked || confirming || draftItems.length === 0) return;
    const items: ServiceOrderItemInput[] = draftItems.map((item) => item.productId
      ? { productId: item.productId, quantity: item.quantity, ...(item.notes ? { notes: item.notes } : {}), station: item.station }
      : { name: item.name, unitPriceCents: item.unitPriceCents, quantity: item.quantity, ...(item.notes ? { notes: item.notes } : {}), station: item.station },
    );
    const ok = await run({ action: "confirm-order", ...identity, items });
    if (ok) {
      setDraftState({ accountId: account.id, items: [] });
    }
  };

  const draftTotalCents = draftItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const draftUnits = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  const tipCents = parsePrice(tip);
  const discountCents = parsePrice(discount);
  const netDeliveredCents = Math.max(0, account.deliveredCents - discountCents);
  const totalToPayCents = netDeliveredCents + tipCents;
  const splitCashCents = parsePrice(splitCash);
  const splitCardCents = parsePrice(splitCard);
  const splitTransferCents = parsePrice(splitTransfer);
  const splitSumCents = splitCashCents + splitCardCents + splitTransferCents;
  const splitValid = payment !== "SPLIT" || (account.deliveredCents > 0 ? splitSumCents === totalToPayCents : true);

  return <>
    <div className={floorWindowBodyClass}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{account.customerName}</h3>
            <p className="mt-1 text-sm text-[var(--floor-muted,#52634b)]">{account.reservationCode} · {account.tableLabels.join(" + ")}</p>
          </div>
          <span className="rounded-lg bg-[var(--floor-hover,#edf2e9)] px-2.5 py-1 text-xs font-semibold">Cuenta abierta</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--floor-border,#e4e4e7)] bg-white px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--floor-ink,#263e23)]">
            <UserCheck size={14} aria-hidden="true" />
            Camarero: <strong>{account.assignedWaiterName ?? "Sin asignar"}</strong>
          </span>
          {!historical && waiters.length > 0 && !reassigningWaiter && (
            <button
              type="button"
              disabled={locked || confirming}
              onClick={() => { setNextWaiterId(account.assignedWaiterId ?? waiters[0]?.id ?? ""); setReassigningWaiter(true); }}
              className="font-semibold text-[#263e23] underline underline-offset-2 disabled:opacity-50"
            >
              Cambiar camarero
            </button>
          )}
        </div>
        {reassigningWaiter && !historical && (
          <form
            aria-label="Reasignar camarero"
            className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--floor-border,#e4e4e7)] bg-white p-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!nextWaiterId) return;
              void run({ action: "assign-waiter", ...identity, waiterId: nextWaiterId }).then((ok) => {
                if (ok) setReassigningWaiter(false);
              });
            }}
          >
            <label className={`${fieldClass} min-w-36 flex-1`}>
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
      </header>
      <dl aria-live="polite" className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--floor-hover,#edf2e9)] p-3 text-xs">
        <div><dt>Consumo registrado</dt><dd className="mt-1 text-base font-semibold tabular-nums">{amount(account.orderedCents)}</dd></div>
        <div><dt>Total entregado</dt><dd className="mt-1 text-base font-semibold tabular-nums">{amount(account.deliveredCents)}</dd></div>
      </dl>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
      {loadError && <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={onRefresh}>Actualizar cuenta</button>}
      {cashClosed && !historical && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-950">La caja del día está cerrada. Un administrador debe reabrirla para cerrar esta cuenta.</p>}
      {!historical && !confirming && (
        <section aria-label="Listado del nuevo pedido" className="space-y-3">
          <AddOrderLine products={products} busy={locked} onAdd={addDraftItem} />
          <div className={`${cardClass} space-y-2.5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Listado del pedido</h4>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                  {draftUnits === 0 ? "Sin ítems" : `${quantityLabel(draftUnits, "ítem")} · Sin enviar`}
                </span>
              </div>
              {draftItems.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-50"
                  disabled={locked}
                  onClick={() => updateDraftItems(() => [])}
                >
                  Vaciar lista
                </button>
              )}
            </div>
            {draftItems.length === 0 ? (
              <p className="text-xs text-[var(--floor-muted,#52634b)]">
                Agregá los productos al listado. El ticket para cocina se genera recién al confirmar el pedido.
              </p>
            ) : (
              <>
                <div tabIndex={0} role="region" aria-labelledby={draftCaptionId} className={tableStyles.tableWrapper}>
                  <table
                    className={tableStyles.serviceTable}
                    style={{
                      "--label-2": '"Estación"',
                      "--label-3": '"Cant."',
                      "--label-4": '"Subtotal"',
                      "--label-5": '"Acciones"',
                    } as CSSProperties}
                  >
                    <caption id={draftCaptionId}>Listado del pedido borrador pendiente de confirmar</caption>
                    <thead>
                      <tr>
                        <th scope="col">Ítem</th>
                        <th scope="col">Estación</th>
                        <th scope="col">Cant.</th>
                        <th scope="col" className="text-right">Subtotal</th>
                        <th scope="col" className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftItems.map((item) => (
                        <tr key={item.key}>
                          <th scope="row">
                            <span className="block break-words">{item.name}</span>
                            {item.notes && (
                              <span className="mt-0.5 block text-xs font-normal italic text-[var(--floor-muted,#52634b)]">
                                Nota: {item.notes}
                              </span>
                            )}
                          </th>
                          <td className="whitespace-nowrap">{item.station === "BAR" ? "Barra" : "Cocina"}</td>
                          <td>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--floor-border,#d4d4d8)] bg-white text-zinc-800 hover:bg-[var(--floor-hover,#edf2e9)] disabled:opacity-40"
                                disabled={locked || item.quantity <= 1}
                                aria-label={`Restar uno de ${item.name}`}
                                onClick={() => changeDraftQuantity(item.key, -1)}
                              >
                                <Minus size={11} aria-hidden="true" />
                              </button>
                              <span className="min-w-5 text-center font-semibold tabular-nums">{item.quantity}</span>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--floor-border,#d4d4d8)] bg-white text-zinc-800 hover:bg-[var(--floor-hover,#edf2e9)] disabled:opacity-40"
                                disabled={locked || item.quantity >= 99}
                                aria-label={`Sumar uno de ${item.name}`}
                                onClick={() => changeDraftQuantity(item.key, 1)}
                              >
                                <Plus size={11} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                          <td className="whitespace-nowrap text-right font-medium tabular-nums">
                            {amount(item.unitPriceCents * item.quantity)}
                          </td>
                          <td>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className={tableDangerButtonClass}
                                disabled={locked}
                                aria-label={`Quitar ${item.name}`}
                                onClick={() => removeDraftItem(item.key)}
                              >
                                <Trash2 size={12} aria-hidden="true" />Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--floor-border,#e4e4e7)] pt-2.5">
                  <div className="text-xs">
                    <span className="text-[var(--floor-muted,#52634b)]">Total borrador: </span>
                    <strong className="text-sm tabular-nums text-[var(--floor-ink,#09090b)]">{amount(draftTotalCents)}</strong>
                  </div>
                  <button
                    type="button"
                    className={floorPrimaryButtonClass}
                    disabled={locked || draftItems.length === 0}
                    onClick={() => void confirmDraftOrder()}
                  >
                    <Send size={15} aria-hidden="true" />Confirmar pedido y enviar a cocina
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}
      <section aria-label="Pedidos" className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Pedidos confirmados</h4>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--floor-muted,#52634b)]"><Clock3 size={13} aria-hidden="true" />{quantityLabel(account.pendingQuantity, "pendiente")}</span>
          </div>
          {account.pendingQuantity > 0 && !historical && <div className="flex flex-wrap gap-2">
            <button type="button" className={`${floorSecondaryButtonClass} text-xs font-medium`} disabled={locked || confirming} onClick={() => void run({ action: "march-round", ...identity })} title="Marchar tanda a cocina">
              <Utensils size={13} aria-hidden="true" />Marchar a cocina
            </button>
            <button type="button" className={`${floorSecondaryButtonClass} text-xs font-medium`} disabled={locked || confirming} onClick={() => void run({ action: "deliver-all", ...identity })} title="Entregar todos los pedidos pendientes">
              <CheckCheck size={13} aria-hidden="true" />Entregar todo
            </button>
          </div>}
        </div>
        {!account.lines.length ? (
          <p className="text-sm text-[var(--floor-muted,#52634b)]">Todavía no hay pedidos confirmados.</p>
        ) : (
          <div tabIndex={0} role="region" aria-labelledby={confirmedCaptionId} className={tableStyles.tableWrapper}>
            <table
              className={tableStyles.serviceTable}
              style={{
                "--label-2": '"Estación"',
                "--label-3": '"Estado"',
                "--label-4": '"Cant."',
                "--label-5": '"Subtotal"',
                "--label-6": '"Acciones"',
              } as CSSProperties}
            >
              <caption id={confirmedCaptionId}>Pedidos confirmados enviados a cocina y entregados</caption>
              <thead>
                <tr>
                  <th scope="col">Ítem</th>
                  <th scope="col">Estación</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Cant.</th>
                  <th scope="col" className="text-right">Subtotal</th>
                  <th scope="col" className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {account.lines.map((line) => {
                  const pending = line.quantity - line.deliveredQuantity - line.cancelledQuantity;
                  const statusBadge = kitchenStatusBadge[line.kitchenStatus] ?? kitchenStatusBadge.PENDING;
                  return (
                    <tr key={line.id}>
                      <th scope="row">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="break-words">{line.name}</span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-600">Tanda {line.round}</span>
                        </span>
                        {line.notes && (
                          <span className="mt-1 block text-xs font-normal italic text-[var(--floor-muted,#52634b)]">
                            Nota: {line.notes}
                          </span>
                        )}
                      </th>
                      <td className="whitespace-nowrap">{line.station === "BAR" ? "Barra" : "Cocina"}</td>
                      <td>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="block font-semibold tabular-nums">{line.quantity}</span>
                        <span className="block text-[11px] text-[var(--floor-muted,#52634b)] tabular-nums">
                          {pending} pend. · {line.deliveredQuantity} ent.
                          {line.cancelledQuantity > 0 && ` · ${line.cancelledQuantity} anul.`}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right font-medium tabular-nums">
                        {amount(line.unitPriceCents * (line.quantity - line.cancelledQuantity))}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {pending > 0 && !historical && (
                            <>
                              <button
                                type="button"
                                className={tableActionButtonClass}
                                disabled={locked || confirming}
                                aria-label={`Entregar uno de ${line.name}`}
                                onClick={() => updateLine(line, "deliveredQuantity", 1)}
                              >
                                <Check size={12} aria-hidden="true" />Entregar 1
                              </button>
                              <button
                                type="button"
                                className={tableActionButtonClass}
                                disabled={locked || confirming}
                                aria-label={`Anular uno de ${line.name}`}
                                onClick={() => updateLine(line, "cancelledQuantity", 1)}
                              >
                                Anular 1
                              </button>
                            </>
                          )}
                          {!historical && (line.deliveredQuantity > 0 || line.cancelledQuantity > 0) && (
                            <details className="w-full text-right">
                              <summary className="cursor-pointer text-[11px] font-medium text-[var(--floor-action,#3d5934)]">
                                Corregir cantidades
                              </summary>
                              <div className="mt-1 flex flex-wrap justify-end gap-1">
                                {line.deliveredQuantity > 0 && (
                                  <button type="button" className={tableActionButtonClass} disabled={locked || confirming} onClick={() => updateLine(line, "deliveredQuantity", -1)}>
                                    Deshacer entrega
                                  </button>
                                )}
                                {line.cancelledQuantity > 0 && (
                                  <button type="button" className={tableActionButtonClass} disabled={locked || confirming} onClick={() => updateLine(line, "cancelledQuantity", -1)}>
                                    Deshacer anulación
                                  </button>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    {!historical && <footer className={floorWindowFooterClass}>
      {confirming ? <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        if (canCheckout && !versionChanged && splitValid) {
          void run({
            action: "checkout",
            ...identity,
            paymentMethod: payment || undefined,
            tipCents: tipCents > 0 ? tipCents : undefined,
            discountCents: discountCents > 0 ? discountCents : undefined,
            discountReason: discountReason.trim() || undefined,
            cashCents: payment === "SPLIT" ? splitCashCents : undefined,
            cardCents: payment === "SPLIT" ? splitCardCents : undefined,
            transferCents: payment === "SPLIT" ? splitTransferCents : undefined,
          });
        }
      }}>
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Cerrar cuenta</p>
          <span className="text-base font-bold tabular-nums">{amount(totalToPayCents)}</span>
        </div>
        {versionChanged ? <p role="alert" className="text-sm text-amber-950">La cuenta cambió. Volvé al pedido y revisá el nuevo total.</p> : <p className="text-xs text-[var(--floor-muted,#52634b)]">Se guardará el recibo y se liberarán las mesas de esta cuenta.</p>}
        {account.deliveredCents > 0 && !versionChanged && <>
          <div className="grid grid-cols-2 gap-2">
            <label className={fieldClass}>Descuento ($)<input className={floorInputClass} disabled={locked} inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
            <label className={fieldClass}>Motivo descuento<input className={floorInputClass} disabled={locked} maxLength={100} placeholder="Ej: cortesía" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} /></label>
          </div>
          <label className={fieldClass}>Propina sugerida ($)<input className={floorInputClass} disabled={locked} inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={tip} onChange={(e) => setTip(e.target.value)} /></label>
          <label className={fieldClass}>Medio de pago<select className={floorInputClass} required disabled={locked} value={payment} onChange={(event) => setPayment(event.target.value as ServicePaymentMethod | "")}><option value="">Elegí un medio</option>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {payment === "SPLIT" && <div className="space-y-2 rounded-xl border border-[var(--floor-border,#e4e4e7)] bg-[var(--floor-hover,#edf2e9)] p-2.5">
            <p className="text-xs font-semibold text-[var(--floor-ink,#263e23)]">Desglose de pago mixto</p>
            <div className="grid grid-cols-3 gap-2">
              <label className={fieldClass}>Efectivo<input className={floorInputClass} disabled={locked} inputMode="decimal" placeholder="0,00" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} /></label>
              <label className={fieldClass}>Tarjeta<input className={floorInputClass} disabled={locked} inputMode="decimal" placeholder="0,00" value={splitCard} onChange={(e) => setSplitCard(e.target.value)} /></label>
              <label className={fieldClass}>Transf./QR<input className={floorInputClass} disabled={locked} inputMode="decimal" placeholder="0,00" value={splitTransfer} onChange={(e) => setSplitTransfer(e.target.value)} /></label>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={splitValid ? "font-semibold text-emerald-800" : "font-semibold text-red-700"}>Suma: {amount(splitSumCents)} / {amount(totalToPayCents)}</span>
              {!splitValid && <span className="text-[11px] text-red-700">Debe coincidir</span>}
            </div>
          </div>}
        </>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={resetCheckoutState}>Volver al pedido</button>
          <button type="submit" className={floorPrimaryButtonClass} disabled={!canCheckout || versionChanged || (account.deliveredCents > 0 && (!payment || !splitValid))}>{account.deliveredCents > 0 ? "Confirmar cobro" : "Confirmar cierre"}</button>
        </div>
      </form> : <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[var(--floor-muted,#52634b)]">{draftItems.length > 0 ? "Confirmá o vaciá el listado antes de cerrar." : account.pendingQuantity > 0 ? "Entregá o anulá los pedidos pendientes antes de cerrar." : "Al cerrar, se liberan las mesas de esta cuenta."}</p><button type="button" className={floorPrimaryButtonClass} disabled={!canCheckout} onClick={() => setCheckoutVersion(account.version)}>{account.deliveredCents > 0 ? "Cobrar y cerrar" : "Cerrar sin consumo"}</button></div>}
    </footer>}
  </>;
}

type DraftOrderItem = {
  key: string;
  productId?: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
  station: KitchenStation;
};

const productSearchText = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es-AR");
const manualProduct = { id: "manual", name: "Cargar otro producto", price: null };

function ProductPicker({ products, value, disabled, onChange }: {
  products: ServiceProductView[]; value: string; disabled: boolean; onChange: (id: string) => void;
}) {
  const id = useId();
  const listId = `${id}-products`;
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const expanded = !disabled && query !== null;
  const term = productSearchText(query ?? "").trim();
  const selected = products.find((product) => product.id === value);
  const selectedLabel = selected ? `${selected.name} · ${amount(selected.unitPriceCents)}` : value === manualProduct.id ? manualProduct.name : "";
  const options = [...products.filter(({ name }) => productSearchText(name).includes(term))
    .map(({ id, name, unitPriceCents }) => ({ id, name, price: amount(unitPriceCents) })), manualProduct];
  const activeId = expanded && options[activeIndex] ? `${listId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const open = () => setQuery((current) => current ?? "");
  const close = () => { setQuery(null); setActiveIndex(-1); };
  const select = (optionId: string) => { onChange(optionId); close(); };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
      setActiveIndex((index) => event.key === "ArrowDown" ? Math.min(index + 1, options.length - 1)
        : index < 0 ? options.length - 1 : Math.max(index - 1, 0));
    } else if (expanded && event.key === "Enter") {
      event.preventDefault();
      if (options[activeIndex]) select(options[activeIndex].id);
    } else if (expanded && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return <div className={fieldClass}>
    <label htmlFor={id}>Producto</label>
    <div className="relative">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 my-auto" />
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
        aria-activedescendant={activeId} aria-required="true" autoComplete="off" spellCheck={false} inputMode="search"
        className={`${floorInputClass} min-h-11 pl-9 placeholder:text-[var(--floor-muted,#52634b)]`} disabled={disabled}
        placeholder="Buscar producto" value={expanded ? query : selectedLabel} onFocus={open} onClick={open} onBlur={close} onKeyDown={onKeyDown}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); onChange(""); }} />
    </div>
    {expanded && <div className="rounded-lg border border-[var(--floor-border,#d4d4d8)] bg-white">
      {options.length === 1 && <p role="status" className="px-3 pt-2 text-sm">No encontramos productos.</p>}
      <ul id={listId} role="listbox" aria-label="Productos disponibles" className="max-h-44 overflow-y-auto overscroll-contain p-1">
        {options.map((option, index) => <li key={option.id} role="presentation">
          <button type="button" tabIndex={-1} role="option" id={`${listId}-${index}`} aria-selected={option.id === value}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm text-[var(--floor-ink,#09090b)] hover:bg-[var(--floor-hover,#edf2e9)] ${index === activeIndex ? "bg-[var(--floor-hover,#edf2e9)]" : ""}`}
            onMouseDown={(event) => event.preventDefault()} onClick={() => select(option.id)}>
            <span className="min-w-0 wrap-break-word">{option.name}</span>
            {option.price && <span className="shrink-0 tabular-nums text-[var(--floor-muted,#52634b)]">{option.price}</span>}
          </button>
        </li>)}
      </ul>
    </div>}
  </div>;
}

function AddOrderLine({ products, busy, onAdd }: { products: ServiceProductView[]; busy: boolean; onAdd: (item: Omit<DraftOrderItem, "key">) => void }) {
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [station, setStation] = useState<KitchenStation>("KITCHEN");
  const activeProducts = products.filter((product) => product.active);
  const manual = productId === manualProduct.id || activeProducts.length === 0;
  const selectedProduct = activeProducts.find((product) => product.id === productId);
  const hasProduct = Boolean(selectedProduct);
  const cents = parsePrice(price);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const count = Number(quantity);
    if (busy || !Number.isInteger(count) || count < 1 || count > 99) return;
    if (manual) {
      if (!name.trim() || cents < 1 || cents > 2_147_483_647) return;
      onAdd({ name: name.trim(), unitPriceCents: cents, quantity: count, notes: notes.trim(), station });
    } else if (selectedProduct) {
      onAdd({
        productId: selectedProduct.id,
        name: selectedProduct.name,
        unitPriceCents: selectedProduct.unitPriceCents,
        quantity: count,
        notes: notes.trim(),
        station,
      });
    } else {
      return;
    }
    setProductId("");
    setName("");
    setPrice("");
    setQuantity("1");
    setNotes("");
    setStation("KITCHEN");
  };
  return <form aria-label="Agregar pedido al listado" className={`${cardClass} ${tableStyles.orderBuilder} space-y-2.5`} onSubmit={submit}>
    <h4 className="font-semibold">Agregar al listado</h4>
    {activeProducts.length > 0 && <ProductPicker products={activeProducts} value={productId} disabled={busy} onChange={setProductId} />}
    {manual && <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)] gap-2"><label className={fieldClass}>Nombre<input className={floorInputClass} disabled={busy} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label><label className={fieldClass}>Precio unitario ($)<input className={floorInputClass} disabled={busy} required inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" maxLength={13} value={price} onChange={(event) => setPrice(event.target.value)} /></label></div>}
    <div className={tableStyles.orderBuilderGrid}>
      <label className={fieldClass}>Notas de elaboración<input className={floorInputClass} disabled={busy} maxLength={200} placeholder="Ej: sin sal, punto jugoso" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <label className={fieldClass}>Estación<select className={floorInputClass} disabled={busy} value={station} onChange={(event) => setStation(event.target.value as KitchenStation)}><option value="KITCHEN">Cocina</option><option value="BAR">Barra</option></select></label>
      <label className={fieldClass}>Cantidad<input className={floorInputClass} disabled={busy} required type="number" min={1} max={99} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <button type="submit" className={floorSecondaryButtonClass} disabled={busy || (manual ? !name.trim() || cents < 1 || cents > 2_147_483_647 : !hasProduct)}><Plus size={16} aria-hidden="true" />Agregar a la lista</button>
    </div>
  </form>;
}

type ServiceReceiptProps = { account: ServiceAccountView; restaurantName: string; timeZone: string };

function ServiceReceipt(props: ServiceReceiptProps) {
  const [printing, setPrinting] = useState(false);
  const print = () => {
    flushSync(() => setPrinting(true));
    try { window.print(); } finally { setPrinting(false); }
  };
  return <>
    <section aria-label="Recibo de consumo" className={floorWindowBodyClass}><ServiceReceiptContent {...props} /></section>
    <footer className={`${floorWindowFooterClass} flex justify-end`}><button type="button" className={floorSecondaryButtonClass} onClick={print}><Printer size={16} aria-hidden="true" />Imprimir recibo</button></footer>
    {printing && createPortal(<div aria-hidden="true" className={styles.printReceipt}><ServiceReceiptContent {...props} /></div>, document.body)}
  </>;
}

function ServiceReceiptContent({ account, restaurantName, timeZone }: ServiceReceiptProps) {
  const time = account.closedAt ? new Intl.DateTimeFormat("es-AR", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(account.closedAt)) : "";
  return <div className="space-y-4">
    <header className="rounded-xl bg-[var(--floor-hover,#edf2e9)] p-4"><ReceiptText size={22} aria-hidden="true" /><p className="mt-2 text-sm font-medium">{restaurantName}</p><h3 className="text-lg font-semibold">Recibo de consumo {account.receiptNumber != null && `#${account.receiptNumber}`}</h3><p className="mt-1 text-sm">{account.customerName} · {account.roomName} · {account.tableLabels.join(" + ")}</p><p className="mt-1 text-xs text-[var(--floor-muted,#52634b)]">{time} · Reserva {account.reservationCode}</p></header>
    <ul className="divide-y divide-[var(--floor-border,#e4e4e7)] text-sm">{account.lines.filter((line) => line.deliveredQuantity > 0).map((line) => <li key={line.id} className="flex items-start justify-between gap-3 py-2"><div><span>{line.deliveredQuantity} × {line.name}</span>{line.notes && <p className="text-xs text-[var(--floor-muted,#52634b)] italic">Nota: {line.notes}</p>}</div><span className="shrink-0 tabular-nums">{amount(line.deliveredQuantity * line.unitPriceCents)}</span></li>)}</ul>
    <div className="space-y-1.5 border-t border-[var(--floor-border,#e4e4e7)] pt-3 text-sm">
      <div className="flex justify-between text-xs text-[var(--floor-muted,#52634b)]"><span>Subtotal entregado</span><span className="tabular-nums">{amount(account.deliveredCents)}</span></div>
      {account.discountCents > 0 && <div className="flex justify-between text-xs text-emerald-800"><span>Descuento {account.discountReason ? `(${account.discountReason})` : ""}</span><span className="tabular-nums">-{amount(account.discountCents)}</span></div>}
      {account.tipCents > 0 && <div className="flex justify-between text-xs text-[var(--floor-muted,#52634b)]"><span>Propina</span><span className="tabular-nums">+{amount(account.tipCents)}</span></div>}
      <dl className="flex items-baseline justify-between gap-2 border-t border-[var(--floor-border,#e4e4e7)] pt-2"><div><dt className="text-sm font-semibold">Total cobrado</dt><dd className="text-lg font-bold tabular-nums">{amount(account.totalCents ?? 0)}</dd></div><div className="text-right"><dt className="text-xs text-[var(--floor-muted,#52634b)]">Medio de pago</dt><dd className="text-sm font-medium">{account.paymentMethod ? paymentLabels[account.paymentMethod] : "Sin consumo"}</dd></div></dl>
      {account.paymentMethod === "SPLIT" && <div className="rounded-lg bg-[var(--floor-hover,#edf2e9)] p-2.5 text-xs space-y-1">
        <p className="font-semibold text-[var(--floor-ink,#263e23)]">Desglose de cobro:</p>
        {account.cashCents > 0 && <div className="flex justify-between"><span>Efectivo:</span><span className="tabular-nums">{amount(account.cashCents)}</span></div>}
        {account.cardCents > 0 && <div className="flex justify-between"><span>Tarjeta:</span><span className="tabular-nums">{amount(account.cardCents)}</span></div>}
        {account.transferCents > 0 && <div className="flex justify-between"><span>Transferencia o QR:</span><span className="tabular-nums">{amount(account.transferCents)}</span></div>}
      </div>}
    </div>
    <p className="text-xs text-[var(--floor-muted,#52634b)]">Recibo interno guardado para el cierre de caja.</p>
  </div>;
}
