import { useState, type FormEvent } from "react";
import { CalendarDays, Printer, ReceiptText } from "lucide-react";
import { AdminCard, AdminPageHeader, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import type { ServiceAccountView, ServiceCashEventView, ServiceCashReport } from "../contracts";
import { ServiceLoadError, ServiceLoading, serviceInputClass } from "./ServiceAdminUi";
import { CashReceipt } from "./CashReceipt";
import { formatServiceDate, formatServiceMoney, sendServiceAdmin, serviceAdminError, serviceAdminUrl, servicePaymentLabels, useServiceAdminQuery } from "./service-admin-client";

type DateRange = { from: string; to: string };
type CashAction = { kind: "close-day" | "reopen-day"; date: string };
type Period = "day" | "month" | "range";

function CashPeriodFilter({ today, range, onApply }: { today: string; range: DateRange; onApply: (range: DateRange) => void }) {
  const [period, setPeriod] = useState<Period>("day");
  const [day, setDay] = useState(range.from);
  const [month, setMonth] = useState(range.from.slice(0, 7));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (period === "day") {
      onApply({ from: day, to: day });
    } else if (period === "month") {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        setError("Ingresá el mes en formato AAAA-MM.");
        return;
      }
      const from = `${month}-01`;
      const last = new Date(`${from}T00:00:00Z`);
      last.setUTCMonth(last.getUTCMonth() + 1, 0);
      onApply({ from, to: last.toISOString().slice(0, 10) });
    } else if (draft.from <= draft.to) {
      onApply(draft);
    } else {
      setError("La fecha Hasta debe ser igual o posterior a Desde.");
    }
  }

  return (
    <form aria-label="Período de caja" onSubmit={apply} className="rounded-xl border border-[#dce4d9] bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-36 flex-1 gap-1 text-sm font-medium sm:flex-initial">Período
          <select value={period} onChange={(event) => { setPeriod(event.target.value as Period); setError(""); }} className={serviceInputClass}>
            <option value="day">Día</option><option value="month">Mes</option><option value="range">Rango de fechas</option>
          </select>
        </label>
        {period === "day" && <label className="grid flex-1 gap-1 text-sm font-medium sm:flex-initial">Fecha<input type="date" required max={today} value={day} onChange={(event) => setDay(event.target.value)} className={serviceInputClass} /></label>}
        {period === "month" && <label className="grid flex-1 gap-1 text-sm font-medium sm:flex-initial">Mes<input type="month" required max={today.slice(0, 7)} value={month} onChange={(event) => setMonth(event.target.value)} className={serviceInputClass} /></label>}
        {period === "range" && <>
          <label className="grid flex-1 gap-1 text-sm font-medium sm:flex-initial">Desde<input type="date" required max={today} value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className={serviceInputClass} /></label>
          <label className="grid flex-1 gap-1 text-sm font-medium sm:flex-initial">Hasta<input type="date" required max={today} value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className={serviceInputClass} /></label>
        </>}
        <button type="submit" className={`${adminSecondaryButtonClass} min-h-11`}><CalendarDays size={17} aria-hidden="true" /> Consultar</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </form>
  );
}

