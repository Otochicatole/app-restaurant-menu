"use client";

import { useId, useState, type CSSProperties } from "react";
import { ChefHat, MessageSquarePlus, Minus, Plus, Send, Trash2, Wine } from "lucide-react";
import type { KitchenStation } from "@/modules/reservation-management/contracts";
import { amount, quantityLabel, type DraftOrderItem } from "./floor-service-format";
import { floorPrimaryButtonClass } from "./floor-ui";
import tableStyles from "./floor-service-table.module.css";

const tableDangerButtonClass = "inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-white px-2 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-45";

export type FloorServiceDraftPanelProps = {
  items: DraftOrderItem[];
  busy: boolean;
  onChangeQuantity: (key: string, delta: number) => void;
  onChangeStation: (key: string, station: KitchenStation) => void;
  onChangeNotes: (key: string, notes: string) => void;
  onRemoveItem: (key: string) => void;
  onClearList: () => void;
  onConfirmOrder: () => void;
};

export function FloorServiceDraftPanel({
  items,
  busy,
  onChangeQuantity,
  onChangeStation,
  onChangeNotes,
  onRemoveItem,
  onClearList,
  onConfirmOrder,
}: FloorServiceDraftPanelProps) {
  const draftCaptionId = useId();
  const [editingNoteKeys, setEditingNoteKeys] = useState<Record<string, boolean>>({});

  const draftTotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const draftUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section
      aria-label="Listado del nuevo pedido"
      className="flex min-h-0 max-h-[48%] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--floor-border,#cad9df)] bg-white"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--floor-border,#cad9df)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Listado del pedido</h4>
          <span className="rounded-md bg-[var(--floor-canvas,#eef4f6)] px-2 py-0.5 text-[11px] font-semibold text-[var(--floor-ink,#173642)] tabular-nums">
            {draftUnits === 0 ? "Sin ítems" : `${quantityLabel(draftUnits, "ítem")} · Sin enviar`}
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className="text-xs font-medium text-[var(--floor-muted,#4b6470)] underline underline-offset-2 hover:text-[var(--floor-ink,#173642)] disabled:opacity-50"
            disabled={busy}
            onClick={onClearList}
          >
            Vaciar lista
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-3 py-4 text-xs leading-relaxed text-[var(--floor-muted,#4b6470)]">
          Agregá los productos al listado. El ticket para cocina y barra se genera recién al confirmar el pedido.
        </p>
      ) : (
        <>
          <div tabIndex={0} role="region" aria-labelledby={draftCaptionId} className={`${tableStyles.tableWrapper} ${tableStyles.paneTableWrapper} border-0 rounded-none`}>
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
                {items.map((item) => {
                  const showNoteInput = Boolean(editingNoteKeys[item.key] || item.notes);
                  return (
                    <tr key={item.key}>
                      <th scope="row">
                        <span className="block break-words">{item.name}</span>
                        {showNoteInput ? (
                          <input
                            type="text"
                            maxLength={200}
                            disabled={busy}
                            aria-label={`Nota para ${item.name}`}
                            placeholder="Ej: sin sal, punto jugoso"
                            value={item.notes}
                            onChange={(event) => onChangeNotes(item.key, event.target.value)}
                            className="mt-1.5 w-full rounded-md border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)]/60 px-2 py-1 text-xs font-normal text-[var(--floor-ink,#173642)] outline-none focus:border-[var(--floor-focus,#0e7490)] focus:bg-white"
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Editar nota de ${item.name}`}
                            onClick={() => setEditingNoteKeys((prev) => ({ ...prev, [item.key]: true }))}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--floor-action,#155e75)] hover:underline"
                          >
                            <MessageSquarePlus size={12} aria-hidden="true" />
                            Nota
                          </button>
                        )}
                      </th>
                      <td className="whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Cambiar estación de ${item.name}`}
                          onClick={() => onChangeStation(item.key, item.station === "KITCHEN" ? "BAR" : "KITCHEN")}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                            item.station === "BAR"
                              ? "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                              : "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100"
                          }`}
                        >
                          {item.station === "BAR" ? <Wine size={11} aria-hidden="true" /> : <ChefHat size={11} aria-hidden="true" />}
                          {item.station === "BAR" ? "Barra" : "Cocina"}
                        </button>
                      </td>
                      <td>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)] disabled:opacity-40"
                            disabled={busy || item.quantity <= 1}
                            aria-label={`Restar uno de ${item.name}`}
                            onClick={() => onChangeQuantity(item.key, -1)}
                          >
                            <Minus size={11} aria-hidden="true" />
                          </button>
                          <span className="min-w-5 text-center font-semibold tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--floor-border,#cad9df)] bg-white text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)] disabled:opacity-40"
                            disabled={busy || item.quantity >= 99}
                            aria-label={`Sumar uno de ${item.name}`}
                            onClick={() => onChangeQuantity(item.key, 1)}
                          >
                            <Plus size={11} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {amount(item.unitPriceCents * item.quantity)}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className={tableDangerButtonClass}
                            disabled={busy}
                            aria-label={`Quitar ${item.name}`}
                            onClick={() => onRemoveItem(item.key)}
                          >
                            <Trash2 size={12} aria-hidden="true" />Quitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--floor-border,#cad9df)] bg-white px-3 py-2.5">
            <div className="text-xs">
              <span className="text-[var(--floor-muted,#4b6470)]">Total borrador: </span>
              <strong className="text-sm tabular-nums text-[var(--floor-ink,#173642)]">{amount(draftTotalCents)}</strong>
            </div>
            <button
              type="button"
              className={floorPrimaryButtonClass}
              disabled={busy || items.length === 0}
              onClick={onConfirmOrder}
            >
              <Send size={15} aria-hidden="true" />Confirmar pedido y enviar a cocina
            </button>
          </div>
        </>
      )}
    </section>
  );
}
