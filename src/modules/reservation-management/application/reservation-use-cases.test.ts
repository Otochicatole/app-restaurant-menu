import { describe, expect, it, vi } from "vitest";
import { ReservationManagementService } from "./reservation-use-cases";
import type { ReservationRepositoryPort } from "./ports";
import type {
  BlockedDateView,
  RecurringClosureView,
  ReservationView,
  RestaurantEventView,
  TimeSlotView,
} from "../contracts";

function createMockRepo(overrides: Partial<ReservationRepositoryPort> = {}): ReservationRepositoryPort {
  const defaultSlots: TimeSlotView[] = [
    { id: "s1", tenantId: "t1", time: "13:00", label: "Almuerzo", active: true, sortOrder: 0, createdAt: "", updatedAt: "" },
    { id: "s2", tenantId: "t1", time: "20:00", label: "Cena", active: true, sortOrder: 1, createdAt: "", updatedAt: "" },
  ];
  const defaultClosures: RecurringClosureView[] = [];
  const defaultBlockedDates: BlockedDateView[] = [];
  const defaultEvents: RestaurantEventView[] = [];
  const defaultReservations: ReservationView[] = [];

  return {
    isLandingEnabled: vi.fn().mockResolvedValue(true),
    getTenantPublicContext: vi.fn().mockResolvedValue({
      tenantId: "t1",
      name: "Bistró Test",
      slug: "bistro-test",
      landingEnabled: true,
    }),
    getTimeSlots: vi.fn().mockResolvedValue(defaultSlots),
    upsertTimeSlot: vi.fn(),
    deleteTimeSlot: vi.fn(),
    getRecurringClosures: vi.fn().mockResolvedValue(defaultClosures),
    setRecurringClosures: vi.fn(),
    getBlockedDates: vi.fn().mockResolvedValue(defaultBlockedDates),
    addBlockedDate: vi.fn(),
    removeBlockedDate: vi.fn(),
    getEvents: vi.fn().mockResolvedValue(defaultEvents),
    upsertEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getReservations: vi.fn().mockResolvedValue(defaultReservations),
    getReservationById: vi.fn(),
    createReservation: vi.fn().mockImplementation((tenantId, cmd, code) =>
      Promise.resolve({
        id: "res-new",
        tenantId,
        code,
        customerName: cmd.customerName,
        customerEmail: cmd.customerEmail || "",
        customerPhone: cmd.customerPhone,
        partySize: cmd.partySize,
        date: cmd.date,
        time: cmd.time,
        notes: cmd.notes || "",
        adminNotes: cmd.adminNotes || "",
        status: cmd.status,
        source: cmd.source,
        eventId: cmd.eventId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ),
    updateReservation: vi.fn(),
    updateReservationStatus: vi.fn(),
    deleteReservation: vi.fn(),
    ...overrides,
  };
}

describe("ReservationManagementService", () => {
  it("rejects public reservations if landingEnabled is false", async () => {
    const repo = createMockRepo({
      getTenantPublicContext: vi.fn().mockResolvedValue({
        tenantId: "t1",
        name: "Bistró Test",
        slug: "bistro-test",
        landingEnabled: false,
      }),
    });
    const service = new ReservationManagementService(repo);

    await expect(
      service.createPublicReservation("bistro-test", {
        customerName: "Juan Pérez",
        customerEmail: "",
        customerPhone: "+5491112345678",
        partySize: 2,
        date: "2099-01-01",
        time: "13:00",
        notes: "",
      }),
    ).rejects.toThrow("Las reservas no están habilitadas para este restaurante");
  });

  it("creates public reservation with PENDING status and generated code", async () => {
    const repo = createMockRepo();
    const service = new ReservationManagementService(repo);

    const created = await service.createPublicReservation("bistro-test", {
      customerName: "Juan Pérez",
      customerEmail: "juan@test.com",
      customerPhone: "+5491112345678",
      partySize: 2,
      date: "2099-01-01",
      time: "13:00",
      notes: "Cerca de ventana",
    });

    expect(created.status).toBe("PENDING");
    expect(created.code).toMatch(/^RES-[A-Z0-9]{5}$/);
    expect(created.customerName).toBe("Juan Pérez");
    expect(repo.createReservation).toHaveBeenCalled();
  });

  it("allows multiple reservations at the same time slot and rejects unconfigured time slots", async () => {
    const existingReservations: ReservationView[] = [
      {
        id: "r1",
        tenantId: "t1",
        code: "RES-EXIST",
        customerName: "Pedro",
        customerEmail: "",
        customerPhone: "123",
        partySize: 2,
        date: "2099-01-01",
        time: "13:00",
        notes: "",
        adminNotes: "",
        status: "CONFIRMED",
        source: "LANDING",
        eventId: null,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const repo = createMockRepo({
      getReservations: vi.fn().mockResolvedValue(existingReservations),
    });
    const service = new ReservationManagementService(repo);

    // Another client booking the same time slot (13:00) succeeds!
    const secondBooking = await service.createPublicReservation("bistro-test", {
      customerName: "Otro Cliente",
      customerEmail: "",
      customerPhone: "+5491112345678",
      partySize: 2,
      date: "2099-01-01",
      time: "13:00",
      notes: "",
    });
    expect(secondBooking.customerName).toBe("Otro Cliente");
    expect(secondBooking.time).toBe("13:00");

    // Requesting an unconfigured slot (e.g. 04:00) throws ConflictError
    await expect(
      service.createPublicReservation("bistro-test", {
        customerName: "Cliente Horario Invalido",
        customerEmail: "",
        customerPhone: "+5491112345678",
        partySize: 2,
        date: "2099-01-01",
        time: "04:00",
        notes: "",
      }),
    ).rejects.toThrow("El horario seleccionado ya no está disponible");
  });

  it("returns CMS data with calculated summary metrics", async () => {
    const repo = createMockRepo({
      getReservations: vi.fn().mockResolvedValue([
        { id: "1", status: "PENDING", date: "2099-01-01" },
        { id: "2", status: "CONFIRMED", date: "2099-01-01" },
      ] as ReservationView[]),
    });
    const service = new ReservationManagementService(repo);

    const cmsData = await service.getCmsData("t1");
    expect(cmsData.summary.pendingReservationsCount).toBe(1);
    expect(cmsData.summary.confirmedReservationsCount).toBe(1);
    expect(cmsData.summary.activeTimeSlotsCount).toBe(2);
  });
});