export function CashCmsScreen({ restaurantId, restaurantName, timeZone, initialToday }: { restaurantId: string; restaurantName: string; timeZone: string; initialToday: string }) {
  const [range, setRange] = useState<DateRange>({ from: initialToday, to: initialToday });
  const [action, setAction] = useState<CashAction | null>(null);
  const [selected, setSelected] = useState<ServiceAccountView | null>(null);
  const [notice, setNotice] = useState("");
  const { result, refresh } = useServiceAdminQuery<ServiceCashReport>(serviceAdminUrl(restaurantId, { mode: "cash", ...range }));
  const report = result?.data;
  const today = report?.today ?? initialToday;
  const events = report ? [...report.days].sort((a, b) => b.businessDate.localeCompare(a.businessDate) || b.revision - a.revision) : [];
  const day = report && report.from === report.to ? report.from : null;
  const dayStatus = day ? events.find((entry) => entry.businessDate === day)?.kind : undefined;
  const dayAction = day && day <= today ? dayStatus === "CLOSE" ? (day === today ? "reopen-day" : null) : "close-day" : null;
  const localTime = new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit" });

  const applyRange = (next: DateRange) => {
    setNotice("");
    if (next.from === range.from && next.to === range.to) refresh();
    else setRange(next);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Caja" description="Consultá los cobros y los cierres del restaurante según la fecha en que se registró cada pago." />
      <CashPeriodFilter today={today} range={range} onApply={applyRange} />
      {notice && <p role="status" className="rounded-xl bg-[#e8efe6] px-4 py-3 text-sm font-medium text-[#263e23]">{notice}</p>}
      {!result && <ServiceLoading message="Cargando los movimientos de caja…" />}
      {result?.error && <ServiceLoadError message={result.error} onRetry={refresh} />}
      {report && <>
        <AdminCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce4d9] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">{day ? formatServiceDate(day) : `${formatServiceDate(report.from)} al ${formatServiceDate(report.to)}`}</h2>
              <p className="mt-0.5 text-sm text-zinc-600">{day ? dayStatus === "CLOSE" ? "Día cerrado" : dayStatus === "REOPEN" ? "Caja reabierta" : "Día sin cierre" : "Totales del período"}</p>
            </div>
            {day && dayAction && <button type="button" onClick={() => setAction({ kind: dayAction, date: day })} className={dayAction === "close-day" ? adminPrimaryButtonClass : adminSecondaryButtonClass}>{dayAction === "close-day" ? "Cerrar día" : "Reabrir día"}</button>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 bg-[#f3f6f1] px-4 py-4 sm:grid-cols-3 lg:grid-cols-6 sm:px-5">
            <div><dt className="text-sm font-medium text-[#263e23]">Total cobrado</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums text-[#182618]">{formatServiceMoney(report.totals.totalCents)}</dd></div>
            {([["Efectivo", report.totals.cashCents], ["Tarjeta", report.totals.cardCents], ["Transferencia / QR", report.totals.transferCents]] as const).map(([label, cents]) => (
              <div key={label}><dt className="text-sm text-zinc-700">{label}</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(cents)}</dd></div>
            ))}
            <div><dt className="text-sm text-zinc-700">Propinas</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(report.totals.tipCents)}</dd></div>
            <div><dt className="text-sm text-zinc-700">Descuentos</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(report.totals.discountCents)}</dd></div>
          </dl>
        </AdminCard>

        <AdminCard>
          <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-zinc-950">Recibos de consumo</h2>
            <p className="mt-0.5 text-sm text-zinc-600">{report.totals.receiptCount} {report.totals.receiptCount === 1 ? "recibo registrado" : "recibos registrados"}</p>
          </div>
          {report.receipts.length === 0 ? <p className="px-4 py-8 text-center text-sm text-zinc-600">No hay recibos en este período.</p> : (
            <ul className="divide-y divide-zinc-100">
              {report.receipts.map((receipt) => (
                <li key={receipt.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-5 sm:px-5">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-zinc-950">{receipt.receiptNumber ?? "Cierre sin consumo"} · {receipt.tableLabels.join(", ")}</p>
                    <p className="mt-0.5 break-words text-xs text-zinc-600">{receipt.businessDate && formatServiceDate(receipt.businessDate)}{receipt.closedAt && ` · ${localTime.format(new Date(receipt.closedAt))}`} · {receipt.roomName} · {receipt.paymentMethod ? servicePaymentLabels[receipt.paymentMethod] : "Sin consumo"}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-950">{formatServiceMoney(receipt.totalCents ?? 0)}</p>
                  <button type="button" aria-label={`Ver recibo ${receipt.receiptNumber ?? receipt.tableLabels.join(", ")}`} onClick={() => setSelected(receipt)} className={`${adminSecondaryButtonClass} col-span-2 min-h-10 justify-self-end px-3 py-2 sm:col-span-1`}><ReceiptText size={16} aria-hidden="true" /> Ver recibo</button>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {events.length > 0 && <CashHistory events={events} timeZone={timeZone} />}
      </>}
      {action && report && <CashActionModal key={`${action.kind}:${action.date}`} restaurantId={restaurantId} action={action} total={report.totals.totalCents}
        onClose={() => setAction(null)} onSaved={() => { setNotice(action.kind === "close-day" ? "El cierre diario quedó guardado." : "Se reabrió el día y quedó registrado el motivo."); setAction(null); refresh(); }} />}
      {selected && <AdminModal open title="Recibo de consumo" wide onClose={() => setSelected(null)}>
        <CashReceipt receipt={selected} restaurantName={restaurantName} timeZone={timeZone} />
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={() => setSelected(null)} className={adminSecondaryButtonClass}>Cerrar</button>
          <button type="button" onClick={() => window.print()} className={adminPrimaryButtonClass}><Printer size={17} aria-hidden="true" /> Imprimir recibo</button>
        </div>
      </AdminModal>}
    </div>
  );
}

function CashHistory({ events, timeZone }: { events: ServiceCashEventView[]; timeZone: string }) {
  const time = new Intl.DateTimeFormat("es-AR", { timeZone, dateStyle: "short", timeStyle: "short" });
  return (
    <details className="rounded-xl border border-[#dce4d9] bg-white">
      <summary className="cursor-pointer rounded-xl px-4 py-4 text-sm font-semibold text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#3d5934] sm:px-5">Historial de cierres y reaperturas <span className="ml-2 font-normal text-zinc-600">{events.length}</span></summary>
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
        {events.map((event) => <li key={event.id} className="space-y-1 px-4 py-3 text-sm sm:px-5">
          <p className="font-semibold text-zinc-950">{event.kind === "CLOSE" ? "Cierre" : "Reapertura"} del {formatServiceDate(event.businessDate)}</p>
          <p className="break-words text-xs text-zinc-600">{time.format(new Date(event.createdAt))} · {("actorLabel" in event && typeof event.actorLabel === "string" && event.actorLabel) || event.actorId}</p>
          {event.kind === "CLOSE" ? <p className="text-xs tabular-nums text-zinc-700">{event.receiptCount ?? 0} recibos · Efectivo {formatServiceMoney(event.cashCents ?? 0)} · Tarjeta {formatServiceMoney(event.cardCents ?? 0)} · Transferencia / QR {formatServiceMoney(event.transferCents ?? 0)}</p>
            : <p className="whitespace-pre-wrap break-words text-zinc-700">{event.reason}</p>}
        </li>)}
      </ul>
    </details>
  );
}

function CashActionModal({ restaurantId, action, total, onClose, onSaved }: {
  restaurantId: string; action: CashAction; total: number; onClose: () => void; onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reopening = action.kind === "reopen-day";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (reopening && !reason.trim())) return;
    setBusy(true);
    setError("");
    try {
      await sendServiceAdmin(restaurantId, reopening ? { action: "reopen-day", date: action.date, reason: reason.trim() } : { action: "close-day", date: action.date });
      onSaved();
    } catch (failure) {
      setError(serviceAdminError(failure));
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={reopening ? "Reabrir día de caja" : "Cerrar día de caja"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-zinc-700">{reopening ? `El ${formatServiceDate(action.date)} volverá a admitir cobros. El cierre anterior quedará en el historial.` : `Se guardará el cierre del ${formatServiceDate(action.date)}. El total consultado es ${formatServiceMoney(total)}.`}</p>
        {reopening && <label className="grid gap-1 text-sm font-medium">Motivo de la reapertura<textarea required rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className={serviceInputClass} disabled={busy} /></label>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onClose} className={adminSecondaryButtonClass} disabled={busy}>Cancelar</button>
          <button type="submit" className={adminPrimaryButtonClass} disabled={busy || (reopening && !reason.trim())}>{busy ? "Guardando…" : reopening ? "Reabrir día" : "Confirmar cierre"}</button>
        </div>
      </form>
    </AdminModal>
  );
}
