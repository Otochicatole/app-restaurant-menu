/** @vitest-environment jsdom */
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { FloorAssignmentInput } from "@/modules/floor-management/contracts";
import type { ReservationCmsData, ReservationView, RestaurantEventView } from "../contracts";

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
const event: RestaurantEventView = { id: "event", restaurantId: "restaurant", title: "Cena especial", description: "", date: "2030-11-03", startTime: "21:30", endTime: "23:00",
  capacity: 10, priceLabel: "", imageUrl: "", blocksRegularReservations: false, status: "PUBLISHED", createdAt: reservation.createdAt, updatedAt: reservation.updatedAt };
function data(value = reservation, enabled = true): ReservationCmsData {
  return { restaurantId: "restaurant", restaurantName: "Bistró", restaurantSlug: "bistro", landingEnabled: true, floorManagementEnabled: enabled, timeZone: "America/Argentina/Buenos_Aires",
    timeSlots: [{ id: "slot", restaurantId: "restaurant", time: "20:00", label: "Cena", active: true, sortOrder: 0, createdAt: reservation.createdAt, updatedAt: reservation.updatedAt }],
    recurringClosures: [], blockedDates: [], events: [], reservations: [value],
    summary: { totalReservationsToday: 0, confirmedReservationsCount: value.status === "CONFIRMED" ? 1 : 0, pendingReservationsCount: value.status === "PENDING" ? 1 : 0, activeEventsCount: 0, activeTimeSlotsCount: 1 } };
}

describe("reservation floor confirmation flow", () => {
  beforeEach(() => { vi.resetAllMocks(); actions.updateReservationStatusAction.mockResolvedValue({ success: true, data: { ...reservation, status: "CONFIRMED", revision: 4 } }); });
  afterEach(cleanup);

  it.each(["agenda", "tabla"])("asks for an assignment before sending a pending confirmation from %s", async (view) => {
    render(createElement(ReservationCmsScreen, { initialData: data({ ...reservation, adminNotes: "Sector preferido: Ventana · Salón principal" }) }));
    if (view === "tabla") fireEvent.click(screen.getByRole("button", { name: "Vista tabla" }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar$/ }));
    const modal = screen.getByRole("dialog", { name: "Confirmar reserva TEST" });
    expect(within(modal).getByText("Ventana · Salón principal")).toBeTruthy();
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
    actions.updateReservationStatusAction.mockResolvedValue({ success: true, data: { ...reservation, status: "CONFIRMED", revision: 4 } });
    fireEvent.click(within(modal).getByRole("button", { name: "Confirmar y asignar mesas" }));
    await waitFor(() => expect(actions.updateReservationStatusAction).toHaveBeenCalledTimes(2));
    expect(actions.updateReservationStatusAction).toHaveBeenLastCalledWith("restaurant", "reservation", "CONFIRMED", { assignment, expectedRevision: 3 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("prefills a manual signup from attendees and refreshes occupancy after saving", async () => {
    actions.createAdminReservationAction.mockResolvedValue({ success: true, data: {
      ...reservation, customerName: "Manuel Ruiz", status: "CONFIRMED", eventId: event.id, date: event.date, time: event.startTime,
    } });
    render(createElement(ReservationCmsScreen, { initialData: { ...data(reservation, false), events: [event] } }));
    fireEvent.click(screen.getByRole("button", { name: /^Eventos$/ }));
    expect(screen.getByText("0 de 10 lugares")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver inscriptos" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Inscripción Manual" }));
    const modal = within(screen.getByRole("dialog", { name: "Nueva Reserva Manual" }));
    expect((modal.getByLabelText("Fecha") as HTMLInputElement).value).toBe(event.date);
    expect((modal.getByRole("combobox", { name: "Horario" }) as HTMLSelectElement).value).toBe(event.startTime);
    expect((modal.getByRole("combobox", { name: "Tipo de reserva" }) as HTMLSelectElement).value).toBe(event.id);
    fireEvent.change(modal.getByRole("textbox", { name: "Nombre y apellido" }), { target: { value: "Manuel Ruiz" } });
    fireEvent.change(modal.getByRole("textbox", { name: "Teléfono / WhatsApp" }), { target: { value: "12345678" } });
    fireEvent.click(modal.getByRole("button", { name: "Crear reserva" }));
    await waitFor(() => expect(actions.createAdminReservationAction).toHaveBeenCalledWith("restaurant", expect.objectContaining({ eventId: event.id, date: event.date, time: event.startTime })));
    await waitFor(() => expect(screen.getByText("2 de 10 lugares")).toBeTruthy());
  });

  it("keeps edited fields and the selected assignment when a save fails", async () => {
    const confirmed = { ...reservation, status: "CONFIRMED" as const };
    actions.updateReservationAction.mockResolvedValue({ success: false, error: { code: "CONFLICT", message: "Revisá la asignación." } });
    render(createElement(ReservationCmsScreen, { initialData: data(confirmed) }));
    fireEvent.click(screen.getByTitle("Editar reserva"));
    const modal = within(screen.getByRole("dialog", { name: "Modificar Reserva" }));
    const name = modal.getByRole("textbox", { name: "Nombre y apellido" }) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Ana Actualizada" } });
    fireEvent.click(modal.getByRole("button", { name: "Elegir mesa de prueba" }));
    const save = modal.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement;
    fireEvent.click(save);
    await waitFor(() => expect(modal.getByRole("alert").textContent).toBe("Revisá la asignación."));
    expect(name.value).toBe("Ana Actualizada");
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(actions.updateReservationAction).toHaveBeenCalledTimes(2));
    expect(actions.updateReservationAction).toHaveBeenLastCalledWith("restaurant", expect.objectContaining({ customerName: "Ana Actualizada", assignment, expectedRevision: 3 }));
  });

  it("lets an existing confirmed reservation be assigned before activation", async () => {
    const confirmed = { ...reservation, status: "CONFIRMED" as const };
    actions.updateReservationAction.mockResolvedValue({ success: true, data: { ...confirmed, revision: 4 } });
    render(createElement(ReservationCmsScreen, { initialData: data(confirmed, false) }));
    fireEvent.click(screen.getByTitle("Editar reserva"));
    const modal = screen.getByRole("dialog", { name: "Modificar Reserva" });
    fireEvent.click(within(modal).getByRole("button", { name: "Asignar mesas antes de activar salones" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Elegir mesa de prueba" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(actions.updateReservationAction).toHaveBeenCalledWith("restaurant", expect.objectContaining({ assignment, expectedRevision: 3, status: "CONFIRMED" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("starts with a clean agenda and assignment when changing restaurants", () => {
    const view = render(createElement(ReservationCmsScreen, { initialData: data() }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar reservas" }), { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar$/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    view.rerender(createElement(ReservationCmsScreen, {
      initialData: { ...data(), restaurantId: "other", reservations: [] },
    }));
    expect((screen.getByRole("searchbox", { name: "Buscar reservas" }) as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Todavía no hay reservas")).toBeTruthy();
  });
});
