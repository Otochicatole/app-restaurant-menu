import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { adminCreateReservationSchema } from "../../src/modules/reservation-management/contracts";
import { getFloorAssignmentOptions, getPhysicalAvailability } from "../../src/modules/reservation-management/infrastructure/floor-allocations";
import { PrismaReservationRepository } from "../../src/modules/reservation-management/infrastructure/prisma-reservation-repository";

vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));
const date = "2099-12-01";
const directory = path.resolve("test-results", `floor-sector-availability-${randomUUID()}`);
const url = `file:${path.join(directory, "sectors-test.db").replaceAll("\\", "/")}`;

describe("sector-aware public availability on SQLite", () => {
  let database: ReturnType<typeof createSqlitePrismaClient>;
  let repository: PrismaReservationRepository;
  let restaurantId: string;
  let organizationId: string;
  let roomId: string;
  let locationId: string;
  let tableIds: string[];

  beforeAll(async () => {
    await mkdir(directory, { recursive: true });
    const sql = createClient({ url });
    try {
      const root = path.resolve("prisma/migrations");
      for (const name of (await readdir(root)).filter((name) => /^\d/.test(name)).sort()) {
        await sql.executeMultiple(await readFile(path.join(root, name, "migration.sql"), "utf8"));
      }
      await sql.execute("PRAGMA journal_mode=WAL");
    } finally { sql.close(); }
    database = createSqlitePrismaClient(url);
    repository = new PrismaReservationRepository(database);
  }, 30_000);

  afterAll(async () => { await database?.$disconnect(); });
  beforeEach(async () => {
    await database.organization.deleteMany();
    const organization = await database.organization.create({ data: { name: "Availability", slug: randomUUID() } });
    organizationId = organization.id;
    const restaurant = await database.restaurant.create({ data: { organizationId, name: "Main", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } });
    restaurantId = restaurant.id;
    const room = await createRoom("Ventana", 2);
    roomId = room.id; locationId = room.locations[0].id; tableIds = room.tables.map((table) => table.id);
    await database.reservationTimeSlot.create({ data: { restaurantId, time: "20:00" } });
  });

  async function createRoom(name: string, count: number, ownerId = restaurantId) {
    return database.diningRoom.create({ data: { restaurantId: ownerId, name, width: 400, height: 300,
      locations: { create: { name, x: 80, y: 40, width: 160, height: 80 } },
      tables: { create: Array.from({ length: count }, (_, index) => ({ label: String(index + 1), shape: "SQUARE" as const, capacity: 4, width: 80, height: 80, x: 0, y: 0 })) },
    }, include: { locations: true, tables: { orderBy: { label: "asc" } } } });
  }
  function pending(partySize = 6, eventId?: string) {
    return adminCreateReservationSchema.parse({ customerName: "Grupo público", customerPhone: "12345678", partySize, date, time: "20:00", status: "PENDING", source: "LANDING", eventId });
  }
  async function event(selectedRoomIds: string[], overrides: { date?: string; startTime?: string; endTime?: string; blocksRegularReservations?: boolean } = {}) {
    const result = await database.restaurantEvent.create({ data: { restaurantId, title: "Evento", date, startTime: "20:00", endTime: "22:00", capacity: 30, status: "PUBLISHED", blocksRegularReservations: true, ...overrides } });
    await database.restaurantEventRoom.createMany({ data: selectedRoomIds.map((selectedRoomId) => ({ restaurantId, roomId: selectedRoomId, eventId: result.id })) });
    return result;
  }

  it("offers and accepts two four-seat tables for six without a saved combination; pending requests hold nothing", async () => {
    expect(await database.diningTableCombination.count({ where: { restaurantId } })).toBe(0);
    const singles = await getFloorAssignmentOptions(database, restaurantId, { date, time: "20:00", partySize: 2 });
    expect(singles.options.map((option) => option.poses[0].tableId).sort()).toEqual([...tableIds].sort());
    expect(singles.options.every((option) => option.id === `table:${option.poses[0].tableId}` && option.available)).toBe(true);
    const options = await getFloorAssignmentOptions(database, restaurantId, { date, time: "20:00", partySize: 6 });
    expect(options.options.every((option) => !option.available && option.resourceAvailable)).toBe(true);
    expect(options.hasAvailability).toBe(true);
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [date], times: ["20:00"], partySize: 6 })).toEqual({ [date]: ["20:00"] });
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [date], times: ["20:00"], partySize: 7 })).toEqual({ [date]: [] });
    const first = await repository.createReservation(restaurantId, pending(), randomUUID());
    const second = await repository.createReservation(restaurantId, pending(), randomUUID());
    expect([first.status, second.status]).toEqual(["PENDING", "PENDING"]);
    expect(await database.reservationAllocation.count({ where: { restaurantId } })).toBe(0);
  });

  it("requires free sector surface even when unused physical inventory remains", async () => {
    const spare = await database.diningTable.create({ data: { restaurantId, roomId, label: "Spare", shape: "SQUARE", capacity: 4, x: 0, y: 0, width: 80, height: 80 } });
    await repository.createReservation(restaurantId, adminCreateReservationSchema.parse({ ...pending(), status: "CONFIRMED", source: "ADMIN", assignment: {
      roomId, locationId, optionId: "custom", capacity: 6, expectedRoomRevision: 0, x: 80, y: 40, rotation: 0,
      customTables: [{ tableId: tableIds[0], x: 40, y: 40, rotation: 0 }, { tableId: tableIds[1], x: 120, y: 40, rotation: 0 }],
    } }), randomUUID());
    const options = await getFloorAssignmentOptions(database, restaurantId, { date, time: "20:00", partySize: 2 });
    expect(options.options.find((option) => option.id === `table:${spare.id}`)).toMatchObject({ resourceAvailable: true, available: false });
    expect(options.hasAvailability).toBe(false);
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [date], times: ["20:00"], partySize: 2 })).toEqual({ [date]: [] });
    await expect(repository.createReservation(restaurantId, pending(2), randomUUID())).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not offer inactive sectors or combine inventory across rooms or restaurants", async () => {
    await database.diningTable.delete({ where: { id: tableIds[1] } });
    await createRoom("Terraza", 1);
    const other = await database.restaurant.create({ data: { organizationId, name: "Other", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } });
    await createRoom("Otro restaurante", 2, other.id);
    expect((await getFloorAssignmentOptions(database, restaurantId, { date, time: "20:00", partySize: 6 })).hasAvailability).toBe(false);
    await database.diningRoomLocation.updateMany({ where: { restaurantId }, data: { active: false } });
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [date], times: ["20:00"], partySize: 2 })).toEqual({ [date]: [] });
    await expect(repository.createReservation(restaurantId, pending(2), randomUUID())).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("limits dynamic event assemblies and exclusive blocks to the event's selected rooms", async () => {
    const terrace = await createRoom("Terraza", 1);
    const selected = await event([roomId]);
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [date], times: ["20:00"], partySize: 2 })).toEqual({ [date]: ["20:00"] });
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [date], times: ["20:00"], partySize: 6 })).toEqual({ [date]: [] });
    expect(await repository.hasEventPhysicalAvailability(restaurantId, selected.id, 6)).toBe(true);
    await repository.createReservation(restaurantId, pending(6, selected.id), randomUUID());
    expect(await database.reservationAllocation.count({ where: { restaurantId } })).toBe(0);
    await database.restaurantEventRoom.deleteMany({ where: { eventId: selected.id } });
    await database.restaurantEventRoom.create({ data: { eventId: selected.id, restaurantId, roomId: terrace.id } });
    expect(await repository.hasEventPhysicalAvailability(restaurantId, selected.id, 6)).toBe(false);
    await expect(repository.createReservation(restaurantId, pending(6, selected.id), randomUUID())).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("loads exclusive events by restaurant-local dates across the UTC date boundary", async () => {
    await database.restaurant.update({ where: { id: restaurantId }, data: { timeZone: "Pacific/Kiritimati" } });
    const localDate = "2099-12-02";
    await event([roomId], { date: localDate, startTime: "01:00", endTime: "02:00" });
    // 00:30 locally is still December 1 in UTC; preparation for 01:00 already blocks this room.
    const options = await getFloorAssignmentOptions(database, restaurantId, { date: localDate, time: "00:30", partySize: 6 });
    expect(new Date(options.interval.serviceStartAt).toISOString()).toBe("2099-12-01T10:30:00.000Z");
    expect(options.hasAvailability).toBe(false);
    expect(options.options.every((option) => !option.resourceAvailable && option.conflict?.includes("Evento"))).toBe(true);
    expect(await getPhysicalAvailability(database, restaurantId, { dates: [localDate], times: ["00:30"], partySize: 6 })).toEqual({ [localDate]: [] });
  });
});
