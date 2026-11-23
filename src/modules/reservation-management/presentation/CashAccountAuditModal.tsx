import { createPortal } from "react-dom";
import { AlertTriangle, ClipboardList, Printer, ReceiptText } from "lucide-react";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import type { ServiceAccountView, ServiceAuditAction } from "../contracts";
import { formatServiceDate, formatServiceMoney, servicePaymentLabels } from "./service-admin-client";
import styles from "./cash-receipt.module.css";

const auditActionLabels: Record<ServiceAuditAction, string> = {
  ACCOUNT_OPENED: "Apertura de cuenta",
  WAITER_ASSIGNED: "Asignación de camarero",
  WAITER_CHANGED: "Cambio de camarero",
  ORDER_CONFIRMED: "Pedido confirmado",
  LINE_ADDED: "Ítem agregado",
  MANUAL_ITEM_CREATED: "Ítem manual",
  DRAFT_ITEM_REMOVED: "Quitado del borrador",
  ITEM_DELIVERED: "Entrega parcial/total",
  ALL_ITEMS_DELIVERED: "Entrega masiva",
  DELIVERY_REVERTED: "Entrega revertida",
  ITEM_CANCELLED: "Anulación",
  CANCELLATION_REVERTED: "Anulación revertida",
  ROUND_MARCHED: "Marcha a cocina/barra",
  KITCHEN_STATUS_CHANGED: "Estado cocina/barra",
  DISCOUNT_APPLIED: "Descuento aplicado",
  PARTIAL_PAYMENT_RECORDED: "Pago parcial (división)",
  ACCOUNT_CHECKED_OUT: "Cierre y cobro",
  ACCOUNT_CLOSED_EMPTY: "Cierre sin consumo",
};

type AuditModalProps = {
  receipt: ServiceAccountView;
  restaurantName: string;
  timeZone: string;
  onClose: () => void;
  onViewReceipt: () => void;
};

