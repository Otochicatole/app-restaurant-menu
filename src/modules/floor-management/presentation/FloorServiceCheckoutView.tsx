"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Banknote, Check, CreditCard, Minus, Plus, QrCode, Split } from "lucide-react";
import type { ServiceAccountView, ServicePaymentMethod } from "@/modules/reservation-management/contracts";
import { floorInputClass } from "./floor-api";
import {
  amount,
  formatEditableDecimal,
  parsePrice,
  paymentLabels,
  splitModeLabels,
} from "./floor-service-format";
import { floorPrimaryButtonClass, floorSecondaryButtonClass } from "./floor-ui";
import modalStyles from "./floor-table-modal.module.css";

const fieldClass = "grid min-w-0 gap-1.5 text-xs font-medium text-[var(--floor-muted,#4b6470)]";
const paymentOrder: readonly ServicePaymentMethod[] = ["CASH", "CARD", "TRANSFER_QR", "SPLIT"];

function PaymentIcon({ method }: { method: ServicePaymentMethod }) {
  if (method === "CASH") return <Banknote size={16} aria-hidden="true" />;
  if (method === "CARD") return <CreditCard size={16} aria-hidden="true" />;
  if (method === "TRANSFER_QR") return <QrCode size={16} aria-hidden="true" />;
  return <Split size={16} aria-hidden="true" />;
}

export type CheckoutSubmitPayload = {
  checkoutTab: "FULL" | "BY_ITEMS" | "BY_PEOPLE";
  payment: ServicePaymentMethod | "";
  payerLabel: string;
  selectedItems: { lineId: string; quantity: number }[];
  customPeopleCents: number;
  tipCents: number;
  discountCents: number;
  discountReason: string;
  cashCents: number;
  cardCents: number;
  transferCents: number;
};

export type FloorServiceCheckoutViewProps = {
  account: ServiceAccountView;
  initialTab: "FULL" | "BY_ITEMS" | "BY_PEOPLE";
  versionChanged: boolean;
  locked: boolean;
  busy: boolean;
  canCheckout: boolean;
  canPartialPay: boolean;
  draftItemsCount: number;
  onBack: () => void;
  onSubmit: (payload: CheckoutSubmitPayload) => void;
};

