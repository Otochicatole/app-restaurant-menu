/** @vitest-environment jsdom */
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { FloorAssignmentInput } from "@/modules/floor-management/contracts";
import type { ReservationCmsData, ReservationView } from "../contracts";

const actions = vi.hoisted(() => ({
  addBlockedDateAction: vi.fn(), createAdminReservationAction: vi.fn(), deleteReservationAction: vi.fn(), deleteRestaurantEventAction: vi.fn(),
  deleteTimeSlotAction: vi.fn(), removeBlockedDateAction: vi.fn(), setRecurringClosuresAction: vi.fn(), updateReservationAction: vi.fn(),
  updateReservationStatusAction: vi.fn(), upsertRestaurantEventAction: vi.fn(), upsertTimeSlotAction: vi.fn(),
}));
vi.mock("./actions", () => actions);
const assignment: FloorAssignmentInput = { roomId: "room", optionId: "table:one", x: 200, y: 200, rotation: 0, expectedRoomRevision: 2 };
vi.mock("@/modules/floor-management/ui", () => ({
  FloorAssignmentPicker: ({ onChange }: { onChange: (value: FloorAssignmentInput) => void }) => createElement("button", { type: "button", onClick: () => onChange(assignment) }, "Elegir mesa de prueba"),
  FloorRoomSelector: () => null,
}));
import { ReservationCmsScreen } from "./ReservationCmsScreen";

const reservation: ReservationView = { id: "reservation", restaurantId: "restaurant", code: "TEST", customerName: "Ana Pérez", customerEmail: "", customerPhone: "12345678", partySize: 2,
  date: "2030-11-01", time: "20:00", notes: "", adminNotes: "", status: "PENDING", source: "LANDING", eventId: null,
  createdAt: "2026-10-29T12:00:00Z", updatedAt: "2026-10-29T12:00:00Z", revision: 3 };
function data(value = reservation, enabled = true): ReservationCmsData {
  return { restaurantId: "restaurant", restaurantName: "Bistró", restaurantSlug: "bistro", landingEnabled: true, floorManagementEnabled: enabled, timeZone: "America/Argentina/Buenos_Aires",
    timeSlots: [{ id: "slot", restaurantId: "restaurant", time: "20:00", label: "Cena", active: true, sortOrder: 0, createdAt: reservation.createdAt, updatedAt: reservation.updatedAt }],
    recurringClosures: [], blockedDates: [], events: [], reservations: [value],
    summary: { totalReservationsToday: 0, confirmedReservationsCount: value.status === "CONFIRMED" ? 1 : 0, pendingReservationsCount: value.status === "PENDING" ? 1 : 0, activeEventsCount: 0, activeTimeSlotsCount: 1 } };
}

describe("reservation floor confirmation flow", () => {
  beforeEach(() => { vi.resetAllMocks(); actions.updateReservationStatusAction.mockResolvedValue({ success: true, data: { ...reservation, status: "CONFIRMED", revision: 4 } }); });
  afterEach(cleanup);

  it("asks for an assignment before sending a pending confirmation", async () => {
    render(createElement(ReservationCmsScreen, { initialData: data() }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar$/ }));
    const modal = screen.getByRole("dialog", { name: "Confirmar reserva TEST" });
    expect(actions.updateReservationStatusAction).not.toHaveBeenCalled();
    expect((within(modal).getByRole("button", { name: "Confirmar y asignar mesas" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(modal).getByRole("button", { name: "Elegir mesa de prueba" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Confirmar y asignar mesas" }));
    await waitFor(() => expect(actions.updateReservationStatusAction).toHaveBeenCalledWith("restaurant", "reservation", "CONFIRMED", { assignment, expectedRevision: 3 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps a rejected confirmation pending and shows the conflict inside the assignment panel", async () => {
    actions.updateReservationStatusAction.mockResolvedValue({ success: false, error: { code: "CONFLICT", message: "La mesa ya fue asignada." } });
    render(createElement(ReservationCmsScreen, { initialData: data() }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar$/ }));
    const modal = screen.getByRole("dialog");
    fireEvent.click(within(modal).getByRole("button", { name: "Elegir mesa de prueba" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Confirmar y asignar mesas" }));
    await waitFor(() => expect(within(modal).getByRole("alert").textContent).toContain("La mesa ya fue asignada."));
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  });

  it("lets an existing confirmed reservation be assigned before activation", async () => {
    const confirmed = { ...reservation, status: "CONFIRMED" as const };
    actions.updateReservationAction.mockResolvedValue({ success: true, data: { ...confirmed, revision: 4 } });
    render(createElement(ReservationCmsScreen, { initialData: data(confirmed, false) }));
    fireEvent.click(screen.getByTitle("Editar reserva"));
    const modal = screen.getByRole("dialog", { name: "Modificar Reserva" });
    fireEvent.click(within(modal).getByRole("button", { name: "Asignar mesas antes de activar salones" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Elegir mesa de prueba" }));
    fireEvent.submit(modal.querySelector("form")!);
    await waitFor(() => expect(actions.updateReservationAction).toHaveBeenCalledWith("restaurant", expect.objectContaining({ assignment, expectedRevision: 3, status: "CONFIRMED" })));
  });
});
