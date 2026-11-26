import { useState, type FormEvent } from "react";
import { AlertTriangle, ArrowDownCircle, CalendarDays, ClipboardList, Plus, Printer, ReceiptText, Trash2 } from "lucide-react";
import { AdminCard, AdminPageHeader, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminSearchableSelect } from "@/ui/admin/AdminSearchableSelect";
import { AdminModal } from "@/ui/admin/AdminUI";
import {
  cashExpenseCategoryLabels,
  cashExpenseCategorySchema,
  type CashExpenseCategory,
  type CashExpensePaymentMethod,
  type ServiceAccountView,
  type ServiceCashEventView,
  type ServiceCashReport,
} from "../contracts";
import { ServiceLoadError, ServiceLoading, serviceInputClass } from "./ServiceAdminUi";
import { CashAccountAuditModal } from "./CashAccountAuditModal";
import { CashReceipt } from "./CashReceipt";
import { formatServiceDate, formatServiceMoney, parseServicePrice, sendServiceAdmin, serviceAdminError, serviceAdminUrl, servicePaymentLabels, useServiceAdminQuery } from "./service-admin-client";

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
  const [activeTab, setActiveTab] = useState<"receipts" | "expenses">("receipts");
  const [action, setAction] = useState<CashAction | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState("");
  const [selected, setSelected] = useState<ServiceAccountView | null>(null);
  const [auditReceipt, setAuditReceipt] = useState<ServiceAccountView | null>(null);
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [notice, setNotice] = useState("");
  const { result, refresh } = useServiceAdminQuery<ServiceCashReport>(serviceAdminUrl(restaurantId, { mode: "cash", ...range }));
  const report = result?.data;
  const today = report?.today ?? initialToday;
  const events = report ? [...report.days].sort((a, b) => b.businessDate.localeCompare(a.businessDate) || b.revision - a.revision) : [];
  const day = report && report.from === report.to ? report.from : null;
  const dayStatus = day ? events.find((entry) => entry.businessDate === day)?.kind : undefined;
  const dayAction = day && day <= today ? dayStatus === "CLOSE" ? (day === today ? "reopen-day" : null) : "close-day" : null;
  const localTime = new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit" });
  const receiptsWithAlertsCount = report ? report.receipts.filter((receipt) => receipt.hasAuditAlerts).length : 0;
  const visibleReceipts = report ? (onlyAlerts ? report.receipts.filter((receipt) => receipt.hasAuditAlerts) : report.receipts) : [];
  const expenses = report?.expenses ?? [];
  const closedDates = new Set(
    events
      .filter((entry, index, list) => list.findIndex((item) => item.businessDate === entry.businessDate) === index)
      .filter((entry) => entry.kind === "CLOSE")
      .map((entry) => entry.businessDate),
  );
  const expensesCents = report?.totals.expensesCents ?? 0;
  const netTotalCents = report?.totals.netTotalCents ?? ((report?.totals.totalCents ?? 0) - expensesCents);
  const netCashCents = report?.totals.netCashCents ?? ((report?.totals.cashCents ?? 0) - (report?.totals.cashExpensesCents ?? 0));

  async function removeExpense(id: string) {
    if (deletingExpenseId) return;
    setDeletingExpenseId(id);
    setExpenseError("");
    try {
      await sendServiceAdmin(restaurantId, { action: "delete-cash-expense", id });
      setNotice("Egreso eliminado y totales actualizados.");
      refresh();
    } catch (failure) {
      setExpenseError(serviceAdminError(failure));
    } finally {
      setDeletingExpenseId(null);
    }
  }

  const applyRange = (next: DateRange) => {
    setNotice("");
    if (next.from === range.from && next.to === range.to) refresh();
    else setRange(next);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Caja"
        description="Consultá los cobros, egresos por gastos de último momento o proveedores y los cierres diarios."
        actions={
          <button
            type="button"
            disabled={dayStatus === "CLOSE"}
            onClick={() => { setExpenseError(""); setExpenseModalOpen(true); }}
            className={adminPrimaryButtonClass}
          >
            <Plus size={16} aria-hidden="true" /> Registrar egreso
          </button>
        }
      />
      <CashPeriodFilter today={today} range={range} onApply={applyRange} />
      {notice && <p role="status" className="rounded-xl bg-[#e8efe6] px-4 py-3 text-sm font-medium text-[#263e23]">{notice}</p>}
      {expenseError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{expenseError}</p>}
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
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 bg-[#f3f6f1] px-4 py-4 sm:grid-cols-4 lg:grid-cols-8 sm:px-5">
            <div><dt className="text-xs font-medium text-zinc-600">Total cobrado</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(report.totals.totalCents)}</dd></div>
            <div><dt className="text-xs font-medium text-red-800">Egresos</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-red-700">-{formatServiceMoney(expensesCents)}</dd></div>
            <div><dt className="text-xs font-semibold text-[#263e23]">Neto en caja</dt><dd className="mt-1 break-words text-lg font-bold tabular-nums text-[#182618]">{formatServiceMoney(netTotalCents)}</dd></div>
            <div>
              <dt className="text-xs text-zinc-700">Efectivo neto</dt>
              <dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(netCashCents)}</dd>
            </div>
            {([["Tarjeta", report.totals.cardCents - (report.totals.cardExpensesCents ?? 0)], ["Transferencia / QR", report.totals.transferCents - (report.totals.transferExpensesCents ?? 0)]] as const).map(([label, cents]) => (
              <div key={label}><dt className="text-xs text-zinc-700">{label}</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(cents)}</dd></div>
            ))}
            <div><dt className="text-xs text-zinc-700">Propinas</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(report.totals.tipCents)}</dd></div>
            <div><dt className="text-xs text-zinc-700">Descuentos</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-zinc-950">{formatServiceMoney(report.totals.discountCents)}</dd></div>
          </dl>
        </AdminCard>

        <AdminCard>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
            <div role="tablist" aria-label="Movimientos de caja" className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "receipts"}
                onClick={() => setActiveTab("receipts")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  activeTab === "receipts" ? "bg-[#263e23] text-white shadow-xs" : "text-zinc-700 hover:bg-white"
                }`}
              >
                <ReceiptText size={14} aria-hidden="true" />
                <span>Recibos de consumo</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${activeTab === "receipts" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                  {report.totals.receiptCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "expenses"}
                onClick={() => setActiveTab("expenses")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  activeTab === "expenses" ? "bg-[#263e23] text-white shadow-xs" : "text-zinc-700 hover:bg-white"
                }`}
              >
                <ArrowDownCircle size={14} aria-hidden="true" />
                <span>Egresos de caja</span>
                {expenses.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${activeTab === "expenses" ? "bg-white/20 text-white" : "bg-red-100 text-red-900"}`}>
                    {expenses.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "receipts" ? (
              receiptsWithAlertsCount > 0 ? (
                <button
                  type="button"
                  aria-pressed={onlyAlerts}
                  onClick={() => setOnlyAlerts((current) => !current)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    onlyAlerts
                      ? "border-amber-400 bg-amber-100 text-amber-950"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                  Solo con alertas ({receiptsWithAlertsCount})
                </button>
              ) : null
            ) : (
              <button
                type="button"
                disabled={dayStatus === "CLOSE"}
                onClick={() => { setExpenseError(""); setExpenseModalOpen(true); }}
                className={`${adminSecondaryButtonClass} min-h-9 px-3 py-1.5 text-xs`}
              >
                <ArrowDownCircle size={15} aria-hidden="true" /> Agregar gasto
              </button>
            )}
          </div>

          {activeTab === "receipts" ? (
            visibleReceipts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-600">
                {onlyAlerts ? "No hay recibos con alertas en este período." : "No hay recibos en este período."}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {visibleReceipts.map((receipt) => {
                  const receiptRef = receipt.receiptNumber ?? receipt.tableLabels.join(", ");
                  const flagged = receipt.hasAuditAlerts;
                  return (
                    <li
                      key={receipt.id}
                      data-audit-alert={flagged ? "true" : "false"}
                      className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-5 sm:px-5 ${
                        flagged ? "bg-amber-50/90" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-semibold text-zinc-950">
                            {receipt.receiptNumber ?? "Cierre sin consumo"} · {receipt.tableLabels.join(", ")}
                          </p>
                          {receipt.payments.length > 1 && (
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
                              Dividida ({receipt.payments.length} pagos)
                            </span>
                          )}
                          {flagged && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                              <AlertTriangle size={12} aria-hidden="true" />
                              {receipt.cancellationCount > 0
                                ? `${receipt.cancellationCount} ${receipt.cancellationCount === 1 ? "anulación" : "anulaciones"}`
                                : `${receipt.auditAlertCount} ${receipt.auditAlertCount === 1 ? "alerta" : "alertas"}`}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-xs text-zinc-600">
                          {receipt.businessDate && formatServiceDate(receipt.businessDate)}
                          {receipt.closedAt && ` · ${localTime.format(new Date(receipt.closedAt))}`}
                          {" · "}
                          {receipt.roomName}
                          {" · "}
                          {receipt.paymentMethod ? servicePaymentLabels[receipt.paymentMethod] : "Sin consumo"}
                          {receipt.assignedWaiterName && ` · Mozo: ${receipt.assignedWaiterName}`}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-950">{formatServiceMoney(receipt.totalCents ?? 0)}</p>
                      <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-span-1">
                        <button
                          type="button"
                          aria-label={`Ver registro ${receiptRef}`}
                          onClick={() => setAuditReceipt(receipt)}
                          className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2`}
                        >
                          <ClipboardList size={16} aria-hidden="true" /> Ver registro
                        </button>
                        <button
                          type="button"
                          aria-label={`Ver recibo ${receiptRef}`}
                          onClick={() => setSelected(receipt)}
                          className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2`}
                        >
                          <ReceiptText size={16} aria-hidden="true" /> Ver recibo
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : expenses.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-600">
              No hay egresos ni pagos a proveedores registrados en este período.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100" aria-label="Egresos de caja">
              {expenses.map((expense) => {
                const isClosed = closedDates.has(expense.businessDate);
                return (
                  <li key={expense.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-900">
                          {cashExpenseCategoryLabels[expense.category]}
                        </span>
                        <p className="break-words text-sm font-semibold text-zinc-950">{expense.notes}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {formatServiceDate(expense.businessDate)} · {localTime.format(new Date(expense.createdAt))}
                        {" · "}{servicePaymentLabels[expense.paymentMethod]}
                        {expense.supplierName ? ` · ${expense.supplierName}` : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-red-700">
                      -{formatServiceMoney(expense.amountCents)}
                    </p>
                    {!isClosed && (
                      <div className="col-span-2 flex justify-end sm:col-span-1">
                        <button
                          type="button"
                          aria-label={`Eliminar egreso ${expense.notes}`}
                          disabled={deletingExpenseId === expense.id}
                          onClick={() => void removeExpense(expense.id)}
                          className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`}
                        >
                          <Trash2 size={14} aria-hidden="true" /> Quitar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        {events.length > 0 && <CashHistory events={events} timeZone={timeZone} />}
      </>}
      {action && report && <CashActionModal key={`${action.kind}:${action.date}`} restaurantId={restaurantId} action={action} total={netTotalCents}
        onClose={() => setAction(null)} onSaved={() => { setNotice(action.kind === "close-day" ? "El cierre diario quedó guardado." : "Se reabrió el día y quedó registrado el motivo."); setAction(null); refresh(); }} />}
      {expenseModalOpen && (
        <CashExpenseModal
          restaurantId={restaurantId}
          today={today}
          defaultDate={day ?? today}
          onClose={() => setExpenseModalOpen(false)}
          onSaved={() => {
            setExpenseModalOpen(false);
            setActiveTab("expenses");
            setNotice("Egreso registrado en caja.");
            refresh();
          }}
        />
      )}
      {selected && <AdminModal open title="Recibo de consumo" wide onClose={() => setSelected(null)}>
        <CashReceipt receipt={selected} restaurantName={restaurantName} timeZone={timeZone} />
        <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={() => { const current = selected; setSelected(null); setAuditReceipt(current); }} className={adminSecondaryButtonClass}>
            <ClipboardList size={16} aria-hidden="true" /> Ver registro
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelected(null)} className={adminSecondaryButtonClass}>Cerrar</button>
            <button type="button" onClick={() => window.print()} className={adminPrimaryButtonClass}><Printer size={17} aria-hidden="true" /> Imprimir recibo</button>
          </div>
        </div>
      </AdminModal>}
      {auditReceipt && <CashAccountAuditModal
        receipt={auditReceipt}
        restaurantName={restaurantName}
        timeZone={timeZone}
        onClose={() => setAuditReceipt(null)}
        onViewReceipt={() => { const current = auditReceipt; setAuditReceipt(null); setSelected(current); }}
      />}
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

