import { createPortal } from "react-dom";
import type { ServiceAccountView, ServiceSplitMode } from "../contracts";
import { formatServiceDate, formatServiceMoney, servicePaymentLabels } from "./service-admin-client";
import styles from "./cash-receipt.module.css";

type ReceiptProps = { receipt: ServiceAccountView; restaurantName: string; timeZone: string };

const splitModeLabels: Record<ServiceSplitMode, string> = {
  FULL: "Cuenta completa",
  BY_ITEMS: "Por productos",
  BY_PEOPLE: "Por personas",
  CUSTOM_AMOUNT: "Monto parcial",
};

export function CashReceipt(props: ReceiptProps) {
  return <>
    <ReceiptDocument {...props} />
    {createPortal(<div aria-hidden="true" className={styles.printReceipt}><ReceiptDocument {...props} /></div>, document.body)}
  </>;
}

function ReceiptDocument({ receipt, restaurantName, timeZone }: ReceiptProps) {
  const time = receipt.closedAt ? new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(receipt.closedAt)) : null;
  const items = receipt.lines.filter((line) => line.deliveredQuantity > 0);

  return (
    <article className="space-y-4 text-sm text-zinc-900">
      <header className="border-b border-zinc-200 pb-3">
        <h3 className="break-words text-lg font-semibold text-zinc-950">{restaurantName}</h3>
        <p className="mt-1 text-zinc-700">{receipt.receiptNumber ? `Recibo interno ${receipt.receiptNumber}` : "Cierre sin consumo"}</p>
      </header>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
        {receipt.businessDate && <><dt className="text-zinc-600">Fecha</dt><dd>{formatServiceDate(receipt.businessDate)}{time && ` · ${time}`}</dd></>}
        <dt className="text-zinc-600">Salón</dt><dd className="break-words">{receipt.roomName}</dd>
        <dt className="text-zinc-600">Mesas</dt><dd className="break-words">{receipt.tableLabels.join(", ")}</dd>
        <dt className="text-zinc-600">Comensales</dt><dd>{receipt.partySize}</dd>
        <dt className="text-zinc-600">Reserva</dt><dd className="break-words">{receipt.reservationCode}</dd>
        {receipt.assignedWaiterName && <><dt className="text-zinc-600">Camarero</dt><dd className="break-words">{receipt.assignedWaiterName}</dd></>}
        <dt className="text-zinc-600">Pago</dt><dd>{receipt.paymentMethod ? servicePaymentLabels[receipt.paymentMethod] : "Sin consumo"}</dd>
      </dl>
      {receipt.hasAuditAlerts && (
        <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          Atención: cuenta con {receipt.auditAlertCount} {receipt.auditAlertCount === 1 ? "alerta de control" : "alertas de control"} ({receipt.auditLogs.length} movimientos en registro).
        </p>
      )}
      {items.length === 0 ? <p className="border-t border-zinc-200 pt-3 text-zinc-700">Sin productos cobrados.</p> : (
        <table className="w-full table-fixed border-y border-zinc-200 text-left">
          <thead className="border-b border-zinc-200 text-xs text-zinc-700"><tr>
            <th scope="col" className="py-2 pr-2 font-medium">Producto</th>
            <th scope="col" className="w-10 py-2 pr-2 text-right font-medium">Cant.</th>
            <th scope="col" className="w-24 py-2 pr-2 text-right font-medium sm:w-28">Unitario</th>
            <th scope="col" className="w-24 py-2 text-right font-medium sm:w-28">Subtotal</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((line) => <tr key={line.id} className="tabular-nums">
              <td className="break-words py-2 pr-2">
                <div>{line.name}</div>
                {line.notes && <div className="text-xs italic text-zinc-500">Nota: {line.notes}</div>}
              </td>
              <td className="py-2 pr-2 text-right">{line.deliveredQuantity}</td>
              <td className="break-words py-2 pr-2 text-right">{formatServiceMoney(line.unitPriceCents)}</td>
              <td className="break-words py-2 text-right">{formatServiceMoney(line.unitPriceCents * line.deliveredQuantity)}</td>
            </tr>)}
          </tbody>
        </table>
      )}
      <div className="space-y-1 text-sm border-t border-zinc-200 pt-3">
        <div className="flex justify-between text-zinc-600"><span>Subtotal entregado</span><span className="tabular-nums">{formatServiceMoney(receipt.deliveredCents)}</span></div>
        {receipt.discountCents > 0 && <div className="flex justify-between text-emerald-800"><span>Descuento {receipt.discountReason ? `(${receipt.discountReason})` : ""}</span><span className="tabular-nums">-{formatServiceMoney(receipt.discountCents)}</span></div>}
        {receipt.tipCents > 0 && <div className="flex justify-between text-zinc-600"><span>Propina</span><span className="tabular-nums">+{formatServiceMoney(receipt.tipCents)}</span></div>}
        <div className="flex justify-between gap-2 border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-950"><span>Total cobrado</span><span className="text-right tabular-nums">{formatServiceMoney(receipt.totalCents ?? 0)}</span></div>
        {receipt.paymentMethod === "SPLIT" && <div className="rounded-lg bg-zinc-50 p-2 text-xs space-y-1 mt-2">
          <p className="font-semibold text-zinc-700">Desglose de cobro:</p>
          {receipt.cashCents > 0 && <div className="flex justify-between"><span>Efectivo:</span><span className="tabular-nums">{formatServiceMoney(receipt.cashCents)}</span></div>}
          {receipt.cardCents > 0 && <div className="flex justify-between"><span>Tarjeta:</span><span className="tabular-nums">{formatServiceMoney(receipt.cardCents)}</span></div>}
          {receipt.transferCents > 0 && <div className="flex justify-between"><span>Transferencia o QR:</span><span className="tabular-nums">{formatServiceMoney(receipt.transferCents)}</span></div>}
        </div>}
      </div>
      {(receipt.payments.length > 1 || receipt.payments.some((payment) => payment.splitMode !== "FULL")) && (
        <section aria-label="Cómo se dividió la cuenta" className="space-y-2 border-t border-zinc-200 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
            Cómo se dividió la cuenta ({receipt.payments.length} {receipt.payments.length === 1 ? "pago" : "pagos"})
          </h4>
          <ul className="space-y-2 text-xs">
            {receipt.payments.map((payment) => (
              <li key={payment.id} className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-zinc-950">
                    {payment.receiptNumber} · {payment.payerLabel}
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-950">
                    {formatServiceMoney(payment.totalCents)} · {servicePaymentLabels[payment.paymentMethod]}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600">{splitModeLabels[payment.splitMode]}</p>
                {payment.items.length > 0 && (
                  <p className="text-[11px] text-zinc-700">
                    Productos: {payment.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                  </p>
                )}
                {(payment.discountCents > 0 || payment.tipCents > 0) && (
                  <p className="text-[11px] text-zinc-600 tabular-nums">
                    {payment.discountCents > 0 && `Descuento: -${formatServiceMoney(payment.discountCents)}${payment.discountReason ? ` (${payment.discountReason})` : ""}`}
                    {payment.discountCents > 0 && payment.tipCents > 0 && " · "}
                    {payment.tipCents > 0 && `Propina: +${formatServiceMoney(payment.tipCents)}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
