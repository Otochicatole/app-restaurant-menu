import { Building2, Calendar, Check, Clock, Copy, Edit2, Eye, Globe, Mail, MessageCircle, Phone, Plus, Printer, Sparkles, UserCheck, Users, Utensils } from "lucide-react";
import { adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import { type ReservationStatus } from "../contracts";
import { reservationWorkspace, dialogClosed, dialogOpened, type ActiveReservationDialog } from "./reservation-workspace";
import { openManualReservation, requestReservationStatus } from "./reservation-commands";
import { STATUS_LABEL, formatFriendlyDate, buildWhatsAppLink } from "./reservation-labels";
import { STATUS_BADGE_CLASSES, useReservationClipboard, ReservationWriteError } from "./ReservationUi";

export function ReservationReceipt({ dialog }: { dialog: ActiveReservationDialog & { kind: "receipt" } }) {
  const restaurantName = reservationWorkspace.useSelector((state) => state.data.restaurantName);
  const floorManagementEnabled = reservationWorkspace.useSelector((state) => state.data.floorManagementEnabled);
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const previewReservation = reservationWorkspace.useSelector((state) => state.data.reservations.find(({ id }) => id === dialog.reservationId));
  const { copiedCode, copyToClipboard } = useReservationClipboard();
  const close = () => store.dispatch(dialogClosed(dialog.id));
  const changeStatus = (status: ReservationStatus) => store.dispatch(requestReservationStatus(dialog.reservationId, status));
  if (!previewReservation) return null;
  return (
    <AdminModal
          open={Boolean(previewReservation)}
          title="Comprobante de Reserva"
          description="Vista previa del ticket oficial de reserva y resumen operativo para el salón."
          onClose={() => close()}
        >
          <div className="space-y-4">
            <ReservationWriteError dialogId={dialog.id} />
            {/* Visual Ticket Voucher Card */}
            <div className="relative rounded-2xl border border-zinc-200 bg-linear-to-b from-zinc-50/70 to-white p-5 sm:p-6 shadow-xs overflow-hidden">
              {/* Header with Code and Status */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-200/80 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-0.5">
                    {restaurantName || "Restaurante"} · Comprobante Oficial
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-zinc-950">
                      {previewReservation.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(previewReservation.code, "modal-preview-copy")}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                      title="Copiar código de reserva"
                    >
                      {copiedCode === "modal-preview-copy" ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-xl border ${
                      STATUS_BADGE_CLASSES[previewReservation.status]
                    }`}
                  >
                    {STATUS_LABEL[previewReservation.status]}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                    {previewReservation.source === "LANDING" ? (
                      <>
                        <Globe size={10} className="text-zinc-400" />
                        <span>Landing pública</span>
                      </>
                    ) : (
                      <>
                        <Building2 size={10} className="text-zinc-400" />
                        <span>{previewReservation.source === "WALK_IN" ? "Llegada sin reserva" : "Registrada en Admin"}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Structured Grid of Reservation Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Calendar size={11} className="text-zinc-400" />
                    <span>Fecha</span>
                  </span>
                  <strong className="text-zinc-900 font-bold text-sm block">
                    {formatFriendlyDate(previewReservation.date)}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Clock size={11} className="text-zinc-400" />
                    <span>Turno / Hora</span>
                  </span>
                  <strong className="text-zinc-900 font-bold text-sm block">
                    {previewReservation.time} hs
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Users size={11} className="text-zinc-400" />
                    <span>Comensales</span>
                  </span>
                  <strong className="text-zinc-900 font-bold text-sm block">
                    {previewReservation.partySize} {previewReservation.partySize === 1 ? "persona" : "personas"}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <UserCheck size={11} className="text-zinc-400" />
                    <span>Titular</span>
                  </span>
                  <strong className="text-zinc-900 font-bold block truncate" title={previewReservation.customerName}>
                    {previewReservation.customerName}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Phone size={11} className="text-zinc-400" />
                    <span>Teléfono / WhatsApp</span>
                  </span>
                  <a
                    href={`tel:${previewReservation.customerPhone}`}
                    className="text-zinc-900 font-bold hover:text-emerald-700 block truncate"
                  >
                    {previewReservation.customerPhone}
                  </a>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Mail size={11} className="text-zinc-400" />
                    <span>Email</span>
                  </span>
                  {previewReservation.customerEmail ? (
                    <a
                      href={`mailto:${previewReservation.customerEmail}`}
                      className="text-zinc-900 font-medium hover:text-blue-700 block truncate"
                      title={previewReservation.customerEmail}
                    >
                      {previewReservation.customerEmail}
                    </a>
                  ) : (
                    <span className="text-zinc-400 italic font-normal">No especificado</span>
                  )}
                </div>
              </div>

              {/* Event Banner if tied to an event */}
              {previewReservation.eventId && (
                <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2 text-xs text-purple-950">
                  <Sparkles size={15} className="text-purple-700 shrink-0" />
                  <div>
                    <span className="font-bold">Evento Especial: </span>
                    {previewReservation.eventTitle || "Evento Especial"}
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {previewReservation.notes && (
                <div className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-800 leading-relaxed">
                  <span className="font-bold text-zinc-900 block mb-0.5">Aclaraciones del comensal:</span>
                  {previewReservation.notes}
                </div>
              )}

              {/* Admin Internal Notes */}
              {previewReservation.adminNotes && (
                <div className="mt-3 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-950 leading-relaxed">
                  <span className="font-bold text-blue-900 block mb-0.5">Nota interna del restaurante:</span>
                  {previewReservation.adminNotes}
                </div>
              )}
            </div>

            {/* Action Footer in Preview Modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                {previewReservation.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await changeStatus( "CONFIRMED");
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Check size={14} />
                      <span>Confirmar</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await changeStatus( "REJECTED");
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {previewReservation.status === "CONFIRMED" && (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await changeStatus( "COMPLETED");
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182618] hover:bg-[#101c10] text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Utensils size={13} />
                      <span>{floorManagementEnabled ? "Finalizar y liberar" : "Asistió"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await changeStatus( "CANCELLED");
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </>
                )}

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    store.dispatch(dialogOpened({ kind: "reservation", editing: previewReservation, date: previewReservation.date, time: previewReservation.time }));
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition cursor-pointer flex items-center gap-1"
                  title="Editar datos de esta reserva"
                >
                  <Edit2 size={13} />
                  <span>Editar</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer flex items-center gap-1"
                  title="Imprimir ticket de reserva"
                >
                  <Printer size={13} />
                  <span>Imprimir</span>
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                {/* WhatsApp Action Button */}
                {(() => {
                  const link = buildWhatsAppLink(
                    previewReservation.customerPhone,
                    previewReservation.customerName,
                    restaurantName,
                    previewReservation.date,
                    previewReservation.time,
                    previewReservation.code,
                    previewReservation.partySize,
                  );
                  if (!link) return null;
                  return (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1.5"
                      title="Abrir WhatsApp con datos de reserva"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  );
                })()}

                <button
                  type="button"
                  className={adminSecondaryButtonClass}
                  onClick={() => close()}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </AdminModal>
  );
}

export function ReservationAttendees({ dialog, today }: { dialog: ActiveReservationDialog & { kind: "attendees" }; today: string }) {
  const reservations = reservationWorkspace.useSelector((state) => state.data.reservations);
  const restaurantName = reservationWorkspace.useSelector((state) => state.data.restaurantName);
  const store = reservationWorkspace.useStore();
  const viewingEventAttendees = reservationWorkspace.useSelector((state) => state.data.events.find(({ id }) => id === dialog.eventId));
  const close = () => store.dispatch(dialogClosed(dialog.id));
  if (!viewingEventAttendees) return null;
  return (
    <AdminModal
        open={Boolean(viewingEventAttendees)}
        onClose={() => close()}
        title={
          viewingEventAttendees
            ? `Inscriptos: ${viewingEventAttendees.title}`
            : "Inscriptos al Evento"
        }
        description={
          viewingEventAttendees
            ? `Fecha: ${formatFriendlyDate(viewingEventAttendees.date)} • ${viewingEventAttendees.startTime} hs | Capacidad: ${viewingEventAttendees.capacity} cupos`
            : ""
        }
        wide
      >
        {viewingEventAttendees && (
          <div className="space-y-4 py-2">
            {(() => {
              const attendees = reservations.filter(
                (r) => r.eventId === viewingEventAttendees.id,
              );
              const totalConfirmedSpots = attendees
                .filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED")
                .reduce((acc, r) => acc + r.partySize, 0);

              if (attendees.length === 0) {
                return (
                  <div className="py-10 text-center text-zinc-500 text-sm">
                    No hay personas inscriptas para este evento todavía.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span>
                      Total ocupado:{" "}
                      <strong className="text-zinc-950 font-mono text-sm">
                        {totalConfirmedSpots}
                      </strong>{" "}
                      de {viewingEventAttendees.capacity} lugares
                    </span>
                    <span>
                      Restantes:{" "}
                      <strong className="text-emerald-700 font-mono text-sm">
                        {Math.max(0, viewingEventAttendees.capacity - totalConfirmedSpots)}
                      </strong>
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto pr-1">
                    {attendees.map((att) => {
                      const waLink = buildWhatsAppLink(
                        att.customerPhone,
                        att.customerName,
                        restaurantName,
                        att.date,
                        att.time,
                        att.code,
                        att.partySize,
                      );

                      return (
                        <div
                          key={att.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-zinc-950">
                                {att.customerName}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded-md text-zinc-700 flex items-center gap-1">
                                <Users size={12} className="text-zinc-500" />
                                {att.partySize} {att.partySize === 1 ? "lugar" : "lugares"}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                                  STATUS_BADGE_CLASSES[att.status]
                                }`}
                              >
                                {STATUS_LABEL[att.status]}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                              <span className="font-medium text-zinc-700 flex items-center gap-1">
                                <Phone size={11} className="text-zinc-400" />
                                <span>{att.customerPhone}</span>
                              </span>
                              {att.customerEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail size={11} className="text-zinc-400" />
                                  <span>{att.customerEmail}</span>
                                </span>
                              )}
                              <span className="font-mono text-[11px] text-zinc-400">
                                ({att.code})
                              </span>
                            </div>

                            {att.notes && (
                              <p className="text-xs text-zinc-600 bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                                <span className="font-medium text-zinc-700">Nota: </span>
                                {att.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1"
                              >
                                <MessageCircle size={13} className="text-emerald-700" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                store.dispatch(dialogOpened({ kind: "receipt", reservationId: att.id }));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye size={13} />
                              <span>Comprobante</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  store.dispatch(openManualReservation(today, viewingEventAttendees));
                }}
                className={adminSecondaryButtonClass}
              >
                <Plus size={15} />
                <span>Agregar Inscripción Manual</span>
              </button>

              <button
                type="button"
                className={adminSecondaryButtonClass}
                onClick={() => close()}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </AdminModal>
  );
}