export function FloorServiceCheckoutView({
  account,
  initialTab,
  versionChanged,
  locked,
  busy,
  canCheckout,
  canPartialPay,
  draftItemsCount,
  onBack,
  onSubmit,
}: FloorServiceCheckoutViewProps) {
  const [checkoutTab, setCheckoutTab] = useState<"FULL" | "BY_ITEMS" | "BY_PEOPLE">(initialTab);
  const [itemQtyByLineId, setItemQtyByLineId] = useState<Record<string, number>>({});
  const [peopleCount, setPeopleCount] = useState(() => Math.max(2, account.partySize));
  const [peopleAmountInput, setPeopleAmountInput] = useState(() =>
    formatEditableDecimal(Math.min(account.remainingCents, Math.round(account.remainingCents / Math.max(2, account.partySize)))),
  );
  const [payerLabel, setPayerLabel] = useState("");
  const [payment, setPayment] = useState<ServicePaymentMethod | "">("");
  const [tip, setTip] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");

  const resetInputs = () => {
    setPayment("");
    setTip("");
    setDiscount("");
    setDiscountReason("");
    setSplitCash("");
    setSplitCard("");
    setSplitTransfer("");
    setPayerLabel("");
    setItemQtyByLineId({});
  };

  const unpaidLines = account.lines.filter((line) => line.deliveredQuantity - line.paidQuantity > 0);
  const selectedItems = unpaidLines
    .map((line) => {
      const maxQty = line.deliveredQuantity - line.paidQuantity;
      const qty = Math.min(maxQty, Math.max(0, itemQtyByLineId[line.id] ?? 0));
      return qty > 0 ? { line, quantity: qty } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const selectedItemsSubtotalCents = selectedItems.reduce((sum, { line, quantity }) => sum + line.unitPriceCents * quantity, 0);
  const customPeopleCents = parsePrice(peopleAmountInput);
  const chargeSubtotalCents =
    checkoutTab === "BY_ITEMS"
      ? selectedItemsSubtotalCents
      : checkoutTab === "BY_PEOPLE"
        ? customPeopleCents
        : account.remainingCents;

  const tipCents = parsePrice(tip);
  const discountCents = parsePrice(discount);
  const netChargeCents = Math.max(0, chargeSubtotalCents - discountCents);
  const totalToPayCents = netChargeCents + tipCents;
  const splitCashCents = parsePrice(splitCash);
  const splitCardCents = parsePrice(splitCard);
  const splitTransferCents = parsePrice(splitTransfer);
  const splitSumCents = splitCashCents + splitCardCents + splitTransferCents;
  const splitValid = payment !== "SPLIT" || (chargeSubtotalCents > 0 ? splitSumCents === totalToPayCents : true);
  const itemsExceedRemaining = checkoutTab === "BY_ITEMS" && selectedItemsSubtotalCents > account.remainingCents;
  const peopleAmountInvalid = checkoutTab === "BY_PEOPLE" && (customPeopleCents <= 0 || customPeopleCents > account.remainingCents);

  const submitDisabled =
    versionChanged
    || locked
    || !splitValid
    || (checkoutTab === "FULL" || account.remainingCents === 0
      ? !canCheckout || (account.remainingCents > 0 && !payment)
      : !canPartialPay
        || !payment
        || (checkoutTab === "BY_ITEMS" && (!selectedItems.length || itemsExceedRemaining))
        || (checkoutTab === "BY_PEOPLE" && peopleAmountInvalid));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submitDisabled) return;
    onSubmit({
      checkoutTab,
      payment,
      payerLabel: payerLabel.trim(),
      selectedItems: selectedItems.map(({ line, quantity }) => ({ lineId: line.id, quantity })),
      customPeopleCents,
      tipCents,
      discountCents,
      discountReason: discountReason.trim(),
      cashCents: payment === "SPLIT" ? splitCashCents : 0,
      cardCents: payment === "SPLIT" ? splitCardCents : 0,
      transferCents: payment === "SPLIT" ? splitTransferCents : 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--floor-border,#cad9df)] bg-white px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" className={`${floorSecondaryButtonClass} min-h-9 px-3 text-xs`} disabled={busy} onClick={onBack}>
            <ArrowLeft size={14} aria-hidden="true" />Volver al pedido
          </button>
          <h3 className="text-sm font-bold text-[var(--floor-ink,#173642)] sm:text-base">
            {checkoutTab === "BY_ITEMS"
              ? "Cobrar por productos"
              : checkoutTab === "BY_PEOPLE"
                ? "Cobrar por personas"
                : account.remainingCents > 0
                  ? (account.payments.length > 0 ? "Cobrar saldo restante y cerrar" : "Cerrar cuenta")
                  : "Cerrar cuenta"}
          </h3>
        </div>
        <div className="text-right">
          <span className="block text-[11px] font-medium text-[var(--floor-muted,#4b6470)]">Total a cobrar</span>
          <span className="text-lg font-bold text-[var(--floor-action,#155e75)] tabular-nums">{amount(totalToPayCents)}</span>
        </div>
      </div>

      {account.remainingCents > 0 && (
        <div role="tablist" aria-label="Modalidad de cobro" className={modalStyles.tabList}>
          {([
            { id: "FULL", label: account.payments.length > 0 ? "Saldo restante" : "Cuenta completa" },
            { id: "BY_ITEMS", label: "Por productos" },
            { id: "BY_PEOPLE", label: "Por personas" },
          ] as const).map((tab) => {
            const active = checkoutTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={modalStyles.tabButton}
                onClick={() => {
                  resetInputs();
                  if (tab.id === "BY_PEOPLE") {
                    const nextPeople = Math.max(2, account.partySize);
                    setPeopleCount(nextPeople);
                    setPeopleAmountInput(formatEditableDecimal(Math.min(account.remainingCents, Math.round(account.remainingCents / nextPeople))));
                  }
                  setCheckoutTab(tab.id);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          {versionChanged ? (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950">
              La cuenta cambió. Volvé al pedido y revisá el nuevo total.
            </p>
          ) : checkoutTab === "FULL" && (account.pendingQuantity > 0 || draftItemsCount > 0) ? (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-950">
              {draftItemsCount > 0
                ? "Confirmá o vaciá el listado borrador antes de cerrar la cuenta completa (podés cobrar parcial por productos o personas)."
                : "Entregá o anulá los ítems pendientes antes de cerrar la cuenta completa (podés cobrar parcial lo ya entregado)."}
            </p>
          ) : (
            <p className="text-xs text-[var(--floor-muted,#4b6470)]">
              {checkoutTab === "FULL"
                ? "Se guardará el recibo final y se liberarán las mesas de esta cuenta."
                : "Se emitirá un recibo parcial sin cerrar la mesa hasta saldar todo el consumo."}
            </p>
          )}

          {!versionChanged && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
              <div className="space-y-4">
                {checkoutTab === "FULL" && (
                  <section className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--floor-border,#cad9df)] pb-2.5">
                      <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Detalle del consumo</h4>
                      <span className="text-xs font-semibold text-[var(--floor-muted,#4b6470)] tabular-nums">
                        Saldo pendiente: {amount(account.remainingCents)}
                      </span>
                    </div>
                    {account.lines.filter((line) => line.deliveredQuantity > 0).length === 0 ? (
                      <p className="text-xs text-[var(--floor-muted,#4b6470)]">Sin ítems entregados para facturar.</p>
                    ) : (
                      <ul className="divide-y divide-[var(--floor-border,#cad9df)] text-xs">
                        {account.lines.filter((line) => line.deliveredQuantity > 0).map((line) => (
                          <li key={line.id} className="flex items-start justify-between gap-2 py-2">
                            <span>
                              <strong>{line.deliveredQuantity} ×</strong> {line.name}
                              {line.paidQuantity > 0 && (
                                <span className="ml-1.5 text-[11px] text-emerald-800">({line.paidQuantity} ya cobrado)</span>
                              )}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {amount(line.deliveredQuantity * line.unitPriceCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {account.payments.length > 0 && (
                      <div className="rounded-lg bg-[var(--floor-canvas,#eef4f6)] p-2.5 text-xs space-y-1">
                        <p className="font-semibold text-[var(--floor-ink,#173642)]">Pagos parciales previos</p>
                        {account.payments.map((entry) => (
                          <div key={entry.id} className="flex justify-between gap-2">
                            <span>{entry.receiptNumber} · {entry.payerLabel} ({splitModeLabels[entry.splitMode]})</span>
                            <span className="font-semibold tabular-nums">-{amount(entry.subtotalCents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {checkoutTab === "BY_ITEMS" && account.remainingCents > 0 && (
                  <section className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">
                        Elegí qué productos cobrás en este pago
                      </h4>
                      <span className="text-xs font-semibold text-[var(--floor-action,#155e75)] tabular-nums">
                        Seleccionado: {amount(selectedItemsSubtotalCents)} / {amount(account.remainingCents)}
                      </span>
                    </div>
                    {unpaidLines.length === 0 ? (
                      <p className="text-xs text-[var(--floor-muted,#4b6470)]">
                        Todos los productos entregados ya fueron asignados. Usá Saldo restante o Por personas.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {unpaidLines.map((line) => {
                          const maxQty = line.deliveredQuantity - line.paidQuantity;
                          const chosen = Math.min(maxQty, Math.max(0, itemQtyByLineId[line.id] ?? 0));
                          return (
                            <li
                              key={line.id}
                              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                                chosen > 0
                                  ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-hover,#e6f2f6)]/70"
                                  : "border-[var(--floor-border,#cad9df)] bg-white"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="block truncate font-semibold text-[var(--floor-ink,#173642)]">{line.name}</span>
                                <span className="block text-[11px] text-[var(--floor-muted,#4b6470)] tabular-nums">
                                  {amount(line.unitPriceCents)} c/u · {maxQty} sin cobrar
                                </span>
                              </div>
                              <div className="inline-flex shrink-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={locked || chosen <= 0}
                                  aria-label={`Quitar uno de ${line.name} al pago`}
                                  onClick={() => setItemQtyByLineId((prev) => ({ ...prev, [line.id]: Math.max(0, (prev[line.id] ?? 0) - 1) }))}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-white disabled:opacity-40"
                                >
                                  <Minus size={14} aria-hidden="true" />
                                </button>
                                <span className="min-w-6 text-center text-sm font-bold tabular-nums">{chosen}</span>
                                <button
                                  type="button"
                                  disabled={locked || chosen >= maxQty}
                                  aria-label={`Sumar uno de ${line.name} al pago`}
                                  onClick={() => setItemQtyByLineId((prev) => ({ ...prev, [line.id]: Math.min(maxQty, (prev[line.id] ?? 0) + 1) }))}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-white disabled:opacity-40"
                                >
                                  <Plus size={14} aria-hidden="true" />
                                </button>
                                {maxQty > 1 && chosen < maxQty && (
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => setItemQtyByLineId((prev) => ({ ...prev, [line.id]: maxQty }))}
                                    className="inline-flex h-9 items-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] px-2 text-[11px] font-semibold text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
                                  >
                                    Todo
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {itemsExceedRemaining && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        El subtotal elegido ({amount(selectedItemsSubtotalCents)}) supera el saldo pendiente ({amount(account.remainingCents)}). Usá Por personas o elegí menos ítems.
                      </p>
                    )}
                  </section>
                )}

                {checkoutTab === "BY_PEOPLE" && account.remainingCents > 0 && (
                  <section className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4 space-y-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Dividir importe por personas</h4>
                      <span className="text-xs font-semibold text-[var(--floor-muted,#4b6470)] tabular-nums">
                        Saldo pendiente: {amount(account.remainingCents)}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={fieldClass}>
                        <span>Dividir entre personas</span>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={locked || peopleCount <= 1}
                            aria-label="Restar persona"
                            onClick={() => {
                              const next = Math.max(1, peopleCount - 1);
                              setPeopleCount(next);
                              setPeopleAmountInput(formatEditableDecimal(Math.min(account.remainingCents, Math.round(account.remainingCents / next))));
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-white disabled:opacity-40"
                          >
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <span className="min-w-8 text-center text-base font-bold tabular-nums">{peopleCount}</span>
                          <button
                            type="button"
                            disabled={locked || peopleCount >= 100}
                            aria-label="Sumar persona"
                            onClick={() => {
                              const next = Math.min(100, peopleCount + 1);
                              setPeopleCount(next);
                              setPeopleAmountInput(formatEditableDecimal(Math.min(account.remainingCents, Math.round(account.remainingCents / next))));
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-white disabled:opacity-40"
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <label className={fieldClass}>
                        Monto de este pago ($)
                        <input
                          className={`${floorInputClass} min-h-10`}
                          disabled={locked}
                          inputMode="decimal"
                          pattern="[0-9]+([,.][0-9]{1,2})?"
                          value={peopleAmountInput}
                          onChange={(event) => setPeopleAmountInput(event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setPeopleAmountInput(formatEditableDecimal(account.remainingCents))}
                        className="font-semibold text-[var(--floor-action,#155e75)] underline underline-offset-2"
                      >
                        Saldar el resto exacto ({amount(account.remainingCents)})
                      </button>
                    </div>
                    {peopleAmountInvalid && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        Ingresá un monto mayor a $0 y menor o igual al saldo pendiente ({amount(account.remainingCents)}).
                      </p>
                    )}
                  </section>
                )}
              </div>

              {(checkoutTab !== "FULL" || account.remainingCents > 0) && (
                <section className="space-y-4 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-4">
                  <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Datos del cobro</h4>

                  {checkoutTab !== "FULL" && (
                    <label className={fieldClass}>
                      Etiqueta / Persona que paga (opcional)
                      <input
                        className={`${floorInputClass} min-h-10`}
                        disabled={locked}
                        maxLength={80}
                        placeholder={checkoutTab === "BY_PEOPLE" ? `Ej: Persona 1 de ${peopleCount}` : "Ej: Ana / Silla 2"}
                        value={payerLabel}
                        onChange={(event) => setPayerLabel(event.target.value)}
                      />
                    </label>
                  )}

                  <div className={fieldClass}>
                    <span>Medio de pago</span>
                    <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-2 gap-2">
                      {paymentOrder.map((method) => {
                        const selected = payment === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={locked}
                            onClick={() => setPayment(method)}
                            className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                              selected
                                ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-hover,#e6f2f6)] text-[var(--floor-ink,#173642)] ring-2 ring-[var(--floor-focus,#0e7490)]/20"
                                : "border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)]"
                            }`}
                          >
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <PaymentIcon method={method} />
                              <span className="truncate">{paymentLabels[method]}</span>
                            </span>
                            {selected && <Check size={14} aria-hidden="true" className="shrink-0 text-[var(--floor-action,#155e75)]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {payment === "SPLIT" && (
                    <div className="space-y-2 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] p-3">
                      <p className="text-xs font-semibold text-[var(--floor-ink,#173642)]">Desglose de pago mixto</p>
                      <div className="grid grid-cols-3 gap-2">
                        <label className={fieldClass}>Efectivo<input className={floorInputClass} disabled={locked} inputMode="decimal" placeholder="0,00" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} /></label>
                        <label className={fieldClass}>Tarjeta<input className={floorInputClass} disabled={locked} inputMode="decimal" placeholder="0,00" value={splitCard} onChange={(e) => setSplitCard(e.target.value)} /></label>
                        <label className={fieldClass}>Transf./QR<input className={floorInputClass} disabled={locked} inputMode="decimal" placeholder="0,00" value={splitTransfer} onChange={(e) => setSplitTransfer(e.target.value)} /></label>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className={splitValid ? "font-semibold text-emerald-800" : "font-semibold text-red-700"}>
                          Suma: {amount(splitSumCents)} / {amount(totalToPayCents)}
                        </span>
                        {!splitValid && <span className="text-[11px] text-red-700">Debe coincidir</span>}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <label className={fieldClass}>
                      Descuento ($)
                      <input className={floorInputClass} disabled={locked} inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                    </label>
                    <label className={fieldClass}>
                      Motivo descuento
                      <input className={floorInputClass} disabled={locked} maxLength={100} placeholder="Ej: cortesía" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                    </label>
                  </div>

                  <label className={fieldClass}>
                    Propina sugerida ($)
                    <input className={floorInputClass} disabled={locked} inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" placeholder="0,00" value={tip} onChange={(e) => setTip(e.target.value)} />
                  </label>

                  <dl className="space-y-1 border-t border-[var(--floor-border,#cad9df)] pt-3 text-xs">
                    <div className="flex justify-between text-[var(--floor-muted,#4b6470)]">
                      <dt>Subtotal seleccionado</dt>
                      <dd className="tabular-nums">{amount(chargeSubtotalCents)}</dd>
                    </div>
                    {discountCents > 0 && (
                      <div className="flex justify-between text-emerald-800">
                        <dt>Descuento</dt>
                        <dd className="tabular-nums">-{amount(discountCents)}</dd>
                      </div>
                    )}
                    {tipCents > 0 && (
                      <div className="flex justify-between text-[var(--floor-muted,#4b6470)]">
                        <dt>Propina</dt>
                        <dd className="tabular-nums">+{amount(tipCents)}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between pt-1.5 text-sm font-bold text-[var(--floor-ink,#173642)]">
                      <dt>Total a cobrar</dt>
                      <dd className="text-lg tabular-nums">{amount(totalToPayCents)}</dd>
                    </div>
                  </dl>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--floor-border,#cad9df)] bg-white px-4 py-3 sm:px-6">
        <button type="button" className={floorSecondaryButtonClass} disabled={busy} onClick={onBack}>
          Volver al pedido
        </button>
        <button type="submit" className={floorPrimaryButtonClass} disabled={submitDisabled}>
          {checkoutTab === "FULL"
            ? (account.remainingCents > 0 ? "Confirmar cobro" : "Confirmar cierre")
            : "Registrar pago parcial"}
        </button>
      </footer>
    </form>
  );
}
