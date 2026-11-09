import { createAction, createSelector } from "@reduxjs/toolkit";
import { createEditorWorkspace } from "@/ui/editor-workspace";
import type { FloorAssignmentInput } from "@/modules/floor-management/contracts";
import type { ReservationCmsData, ReservationStatus, ReservationView, RestaurantEventView, TimeSlotView } from "../contracts";

type CmsTab = "reservations" | "events" | "shifts" | "closures";
type ViewMode = "cards" | "table";
type Collections = Pick<ReservationCmsData, "reservations" | "events" | "timeSlots" | "recurringClosures" | "blockedDates">;
type Filter = { searchQuery: string; statusFilter: ReservationStatus | "ALL"; typeFilter: "ALL" | "TABLE" | "EVENT"; dateFilter: string };

type Dialog =
  | { kind: "reservation"; editing?: ReservationView; date: string; time: string; eventId?: string }
  | { kind: "assignment"; reservation: ReservationView }
  | { kind: "receipt"; reservationId: string }
  | { kind: "deleteReservation"; reservationId: string }
  | { kind: "event"; editing?: RestaurantEventView; date: string }
  | { kind: "attendees"; eventId: string }
  | { kind: "deleteEvent"; eventId: string }
  | { kind: "slot"; editing?: TimeSlotView };

export type ActiveReservationDialog = Dialog & { id: number };
type Feedback = { type: "success" | "error"; message: string; dialogId: number | null };
type Write = { id: number; dialogId: number | null };

export function reservationSeed(initial: ReservationCmsData) {
  const { restaurantId, restaurantName, restaurantSlug, landingEnabled, floorManagementEnabled, timeZone, reservations, events, timeSlots, recurringClosures, blockedDates } = initial;
  return {
    data: { restaurantId, restaurantName, restaurantSlug, landingEnabled, floorManagementEnabled, timeZone, reservations, events, timeSlots, recurringClosures, blockedDates },
    activeTab: "reservations" as CmsTab,
    viewMode: "cards" as ViewMode,
    filters: { searchQuery: "", statusFilter: "ALL", typeFilter: "ALL", dateFilter: "" } as Filter,
    dialog: null as ActiveReservationDialog | null,
    assignment: null as FloorAssignmentInput | null,
    dialogSequence: 0,
    write: null as Write | null,
    writeSequence: 0,
    feedback: null as Feedback | null,
  };
}

type ReservationWorkspace = ReturnType<typeof reservationSeed>;
export const dialogOpened = createAction<Dialog>("reservations/dialogOpened");
export const dialogClosed = createAction<number>("reservations/dialogClosed");
export const assignmentChanged = createAction<{ dialogId: number; assignment: FloorAssignmentInput | null }>("reservations/assignmentChanged");
export const feedbackChanged = createAction<Feedback | null>("reservations/feedbackChanged");
export const writeStarted = createAction<number | null>("reservations/writeStarted");
export const writeFinished = createAction<{
  id: number;
  reservation?: ReservationView;
  collections?: Partial<Collections>;
  feedback?: Omit<Feedback, "dialogId">;
  closeDialog?: boolean;
}>("reservations/writeFinished");
export const filtersChanged = createAction<Partial<Filter>>("reservations/filtersChanged");
export const agendaOpened = createAction<Partial<Filter> | undefined>("reservations/agendaOpened");

export const reservationWorkspace = createEditorWorkspace<ReservationWorkspace>("reservations", (builder) => {
  builder
    .addCase(dialogOpened, (state, { payload }) => {
      state.dialog = { ...payload, id: ++state.dialogSequence };
      state.assignment = null;
      state.feedback = null;
    })
    .addCase(dialogClosed, (state, { payload }) => {
      if (state.dialog?.id !== payload || state.write?.dialogId === payload) return;
      state.dialog = null;
      state.assignment = null;
    })
    .addCase(assignmentChanged, (state, { payload }) => {
      if (state.dialog?.id === payload.dialogId) state.assignment = payload.assignment;
    })
    .addCase(feedbackChanged, (state, { payload }) => { state.feedback = payload; })
    .addCase(writeStarted, (state, { payload }) => {
      if (state.write) return;
      state.write = { id: ++state.writeSequence, dialogId: payload };
      state.feedback = null;
    })
    .addCase(writeFinished, (state, { payload }) => {
      if (state.write?.id !== payload.id) return;
      const { dialogId } = state.write;
      state.write = null;
      if (payload.collections) Object.assign(state.data, payload.collections);
      const reservation = payload.reservation;
      if (reservation?.restaurantId === state.data.restaurantId) {
        const index = state.data.reservations.findIndex(({ id }) => id === reservation.id);
        if (index < 0) state.data.reservations.unshift(reservation);
        else if (state.data.reservations[index].revision <= reservation.revision) state.data.reservations[index] = reservation;
      }
      if (payload.closeDialog && state.dialog?.id === dialogId) {
        state.dialog = null;
        state.assignment = null;
      }
      if (payload.feedback && (payload.feedback.type === "success" || dialogId === null || state.dialog?.id === dialogId)) {
        state.feedback = { ...payload.feedback, dialogId };
      }
    })
    .addCase(filtersChanged, (state, { payload }) => { Object.assign(state.filters, payload); })
    .addCase(agendaOpened, (state, { payload }) => {
      state.activeTab = "reservations";
      state.filters = { searchQuery: "", statusFilter: "ALL", typeFilter: "ALL", dateFilter: "", ...payload };
    });
});

const selectReservations = (state: ReservationWorkspace) => state.data.reservations;
export const selectFilteredReservations = createSelector(
  [selectReservations, (state: ReservationWorkspace) => state.filters],
  (reservations, { dateFilter, statusFilter, typeFilter, searchQuery }) => {
    const query = searchQuery.trim().toLowerCase();
    return reservations.filter((reservation) =>
      (statusFilter === "ALL" || reservation.status === statusFilter)
      && (typeFilter === "ALL" || Boolean(reservation.eventId) === (typeFilter === "EVENT"))
      && (!dateFilter || reservation.date === dateFilter)
      && (!query || [reservation.customerName, reservation.customerPhone, reservation.code, reservation.eventTitle]
        .some((value) => value?.toLowerCase().includes(query))),
    );
  },
);

export const selectReservationCounts = createSelector(
  [selectReservations, (_state: ReservationWorkspace, today: string) => today],
  (reservations, today) => {
    let reservationsCount = 0;
    let dinersCount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    for (const reservation of reservations) {
      if (reservation.status === "PENDING") pendingCount += 1;
      if (reservation.status === "CONFIRMED") confirmedCount += 1;
      if (reservation.date === today && reservation.status !== "CANCELLED" && reservation.status !== "REJECTED") {
        reservationsCount += 1;
        dinersCount += reservation.partySize;
      }
    }
    return { reservationsCount, dinersCount, pendingCount, confirmedCount };
  },
);

export const selectEventOccupancy = createSelector(
  [selectReservations, (state: ReservationWorkspace) => state.data.floorManagementEnabled],
  (reservations, floorManagementEnabled) => {
    const dinersByEvent: Record<string, number> = Object.create(null);
    for (const { eventId, status, partySize } of reservations) {
      if (eventId && (status === "CONFIRMED" || status === "COMPLETED" || (status === "PENDING" && !floorManagementEnabled))) {
        dinersByEvent[eventId] = (dinersByEvent[eventId] ?? 0) + partySize;
      }
    }
    return dinersByEvent;
  },
);
