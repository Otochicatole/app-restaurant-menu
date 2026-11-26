"use client";

import { useId, type CSSProperties } from "react";
import { Check, CheckCheck, Clock3, Printer, Utensils } from "lucide-react";
import type {
  ServiceAccountPaymentView,
  ServiceAccountView,
  ServiceOrderLineView,
} from "@/modules/reservation-management/contracts";
import {
  amount,
  kitchenStatusBadge,
  paymentLabels,
  quantityLabel,
  splitModeLabels,
} from "./floor-service-format";
import { floorPrimaryButtonClass, floorSecondaryButtonClass } from "./floor-ui";
import tableStyles from "./floor-service-table.module.css";

const tableActionButtonClass = "inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--floor-border,#cad9df)] bg-white px-2 text-[11px] font-medium text-[var(--floor-ink,#173642)] transition-colors hover:border-[var(--floor-border-hover,#9fb8c3)] hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-45";

export type FloorServiceTicketPanelProps = {
  account: ServiceAccountView;
  draftItemsCount: number;
  historical: boolean;
  locked: boolean;
  cashClosed: boolean;
  canCheckout: boolean;
  canPartialPay: boolean;
  lastPartialPayment: ServiceAccountPaymentView | null;
  onUpdateLine: (line: ServiceOrderLineView, field: "deliveredQuantity" | "cancelledQuantity", delta: number) => void;
  onMarchRound: () => void;
  onDeliverAll: () => void;
  onPrintPartial: (payment: ServiceAccountPaymentView) => void;
  onOpenCheckout: (tab: "FULL" | "BY_ITEMS" | "BY_PEOPLE") => void;
};

