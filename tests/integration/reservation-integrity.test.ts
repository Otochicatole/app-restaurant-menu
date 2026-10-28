import { mkdir, mkdtemp, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { PrismaReservationRepository } from "../../src/modules/reservation-management/infrastructure/prisma-reservation-repository";
import { ReservationManagementService } from "../../src/modules/reservation-management/application/reservation-use-cases";
import type { AdminCreateReservationCommand, UpdateReservationCommand } from "../../src/modules/reservation-management/contracts";

// The repository clients below belong exclusively to the migrated temporary file.
vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));

describe("reservation integrity on SQLite", () => {
  let directory: string;
  let first: ReturnType<typeof createSqlitePrismaClient>;
  let second: ReturnType<typeof createSqlitePrismaClient>;
  let repository: PrismaReservationRepository;
  let otherRepository: PrismaReservationRepository;
  let restaurantId: string;
  let slug: string;
  let code = 0;

  const command = (overrides: Partial<AdminCreateReservationCommand> = {}): AdminCreateReservationCommand => ({
    customerName: "Cliente de prueba", customerEmail: "", customerPhone: "1112345678", partySize: 2,
    date: "2099-01-04", time: "20:00", notes: "", adminNotes: "", status: "PENDING", source: "LANDING", ...overrides,
  });
  const reserve = (overrides: Partial<AdminCreateReservationCommand> = {}) => repository.createReservation(restaurantId, command(overrides), `TEST-${++code}`);
  const createEvent = (capacity: number, overrides: Record<string, unknown> = {}) => first.restaurantEvent.create({
    data: { restaurantId, title: "Cena", date: "2099-01-04", startTime: "21:00", capacity, ...overrides },
  });

  beforeAll(async () => {
    const resultsDirectory = path.resolve("test-results");
    await mkdir(resultsDirectory, { recursive: true });
    directory = await mkdtemp(path.join(resultsDirectory, "reservation-integrity-test-"));
    const url = `file:${path.join(directory, "reservations-test.db").replaceAll("\\", "/")}`;
    const migrationClient = createClient({ url });
    try {
      const migrationRoot = path.resolve("prisma/migrations");
      const migrations = (await readdir(migrationRoot)).filter((name) => /^\d/.test(name)).sort();
      for (const name of migrations) {
        await migrationClient.executeMultiple(await readFile(path.join(migrationRoot, name, "migration.sql"), "utf8"));
      }
      await migrationClient.execute("PRAGMA journal_mode=WAL");
    } finally { migrationClient.close(); }
    first = createSqlitePrismaClient(url);
    second = createSqlitePrismaClient(url);
    repository = new PrismaReservationRepository(first);
    otherRepository = new PrismaReservationRepository(second);
  }, 20_000);

  beforeEach(async () => {
    await first.organization.deleteMany();
    const organization = await first.organization.create({ data: { name: "Prueba", slug: "reservation-test" } });
    const restaurant = await first.restaurant.create({
      data: { organizationId: organization.id, name: "Restaurante", slug: "reservation-test", landingSlug: "reservation-test", landingEnabled: true, dailyReservationCapacity: 1 },
    });
    restaurantId = restaurant.id;
    slug = restaurant.landingSlug;
    await first.landingPage.create({ data: { restaurantId, published: true } });
    await first.reservationTimeSlot.create({ data: { restaurantId, time: "20:00" } });
  });

  afterAll(async () => {
    await Promise.all([first?.$disconnect(), second?.$disconnect()]);
    // Keep the disposable file under ignored test-results; native Windows SQLite
    // handles can remain locked until the worker process exits.
  });

  it("accepts multiple parties at one regular time and leaves the daily setting dormant", async () => {
    await reserve();
    await reserve();
    expect(await first.tableReservation.count({ where: { restaurantId } })).toBe(2);
    await expect(reserve({ time: "04:00" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("counts event persons in all occupying states and ignores cancelled and rejected groups", async () => {
    const event = await createEvent(10);
    await reserve({ eventId: event.id, partySize: 2, status: "PENDING" });
    await reserve({ eventId: event.id, partySize: 3, status: "CONFIRMED" });
    await reserve({ eventId: event.id, partySize: 1, status: "COMPLETED" });
    await reserve({ eventId: event.id, partySize: 20, status: "CANCELLED" });
    await reserve({ eventId: event.id, partySize: 20, status: "REJECTED" });
    expect((await repository.getEvents(restaurantId))[0]).toMatchObject({ confirmedReservationsCount: 3, remainingCapacity: 4 });
    expect((await repository.getAvailabilityEvents(restaurantId, { from: event.date, to: event.date }))[0]).toMatchObject({ occupiedSpots: 6 });
    await expect(reserve({ eventId: event.id, partySize: 5 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(reserve({ eventId: event.id, partySize: 5, source: "ADMIN" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("allows only one competing group when two independent clients request the last event places", async () => {
    const event = await createEvent(5);
    const results = await Promise.allSettled([
      repository.createReservation(restaurantId, command({ eventId: event.id, partySize: 3 }), "RACE-A"),
      otherRepository.createReservation(restaurantId, command({ eventId: event.id, partySize: 3 }), "RACE-B"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ code: "CONFLICT" });
    expect((await first.tableReservation.aggregate({ where: { eventId: event.id }, _sum: { partySize: true } }))._sum.partySize).toBe(3);
  });

  it("excludes the edited reservation and validates growth, cancellation and reactivation", async () => {
    const event = await createEvent(3);
    const booking = await reserve({ eventId: event.id, partySize: 2 });
    const edit: UpdateReservationCommand = { ...booking, partySize: 3 };
    expect((await repository.updateReservation(restaurantId, edit)).partySize).toBe(3);
    await expect(repository.updateReservation(restaurantId, { ...edit, partySize: 4 })).rejects.toMatchObject({ code: "CONFLICT" });
    await repository.updateReservationStatus(restaurantId, booking.id, "CANCELLED");
    await reserve({ eventId: event.id, partySize: 3 });
    await expect(repository.updateReservationStatus(restaurantId, booking.id, "CONFIRMED")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(repository.updateReservation(restaurantId, edit)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repository.getReservationById(restaurantId, booking.id))?.status).toBe("CANCELLED");
  });

  it("rejects reducing event capacity below persons already reserved", async () => {
    const event = await createEvent(5);
    await reserve({ eventId: event.id, partySize: 3 });
    await expect(repository.upsertEvent(restaurantId, { ...event, capacity: 2 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repository.upsertEvent(restaurantId, { ...event, capacity: 3 })).capacity).toBe(3);
  });

  it("derives public event dates and times and rejects unpublished or past events", async () => {
    const service = new ReservationManagementService(repository);
    const event = await createEvent(5);
    const booking = await service.createPublicReservation(slug, command({ eventId: event.id, date: "2099-12-31", time: "03:00" }));
    expect(booking).toMatchObject({ date: event.date, time: event.startTime });
    const draft = await createEvent(5, { status: "DRAFT" });
    await expect(service.createPublicReservation(slug, command({ eventId: draft.id }))).rejects.toMatchObject({ code: "NOT_FOUND" });
    const past = await createEvent(5, { date: "2000-01-01" });
    await expect(service.createPublicReservation(slug, command({ eventId: past.id }))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(reserve({ eventId: draft.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(reserve({ eventId: past.id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("limits public event queries to the requested published range and aggregates without customer fields", async () => {
    const event = await createEvent(5);
    await createEvent(5, { date: "2099-02-01" });
    await createEvent(5, { status: "DRAFT" });
    await reserve({ eventId: event.id, partySize: 3 });
    const events = await repository.getAvailabilityEvents(restaurantId, { from: "2099-01-01", to: "2099-01-10" });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: event.id, occupiedSpots: 3 });
    expect(events[0]).not.toHaveProperty("reservations");
    expect(events[0]).not.toHaveProperty("customerPhone");
    const available = await new ReservationManagementService(repository).getPublicAvailability(slug, { from: "2099-01-01", to: "2099-01-10" });
    expect(available.events[0].remainingSpots).toBe(2);
  });

  it("retries a generated reservation code collision and stops after three attempts", async () => {
    await repository.createReservation(restaurantId, command(), "COLLISION");
    const next = await repository.createReservation(restaurantId, command(), "COLLISION");
    expect(next.code).not.toBe("COLLISION");
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      await repository.createReservation(restaurantId, command(), "RES-AAAAA");
      await expect(repository.createReservation(restaurantId, command(), "RES-AAAAA")).rejects.toMatchObject({ code: "CONFLICT" });
    } finally { random.mockRestore(); }
  });
});