export function CashAccountAuditModal({
  receipt,
  restaurantName,
  timeZone,
  onClose,
  onViewReceipt,
}: AuditModalProps) {
  return (
    <AdminModal open title="Registro de movimientos de la cuenta" wide onClose={onClose}>
      <AuditDocument receipt={receipt} restaurantName={restaurantName} timeZone={timeZone} />
      {createPortal(
        <div aria-hidden="true" className={styles.printReceipt}>
          <AuditDocument receipt={receipt} restaurantName={restaurantName} timeZone={timeZone} />
        </div>,
        document.body,
      )}
      <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-4">
        <button type="button" onClick={onViewReceipt} className={adminSecondaryButtonClass}>
          <ReceiptText size={16} aria-hidden="true" />
          Ver recibo
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className={adminSecondaryButtonClass}>
            Cerrar
          </button>
          <button type="button" onClick={() => window.print()} className={adminPrimaryButtonClass}>
            <Printer size={17} aria-hidden="true" />
            Imprimir registro
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function AuditDocument({
  receipt,
  restaurantName,
  timeZone,
}: {
  receipt: ServiceAccountView;
  restaurantName: string;
  timeZone: string;
}) {
  const timeWithSeconds = new Intl.DateTimeFormat("es-AR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const cancelledLines = receipt.lines.filter((line) => line.cancelledQuantity > 0);

  return (
    <article className="space-y-4 text-sm text-zinc-900">
      <header className="border-b border-zinc-200 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="break-words text-lg font-semibold text-zinc-950">{restaurantName}</h3>
            <p className="mt-0.5 text-zinc-700">
              Auditoría de cuenta · {receipt.receiptNumber ?? "Cierre sin consumo"}
            </p>
          </div>
          {receipt.hasAuditAlerts ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">
              <AlertTriangle size={14} aria-hidden="true" />
              {receipt.auditAlertCount} {receipt.auditAlertCount === 1 ? "movimiento sensible" : "movimientos sensibles"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce4d9] bg-[#f3f6f1] px-3 py-1 text-xs font-medium text-[#263e23]">
              <ClipboardList size={14} aria-hidden="true" />
              Sin anomalías
            </span>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Salón y mesas</dt>
          <dd className="font-semibold text-zinc-900">{receipt.roomName} · {receipt.tableLabels.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Reserva / Cliente</dt>
          <dd className="font-semibold text-zinc-900">{receipt.reservationCode} · {receipt.customerName}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Camarero</dt>
          <dd className="font-semibold text-zinc-900">{receipt.assignedWaiterName ?? "Sin asignar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Fecha operativa</dt>
          <dd className="font-semibold text-zinc-900">
            {receipt.businessDate ? formatServiceDate(receipt.businessDate) : formatServiceDate(receipt.openedAt.slice(0, 10))}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Apertura / Cierre</dt>
          <dd className="font-semibold tabular-nums text-zinc-900">
            {timeWithSeconds.format(new Date(receipt.openedAt))}
            {receipt.closedAt ? ` -> ${timeWithSeconds.format(new Date(receipt.closedAt))}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Total cobrado</dt>
          <dd className="font-semibold tabular-nums text-zinc-950">
            {formatServiceMoney(receipt.totalCents ?? 0)} ({receipt.paymentMethod ? servicePaymentLabels[receipt.paymentMethod] : "Sin consumo"})
          </dd>
        </div>
      </dl>

      {receipt.hasAuditAlerts && (
        <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">Resumen de control antifraude</p>
          <p className="mt-1 leading-5">
            Esta cuenta registra movimientos sensibles (como anulaciones, productos manuales, reversiones o descuentos) que conviene revisar.
            {receipt.cancellationCount > 0 && ` Anulaciones registradas: ${receipt.cancellationCount} ud(s).`}
            {receipt.discountCents > 0 && ` Descuento aplicado: ${formatServiceMoney(receipt.discountCents)}${receipt.discountReason ? ` (${receipt.discountReason})` : ""}.`}
          </p>
          {cancelledLines.length > 0 && (
            <p className="mt-1 text-amber-900">
              Ítems anulados: {cancelledLines.map((line) => `${line.cancelledQuantity}x ${line.name}`).join(", ")}.
            </p>
          )}
        </div>
      )}

      {receipt.auditLogs.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 px-4 py-6 text-center text-xs text-zinc-600">
          No hay eventos detallados guardados para esta cuenta (cuenta anterior a la activación de auditoría).
        </p>
      ) : (
        <ol aria-label="Historial cronológico de la cuenta" className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {receipt.auditLogs.map((entry) => {
            const warning = entry.severity === "WARNING";
            return (
              <li
                key={entry.id}
                className={`rounded-xl border p-3 ${warning ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-zinc-500">#{entry.sequence}</span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${warning ? "bg-amber-200 text-amber-950" : "bg-zinc-100 text-zinc-800"}`}>
                      {warning && <AlertTriangle size={11} aria-hidden="true" />}
                      {auditActionLabels[entry.action]}
                    </span>
                    <span className="text-xs tabular-nums text-zinc-500">
                      {timeWithSeconds.format(new Date(entry.createdAt))}
                    </span>
                  </div>
                  {entry.amountDeltaCents !== null && (
                    <span className={`text-xs font-semibold tabular-nums ${entry.amountDeltaCents < 0 ? "text-amber-900" : "text-zinc-900"}`}>
                      {entry.amountDeltaCents > 0 ? `+${formatServiceMoney(entry.amountDeltaCents)}` : formatServiceMoney(entry.amountDeltaCents)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-zinc-950">{entry.summary}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Operador: <span className="font-medium text-zinc-800">{entry.actorLabel}</span>
                  {entry.waiterName && <> · Camarero asignado: <span className="font-medium text-zinc-800">{entry.waiterName}</span></>}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