export function FloorServiceTicketPanel({
  account,
  draftItemsCount,
  historical,
  locked,
  cashClosed,
  canCheckout,
  canPartialPay,
  lastPartialPayment,
  onUpdateLine,
  onMarchRound,
  onDeliverAll,
  onPrintPartial,
  onOpenCheckout,
}: FloorServiceTicketPanelProps) {
  const confirmedCaptionId = useId();

  return (
    <section
      aria-label="Comanda confirmada y cobro"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--floor-border,#cad9df)] bg-white"
    >
      <dl
        aria-live="polite"
        className={`grid shrink-0 gap-3 border-b border-[var(--floor-border,#cad9df)] bg-[var(--floor-hover,#e6f2f6)]/70 px-4 py-3 text-xs ${
          account.payments.length > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
        }`}
      >
        <div>
          <dt className="text-[var(--floor-muted,#4b6470)]">Consumo registrado</dt>
          <dd className="mt-0.5 text-base font-bold text-[var(--floor-ink,#173642)] tabular-nums">
            {amount(account.orderedCents)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--floor-muted,#4b6470)]">Total entregado</dt>
          <dd className="mt-0.5 text-base font-bold text-[var(--floor-ink,#173642)] tabular-nums">
            {amount(account.deliveredCents)}
          </dd>
        </div>
        {account.payments.length > 0 && (
          <>
            <div>
              <dt className="text-[var(--floor-muted,#4b6470)]">Ya cobrado</dt>
              <dd className="mt-0.5 text-base font-bold text-emerald-800 tabular-nums">
                {amount(account.paidSubtotalCents)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--floor-muted,#4b6470)]">Saldo pendiente</dt>
              <dd className="mt-0.5 text-base font-bold text-amber-900 tabular-nums">
                {amount(account.remainingCents)}
              </dd>
            </div>
          </>
        )}
      </dl>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        {lastPartialPayment && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950"
          >
            <span>
              Pago parcial <strong>{lastPartialPayment.receiptNumber}</strong> ({lastPartialPayment.payerLabel}) registrado por{" "}
              <strong>{amount(lastPartialPayment.totalCents)}</strong>.
            </span>
            <button type="button" onClick={() => onPrintPartial(lastPartialPayment)} className={tableActionButtonClass}>
              <Printer size={12} aria-hidden="true" />Imprimir recibo parcial
            </button>
          </div>
        )}

        {cashClosed && !historical && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-950">
            La caja del día está cerrada. Un administrador debe reabrirla para cerrar esta cuenta.
          </p>
        )}

        <section aria-label="Pedidos" className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Pedidos confirmados</h4>
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--floor-canvas,#eef4f6)] px-2 py-0.5 text-xs font-medium text-[var(--floor-muted,#4b6470)]">
                <Clock3 size={12} aria-hidden="true" />
                {quantityLabel(account.pendingQuantity, "pendiente")}
              </span>
            </div>
            {account.pendingQuantity > 0 && !historical && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${floorSecondaryButtonClass} min-h-9 px-3 text-xs font-medium`}
                  disabled={locked}
                  onClick={onMarchRound}
                  title="Marchar tanda a cocina"
                >
                  <Utensils size={13} aria-hidden="true" />Marchar a cocina
                </button>
                <button
                  type="button"
                  className={`${floorSecondaryButtonClass} min-h-9 px-3 text-xs font-medium`}
                  disabled={locked}
                  onClick={onDeliverAll}
                  title="Entregar todos los pedidos pendientes"
                >
                  <CheckCheck size={13} aria-hidden="true" />Entregar todo
                </button>
              </div>
            )}
          </div>

          {!account.lines.length ? (
            <p className="rounded-xl border border-dashed border-[var(--floor-border,#cad9df)] p-4 text-xs text-[var(--floor-muted,#4b6470)]">
              Todavía no hay pedidos confirmados en esta mesa.
            </p>
          ) : (
            <div tabIndex={0} role="region" aria-labelledby={confirmedCaptionId} className={`${tableStyles.tableWrapper} ${tableStyles.paneTableWrapper}`}>
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
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-700">
                              Tanda {line.round}
                            </span>
                          </span>
                          {line.notes && (
                            <span className="mt-1 block text-xs font-normal italic text-[var(--floor-muted,#4b6470)]">
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
                          <span className="block text-[11px] text-[var(--floor-muted,#4b6470)] tabular-nums">
                            {pending} pend. · {line.deliveredQuantity} ent.
                            {line.paidQuantity > 0 && ` · ${line.paidQuantity} cob.`}
                            {line.cancelledQuantity > 0 && ` · ${line.cancelledQuantity} anul.`}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-right font-semibold tabular-nums">
                          {amount(line.unitPriceCents * (line.quantity - line.cancelledQuantity))}
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {pending > 0 && !historical && (
                              <>
                                <button
                                  type="button"
                                  className={tableActionButtonClass}
                                  disabled={locked}
                                  aria-label={`Entregar uno de ${line.name}`}
                                  onClick={() => onUpdateLine(line, "deliveredQuantity", 1)}
                                >
                                  <Check size={12} aria-hidden="true" />Entregar 1
                                </button>
                                <button
                                  type="button"
                                  className={tableActionButtonClass}
                                  disabled={locked}
                                  aria-label={`Anular uno de ${line.name}`}
                                  onClick={() => onUpdateLine(line, "cancelledQuantity", 1)}
                                >
                                  Anular 1
                                </button>
                              </>
                            )}
                            {!historical && (line.deliveredQuantity > 0 || line.cancelledQuantity > 0) && (
                              <details className="w-full text-right">
                                <summary className="cursor-pointer text-[11px] font-medium text-[var(--floor-action,#155e75)]">
                                  Corregir cantidades
                                </summary>
                                <div className="mt-1 flex flex-wrap justify-end gap-1">
                                  {line.deliveredQuantity > 0 && (
                                    <button
                                      type="button"
                                      className={tableActionButtonClass}
                                      disabled={locked || line.deliveredQuantity <= line.paidQuantity}
                                      onClick={() => onUpdateLine(line, "deliveredQuantity", -1)}
                                    >
                                      Deshacer entrega
                                    </button>
                                  )}
                                  {line.cancelledQuantity > 0 && (
                                    <button
                                      type="button"
                                      className={tableActionButtonClass}
                                      disabled={locked}
                                      onClick={() => onUpdateLine(line, "cancelledQuantity", -1)}
                                    >
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

        {account.payments.length > 0 && (
          <section aria-label="Pagos parciales registrados" className="space-y-2 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)]/55 p-3">
            <h4 className="text-xs font-bold text-[var(--floor-ink,#173642)]">
              Pagos registrados ({account.payments.length})
            </h4>
            <ul className="divide-y divide-[var(--floor-border,#cad9df)] text-xs">
              {account.payments.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-1 last:pb-0">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-semibold text-[var(--floor-ink,#173642)]">
                      {entry.receiptNumber} · {entry.payerLabel} ({splitModeLabels[entry.splitMode]})
                    </p>
                    <p className="text-[11px] text-[var(--floor-muted,#4b6470)]">
                      {paymentLabels[entry.paymentMethod]}
                      {entry.items.length > 0 && ` · ${entry.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">{amount(entry.totalCents)}</span>
                    <button type="button" onClick={() => onPrintPartial(entry)} className={tableActionButtonClass}>
                      <Printer size={12} aria-hidden="true" />Imprimir parcial
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {!historical && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--floor-border,#cad9df)] bg-white px-4 py-3">
          <p className="text-xs text-[var(--floor-muted,#4b6470)]">
            {draftItemsCount > 0
              ? "Confirmá o vaciá el listado antes de cerrar."
              : account.pendingQuantity > 0
                ? (account.remainingCents > 0
                    ? "Podés cobrar parcial lo entregado o entregar los ítems pendientes para cerrar."
                    : "Entregá o anulá los pedidos pendientes antes de cerrar.")
                : "Al cerrar, se liberan las mesas de esta cuenta."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {account.remainingCents > 0 && (
              <button
                type="button"
                className={floorSecondaryButtonClass}
                disabled={!canPartialPay}
                onClick={() => onOpenCheckout("BY_ITEMS")}
              >
                Dividir cuenta
              </button>
            )}
            <button
              type="button"
              className={floorPrimaryButtonClass}
              disabled={!canCheckout}
              onClick={() => onOpenCheckout("FULL")}
            >
              {account.remainingCents > 0
                ? (account.payments.length > 0 ? "Cobrar saldo restante" : "Cobrar y cerrar")
                : account.deliveredCents > 0
                  ? "Finalizar y cerrar"
                  : "Cerrar sin consumo"}
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
