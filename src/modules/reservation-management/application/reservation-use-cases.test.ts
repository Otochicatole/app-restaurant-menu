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
    { id: "s1", restaurantId: "t1", time: "13:00", label: "Almuerzo", active: true, sortOrder: 0, createdAt: "", updatedAt: "" },
    { id: "s2", restaurantId: "t1", time: "20:00", label: "Cena", active: true, sortOrder: 1, createdAt: "", updatedAt: "" },
  ];
  const defaultClosures: RecurringClosureView[] = [];
  const defaultBlockedDates: BlockedDateView[] = [];
  const defaultEvents: RestaurantEventView[] = [];
  const defaultReservations: ReservationView[] = [];

  return {
    isLandingEnabled: vi.fn().mockResolvedValue(true),
    getRestaurantInfo: vi.fn().mockResolvedValue({
      name: "Bistró Test",
      landingSlug: "bistro-test",
    }),
    getRestaurantPublicContext: vi.fn().mockResolvedValue({
      restaurantId: "t1",
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
    getEventById: vi.fn().mockResolvedValue(null),
    getAvailabilityEvents: vi.fn().mockResolvedValue(defaultEvents),
    upsertEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getReservations: vi.fn().mockResolvedValue(defaultReservations),
    getReservationById: vi.fn(),
    createReservation: vi.fn().mockImplementation((restaurantId, cmd, code) =>
      Promise.resolve({
        id: "res-new",
        restaurantId,
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
  const publicCommand = {
    customerName: "Juan Pérez", customerEmail: "", customerPhone: "1112345678",
    partySize: 2, date: "2099-01-01", time: "13:00", notes: "",
  };
  const event = (overrides: Partial<RestaurantEventView> = {}): RestaurantEventView => ({
    id: "event-a", restaurantId: "t1", title: "Cena show", description: "Jazz en vivo",
    date: "2099-01-04", startTime: "21:00", endTime: "23:00", capacity: 2,
    priceLabel: "$100", imageUrl: "https://example.com/show.jpg", blocksRegularReservations: false,
    status: "PUBLISHED", createdAt: "", updatedAt: "", ...overrides,
  });

  it("hides missing restaurants before reading private availability data or creating reservations", async () => {
    const repo = createMockRepo({ getRestaurantPublicContext: vi.fn().mockResolvedValue(null) });
    const service = new ReservationManagementService(repo);
    await expect(service.getPublicAvailability("unknown", {})).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.createPublicReservation("unknown", publicCommand)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.createPublicEventReservation("unknown", { ...publicCommand, eventId: "event-a" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.getReservations).not.toHaveBeenCalled();
    expect(repo.createReservation).not.toHaveBeenCalled();
  });

  it("blocks both the CMS and public availability when reservations are disabled", async () => {
    const repo = createMockRepo({
      isLandingEnabled: vi.fn().mockResolvedValue(false),
      getRestaurantPublicContext: vi.fn().mockResolvedValue({ restaurantId: "t1", name: "Resto", slug: "resto", landingEnabled: false }),
    });
    const service = new ReservationManagementService(repo);
    await expect(service.getCmsData("t1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.getPublicAvailability("resto", {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.createPublicEventReservation("resto", { ...publicCommand, eventId: "event-a" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.getReservations).not.toHaveBeenCalled();
  });

  it("rejects past reservation dates without consulting availability or writing a booking", async () => {
    const repo = createMockRepo();
    await expect(new ReservationManagementService(repo).createPublicReservation("bistro-test", { ...publicCommand, date: "2000-01-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(repo.getTimeSlots).not.toHaveBeenCalled();
    expect(repo.createReservation).not.toHaveBeenCalled();
  });

  it("rejects an event from another restaurant and an unpublished event", async () => {
    const repo = createMockRepo({
      getEventById: vi.fn().mockImplementation((_restaurantId, id) => Promise.resolve(id === "event-a" ? event({ status: "DRAFT" }) : null)),
    });
    const service = new ReservationManagementService(repo);
    for (const eventId of ["other-restaurant-event", "event-a"]) {
      await expect(service.createPublicEventReservation("bistro-test", { ...publicCommand, eventId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(service.createPublicReservation("bistro-test", { ...publicCommand, eventId: "other-restaurant-event" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.createReservation).not.toHaveBeenCalled();
  });

  it("uses the published event's date and start time when creating its reservation", async () => {
    const repo = createMockRepo({
      getEventById: vi.fn().mockResolvedValue(event()),
      getAvailabilityEvents: vi.fn().mockResolvedValue([event()]),
    });
    const service = new ReservationManagementService(repo);
    const created = await service.createPublicEventReservation("bistro-test", { ...publicCommand, eventId: "event-a" });
    expect(created).toMatchObject({ restaurantId: "t1", eventId: "event-a", date: "2099-01-04", time: "21:00", status: "PENDING", source: "LANDING", adminNotes: "" });
    expect((await service.getPublicEvents("bistro-test")).events[0]).toMatchObject({ id: "event-a", remainingSpots: 2 });
  });

  it("rejects a fully booked event and releases capacity after cancellation", async () => {
    const repo = createMockRepo({
      getEventById: vi.fn().mockResolvedValue(event()),
      getAvailabilityEvents: vi.fn().mockResolvedValue([{ ...event(), occupiedSpots: 2 }]),
    });
    const service = new ReservationManagementService(repo);
    await expect(service.createPublicEventReservation("bistro-test", { ...publicCommand, eventId: "event-a" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repo.createReservation).not.toHaveBeenCalled();
    vi.mocked(repo.getAvailabilityEvents).mockResolvedValue([{ ...event(), occupiedSpots: 0 }]);
    await expect(service.createPublicEventReservation("bistro-test", { ...publicCommand, eventId: "event-a" })).resolves.toMatchObject({ eventId: "event-a" });
  });

  it("combines inactive shifts, blocked dates and weekly closures into public availability", async () => {
    const blockedDate = "2099-01-02";
    const weeklyDate = "2099-01-03";
    const repo = createMockRepo({
      getTimeSlots: vi.fn().mockResolvedValue([{ id: "inactive", restaurantId: "t1", time: "13:00", label: "", active: false, sortOrder: 0, createdAt: "", updatedAt: "" }, { id: "active", restaurantId: "t1", time: "20:00", label: "Cena", active: true, sortOrder: 1, createdAt: "", updatedAt: "" }]),
      getBlockedDates: vi.fn().mockResolvedValue([{ id: "b1", restaurantId: "t1", date: blockedDate, reason: "Reformas", createdAt: "", updatedAt: "" }]),
      getRecurringClosures: vi.fn().mockResolvedValue([{ id: "c1", restaurantId: "t1", dayOfWeek: new Date(`${weeklyDate}T00:00:00Z`).getUTCDay(), reason: "Descanso", createdAt: "", updatedAt: "" }]),
    });
    const service = new ReservationManagementService(repo);
    const result = await service.getPublicTableAvailability("bistro-test", { from: "2099-01-01", to: "2099-01-03" });
    expect(result.dates[0]?.availableSlots.map((slot) => slot.time)).toEqual(["20:00"]);
    expect(result.dates[1]).toMatchObject({ date: blockedDate, available: false, reason: "Reformas" });
    expect(result.dates[2]).toMatchObject({ date: weeklyDate, available: false, reason: "Descanso" });
    await expect(service.createPublicTableReservation("bistro-test", { ...publicCommand, date: blockedDate })).rejects.toThrow("Reformas");
  });

  it("clamps past availability requests to today and limits excessively long ranges", async () => {
    const service = new ReservationManagementService(createMockRepo());
    const today = new Date().toISOString().slice(0, 10);
    const clamped = await service.getPublicAvailability("bistro-test", { from: "2000-01-01", to: "2099-12-31" });
    expect(clamped.from).toBe(today);
    expect(clamped.dates).toHaveLength(120);
    const defaultRange = await service.getPublicAvailability("bistro-test", {});
    expect(defaultRange.dates).toHaveLength(61);
    await expect(service.getPublicAvailability("bistro-test", { from: "2099-02-01", to: "2099-01-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("uses minimal event aggregates for public availability without loading customer history", async () => {
    const repo = createMockRepo({ getAvailabilityEvents: vi.fn().mockResolvedValue([{ ...event({ capacity: 5 }), occupiedSpots: 3 }]) });
    const result = await new ReservationManagementService(repo).getPublicAvailability("bistro-test", { from: "2099-01-01", to: "2099-01-10" });
    expect(result.events[0].remainingSpots).toBe(2);
    expect(repo.getAvailabilityEvents).toHaveBeenCalledWith("t1", { from: "2099-01-01", to: "2099-01-10" });
    expect(repo.getEvents).not.toHaveBeenCalled();
    expect(repo.getReservations).not.toHaveBeenCalled();
  });

  it("canonicalizes generic event requests and rejects a party larger than remaining capacity", async () => {
    const repo = createMockRepo({
      getEventById: vi.fn().mockResolvedValue(event({ capacity: 3 })),
      getAvailabilityEvents: vi.fn().mockResolvedValue([{ ...event({ capacity: 3 }), occupiedSpots: 2 }]),
    });
    const service = new ReservationManagementService(repo);
    await expect(service.createPublicReservation("bistro-test", { ...publicCommand, eventId: "event-a" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repo.createReservation).not.toHaveBeenCalled();
    const created = await service.createPublicReservation("bistro-test", { ...publicCommand, eventId: "event-a", partySize: 1, date: "2099-12-31", time: "04:00" });
    expect(created).toMatchObject({ date: "2099-01-04", time: "21:00" });
    vi.mocked(repo.getEventById).mockResolvedValue(event({ date: "2000-01-01" }));
    await expect(service.createPublicReservation("bistro-test", { ...publicCommand, eventId: "event-a" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("queries every CMS dataset using the selected restaurant", async () => {
    const repo = createMockRepo();
    await new ReservationManagementService(repo).getCmsData("restaurant-b");
    for (const method of [repo.getRestaurantInfo, repo.getTimeSlots, repo.getRecurringClosures, repo.getBlockedDates, repo.getEvents, repo.getReservations]) {
      expect(method).toHaveBeenCalledWith("restaurant-b");
    }
  });

  it("creates public reservations in the restaurant resolved from its landing slug", async () => {
    const repo = createMockRepo({
      getRestaurantPublicContext: vi.fn().mockResolvedValue({
        restaurantId: "restaurant-b", name: "Sucursal B", slug: "sucursal-b", landingEnabled: true,
      }),
    });
    await new ReservationManagementService(repo).createPublicTableReservation("sucursal-b", {
      customerName: "Juan Pérez", customerEmail: "", customerPhone: "1112345678",
      partySize: 2, date: "2099-01-01", time: "13:00", notes: "",
    });
    expect(repo.createReservation).toHaveBeenCalledWith("restaurant-b", expect.any(Object), expect.any(String));
    expect(repo.getAvailabilityEvents).toHaveBeenCalledWith("restaurant-b", { from: "2099-01-01", to: "2099-01-01" });
    expect(repo.getReservations).not.toHaveBeenCalled();
  });

  it("rejects public reservations if landingEnabled is false", async () => {
    const repo = createMockRepo({
      getRestaurantPublicContext: vi.fn().mockResolvedValue({
        restaurantId: "t1",
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
        restaurantId: "t1",
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
    expect(cmsData.restaurantId).toBe("t1");
    expect(cmsData.restaurantName).toBe("Bistró Test");
    expect(cmsData.restaurantSlug).toBe("bistro-test");
    expect(cmsData.summary.pendingReservationsCount).toBe(1);
    expect(cmsData.summary.confirmedReservationsCount).toBe(1);
    expect(cmsData.summary.activeTimeSlotsCount).toBe(2);
  });
});
