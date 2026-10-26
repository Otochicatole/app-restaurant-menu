import { describe, expect, it } from "vitest";
import {
  computeAvailability,
  getDayOfWeekFromIsoDate,
  isOccupyingReservation,
  type DomainBlockedDate,
  type DomainRecurringClosure,
  type DomainReservation,
  type DomainRestaurantEvent,
  type DomainTimeSlot,
} from "./availability-engine";

describe("availability-engine", () => {
  const sampleSlots: DomainTimeSlot[] = [
    { id: "slot-1", time: "13:00", label: "Almuerzo" },
    { id: "slot-2", time: "20:00", label: "Cena 1" },
    { id: "slot-3", time: "22:00", label: "Cena 2" },
  ];

  it("getDayOfWeekFromIsoDate returns correct day of week", () => {
    // 2026-10-22 is Thursday (4)
    expect(getDayOfWeekFromIsoDate("2026-10-22")).toBe(4);
    // 2026-10-25 is Sunday (0)
    expect(getDayOfWeekFromIsoDate("2026-10-25")).toBe(0);
    // 2026-10-26 is Monday (1)
    expect(getDayOfWeekFromIsoDate("2026-10-26")).toBe(1);
  });

  it("isOccupyingReservation identifies blocking statuses", () => {
    expect(isOccupyingReservation("PENDING")).toBe(true);
    expect(isOccupyingReservation("CONFIRMED")).toBe(true);
    expect(isOccupyingReservation("COMPLETED")).toBe(true);
    expect(isOccupyingReservation("CANCELLED")).toBe(false);
    expect(isOccupyingReservation("REJECTED")).toBe(false);
  });

  it("keeps regular table reservation slots available even when reservations exist", () => {
    const reservations: DomainReservation[] = [
      {
        id: "r1",
        date: "2026-10-24",
        time: "20:00",
        status: "CONFIRMED",
        partySize: 2,
      },
    ];

    const result = computeAvailability({
      dates: ["2026-10-24"],
      activeSlots: sampleSlots,
      recurringClosures: [],
      blockedDates: [],
      events: [],
      reservations,
    });

    const day = result.dates[0];
    expect(day.available).toBe(true);
    expect(day.status).toBe("AVAILABLE");
    expect(day.totalSlots).toBe(3);
    // Time slots do NOT get blocked because restaurants seat multiple parties at the same hour
    expect(day.occupiedTimes).toEqual([]);
    expect(day.availableSlots).toEqual([
      { id: "slot-1", time: "13:00", label: "Almuerzo" },
      { id: "slot-2", time: "20:00", label: "Cena 1" },
      { id: "slot-3", time: "22:00", label: "Cena 2" },
    ]);
  });

  it("keeps the date available when multiple reservations exist at all slots", () => {
    const reservations: DomainReservation[] = [
      { id: "r1", date: "2026-10-24", time: "13:00", status: "PENDING", partySize: 2 },
      { id: "r2", date: "2026-10-24", time: "20:00", status: "CONFIRMED", partySize: 4 },
      { id: "r3", date: "2026-10-24", time: "22:00", status: "PENDING", partySize: 2 },
    ];

    const result = computeAvailability({
      dates: ["2026-10-24"],
      activeSlots: sampleSlots,
      recurringClosures: [],
      blockedDates: [],
      events: [],
      reservations,
    });

    const day = result.dates[0];
    expect(day.available).toBe(true);
    expect(day.status).toBe("AVAILABLE");
    expect(day.availableSlots.length).toBe(3);
    expect(day.occupiedTimes).toEqual([]);
  });

  it("releases the slot immediately if reservation is CANCELLED or REJECTED", () => {
    const reservations: DomainReservation[] = [
      { id: "r1", date: "2026-10-24", time: "13:00", status: "CANCELLED", partySize: 2 },
      { id: "r2", date: "2026-10-24", time: "20:00", status: "REJECTED", partySize: 4 },
    ];

    const result = computeAvailability({
      dates: ["2026-10-24"],
      activeSlots: sampleSlots,
      recurringClosures: [],
      blockedDates: [],
      events: [],
      reservations,
    });

    const day = result.dates[0];
    expect(day.available).toBe(true);
    expect(day.availableSlots.length).toBe(3);
    expect(day.occupiedTimes).toEqual([]);
  });

  it("filters recurring weekly closures", () => {
    // 2026-10-26 is Monday (dayOfWeek = 1)
    const recurringClosures: DomainRecurringClosure[] = [
      { dayOfWeek: 1, reason: "Cerrado los lunes por descanso del personal" },
    ];

    const result = computeAvailability({
      dates: ["2026-10-26"],
      activeSlots: sampleSlots,
      recurringClosures,
      blockedDates: [],
      events: [],
      reservations: [],
    });

    const day = result.dates[0];
    expect(day.available).toBe(false);
    expect(day.status).toBe("CLOSED_RECURRING");
    expect(day.reason).toBe("Cerrado los lunes por descanso del personal");
    expect(day.availableSlots).toEqual([]);
  });

  it("filters specific blocked dates (exceptions)", () => {
    const blockedDates: DomainBlockedDate[] = [
      { date: "2026-12-25", reason: "Navidad - Cerrado" },
    ];

    const result = computeAvailability({
      dates: ["2026-12-25"],
      activeSlots: sampleSlots,
      recurringClosures: [],
      blockedDates,
      events: [],
      reservations: [],
    });

    const day = result.dates[0];
    expect(day.available).toBe(false);
    expect(day.status).toBe("BLOCKED_DATE");
    expect(day.reason).toBe("Navidad - Cerrado");
  });

  it("blocks regular slots if an exclusive event is scheduled", () => {
    const events: DomainRestaurantEvent[] = [
      {
        id: "evt-1",
        title: "Cena Show de Jazz",
        description: "Exclusivo con reserva previa",
        date: "2026-10-30",
        startTime: "21:00",
        endTime: "23:30",
        capacity: 10,
        priceLabel: "$25.000",
        imageUrl: "",
        blocksRegularReservations: true,
        status: "PUBLISHED",
      },
    ];

    const result = computeAvailability({
      dates: ["2026-10-30"],
      activeSlots: sampleSlots,
      recurringClosures: [],
      blockedDates: [],
      events,
      reservations: [],
    });

    const day = result.dates[0];
    expect(day.available).toBe(false);
    expect(day.status).toBe("EVENT_EXCLUSIVE");
    expect(result.events.length).toBe(1);
    expect(result.events[0].remainingSpots).toBe(10);
  });

  it("tracks remaining spots for published events correctly", () => {
    const events: DomainRestaurantEvent[] = [
      {
        id: "evt-1",
        title: "Degustación",
        description: "",
        date: "2026-10-30",
        startTime: "21:00",
        endTime: "",
        capacity: 5,
        priceLabel: "",
        imageUrl: "",
        blocksRegularReservations: false,
        status: "PUBLISHED",
      },
    ];

    const reservations: DomainReservation[] = [
      { id: "r1", date: "2026-10-30", time: "21:00", status: "CONFIRMED", partySize: 2, eventId: "evt-1" },
      { id: "r2", date: "2026-10-30", time: "21:00", status: "PENDING", partySize: 1, eventId: "evt-1" },
      { id: "r3", date: "2026-10-30", time: "21:00", status: "CANCELLED", partySize: 1, eventId: "evt-1" },
    ];

    const result = computeAvailability({
      dates: ["2026-10-30"],
      activeSlots: sampleSlots,
      recurringClosures: [],
      blockedDates: [],
      events,
      reservations,
    });

    expect(result.events[0].remainingSpots).toBe(3); // 5 - 2 active = 3
    expect(result.events[0].available).toBe(true);
  });
});