function CashExpenseModal({
  restaurantId,
  today,
  defaultDate,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  today: string;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(defaultDate <= today ? defaultDate : today);
  const [category, setCategory] = useState<CashExpenseCategory>("LAST_MINUTE");
  const [paymentMethod, setPaymentMethod] = useState<CashExpensePaymentMethod>("CASH");
  const [amount, setAmount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const amountCents = parseServicePrice(amount);
    if (amountCents === null || !notes.trim()) {
      setError("Ingresá un monto válido mayor a cero y las observaciones del egreso.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await sendServiceAdmin(restaurantId, {
        action: "record-cash-expense",
        date,
        category,
        paymentMethod,
        amountCents,
        notes: notes.trim(),
        supplierName: supplierName.trim(),
      });
      onSaved();
    } catch (failure) {
      setError(serviceAdminError(failure));
      setBusy(false);
    }
  }

  return (
    <AdminModal open title="Registrar egreso de caja" onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-zinc-600">
          Se descontará del total del día y del cierre de caja correspondiente al medio elegido.
        </p>
        <fieldset disabled={busy} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Fecha del gasto
              <input
                type="date"
                required
                max={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={serviceInputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Monto en pesos ($)
              <input
                type="text"
                required
                inputMode="decimal"
                placeholder="Ej. 15000,00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={serviceInputClass}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Motivo del egreso
              <AdminSearchableSelect
                ariaLabel="Motivo del egreso"
                disabled={busy}
                searchable={false}
                value={category}
                options={cashExpenseCategorySchema.options.map((value) => ({
                  value,
                  label: cashExpenseCategoryLabels[value],
                }))}
                onChange={(next) => setCategory(next as CashExpenseCategory)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Sale de
              <AdminSearchableSelect
                ariaLabel="Medio del egreso"
                disabled={busy}
                searchable={false}
                value={paymentMethod}
                options={[
                  { value: "CASH", label: "Efectivo" },
                  { value: "TRANSFER_QR", label: "Transferencia / QR" },
                  { value: "CARD", label: "Tarjeta" },
                ]}
                onChange={(next) => setPaymentMethod(next as CashExpensePaymentMethod)}
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Proveedor o destinatario (opcional)
            <input
              type="text"
              maxLength={120}
              placeholder="Ej. Verdulería San Martín"
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              className={serviceInputClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Observaciones
            <textarea
              required
              rows={3}
              maxLength={400}
              placeholder="Detalle del gasto de último momento o pago…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={serviceInputClass}
            />
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" onClick={onClose} className={adminSecondaryButtonClass} disabled={busy}>Cancelar</button>
          <button type="submit" className={adminPrimaryButtonClass} disabled={busy}>
            {busy ? "Guardando…" : "Guardar egreso"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
