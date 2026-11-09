import { createPortal } from "react-dom";
import type { ServiceAccountView } from "../contracts";
import { formatServiceDate, formatServiceMoney, servicePaymentLabels } from "./service-admin-client";
import styles from "./cash-receipt.module.css";

type ReceiptProps = { receipt: ServiceAccountView; restaurantName: string; timeZone: string };

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
        <dt className="text-zinc-600">Reserva</dt><dd className="break-words">{receipt.reservationCode}</dd>
        <dt className="text-zinc-600">Pago</dt><dd>{receipt.paymentMethod ? servicePaymentLabels[receipt.paymentMethod] : "Sin consumo"}</dd>
      </dl>
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
              <td className="break-words py-2 pr-2">{line.name}</td>
              <td className="py-2 pr-2 text-right">{line.deliveredQuantity}</td>
              <td className="break-words py-2 pr-2 text-right">{formatServiceMoney(line.unitPriceCents)}</td>
              <td className="break-words py-2 text-right">{formatServiceMoney(line.unitPriceCents * line.deliveredQuantity)}</td>
            </tr>)}
          </tbody>
        </table>
      )}
      <div className="flex justify-between gap-2 text-base font-semibold text-zinc-950"><span>Total cobrado</span><span className="text-right tabular-nums">{formatServiceMoney(receipt.totalCents ?? 0)}</span></div>
    </article>
  );
}
