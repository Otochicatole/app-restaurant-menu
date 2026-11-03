import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { createWalkIn, getWalkInOptions, releaseWalkIn } from "../../src/modules/reservation-management/infrastructure/floor-walk-ins";
import { PrismaReservationRepository } from "../../src/modules/reservation-management/infrastructure/prisma-reservation-repository";
import type { FloorAssignmentInput } from "../../src/modules/floor-management/contracts";

vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));
const now = new Date("2099-12-01T20:00:00.000Z");
const directory = path.resolve("test-results", `floor-walk-in-test-${randomUUID()}`);
const url = `file:${path.join(directory, "walk-in-test.db").replaceAll("\\", "/")}`;

describe("sectors and walk-in service on SQLite", () => {
  let first: ReturnType<typeof createSqlitePrismaClient>;
  let second: ReturnType<typeof createSqlitePrismaClient>;
  let restaurantId: string;
  let otherRestaurantId: string;
  let roomId: string;
  let locationId: string;
  let tables: { id: string }[];
  const selected = (index = 0, x = 100): FloorAssignmentInput => ({ roomId, locationId, optionId: `table:${tables[index].id}`, x, y: 100, rotation: 0, expectedRoomRevision: 0 });
  const command = (assignment = selected()) => ({ customerName: "Sin reserva", partySize: 2, notes: "Junto a ventana", durationMinutes: 120, assignment });

  beforeAll(async () => {
    await mkdir(directory, { recursive: true });
    const database = createClient({ url });
    try {
      const root = path.resolve("prisma/migrations");
      for (const name of (await readdir(root)).filter((name) => /^\d/.test(name)).sort()) {
        await database.executeMultiple(await readFile(path.join(root, name, "migration.sql"), "utf8"));
      }
      await database.execute("PRAGMA journal_mode=WAL");
    } finally { database.close(); }
    first = createSqlitePrismaClient(url); second = createSqlitePrismaClient(url);
  }, 30_000);
  afterAll(async () => { await Promise.all([first?.$disconnect(), second?.$disconnect()]); });
  beforeEach(async () => {
    await first.organization.deleteMany();
    const organization = await first.organization.create({ data: { name: "Service", slug: randomUUID() } });
    const restaurant = await first.restaurant.create({ data: { organizationId: organization.id, name: "Main", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } });
    restaurantId = restaurant.id;
    otherRestaurantId = (await first.restaurant.create({ data: { organizationId: organization.id, name: "Other", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } })).id;
    const room = await first.diningRoom.create({ data: { restaurantId, name: "Salón", width: 1000, height: 600,
      locations: { create: { name: "Ventana", x: 300, y: 200, width: 600, height: 400 } },
      tables: { create: [1, 2, 3].map((label) => ({ label: String(label), shape: "SQUARE" as const, capacity: 4, x: 0, y: 0, width: 80, height: 80 })) },
    }, include: { locations: true, tables: { orderBy: { label: "asc" } } } });
    roomId = room.id; locationId = room.locations[0].id; tables = room.tables;
  });

  it("places an ad-hoc pair for six in a sector without preconfigured combinations", async () => {
    const assignment: FloorAssignmentInput = { ...selected(), optionId: "custom", capacity: 6,
      customTables: [{ tableId: tables[0].id, x: 160, y: 100, rotation: 0 }, { tableId: tables[1].id, x: 240, y: 100, rotation: 0 }] };
    const visit = await createWalkIn(first, restaurantId, { ...command(assignment), partySize: 6 }, () => now);
    const saved = await first.tableReservation.findUniqueOrThrow({ where: { id: visit.reservationId }, include: { allocation: { include: { tables: true } } } });
    expect(saved).toMatchObject({ source: "WALK_IN", customerPhone: "", customerEmail: "", status: "CONFIRMED" });
    expect(saved.allocation).toMatchObject({ locationId, capacity: 6, blockedFrom: now, blockedUntil: new Date(now.getTime() + 120 * 60_000) });
    expect(saved.allocation?.tables).toHaveLength(2);
  });

  it("permits several assemblies in one sector and rejects spatial collisions independently of inventory", async () => {
    await createWalkIn(first, restaurantId, command(), () => now);
    await createWalkIn(first, restaurantId, command(selected(1, 180)), () => now);
    await expect(createWalkIn(first, restaurantId, command(selected(2, 180)), () => now)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await first.tableReservation.count({ where: { restaurantId } })).toBe(2);
  });

  it("rechecks spatial conflicts atomically using two independent clients", async () => {
    const results = await Promise.allSettled([
      createWalkIn(first, restaurantId, command(selected(0)), () => now),
      createWalkIn(second, restaurantId, command(selected(1)), () => now),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await first.tableReservation.count({ where: { restaurantId } })).toBe(1);
  }, 30_000);

  it("requires a valid sector and rolls back an invalid placement", async () => {
    await expect(createWalkIn(first, restaurantId, command({ ...selected(), locationId: undefined }), () => now)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(createWalkIn(first, restaurantId, command(selected(0, 700)), () => now)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await first.tableReservation.count({ where: { restaurantId } })).toBe(0);
  });

  it("starts at arrival, allows immediate release and requires a fresh revision", async () => {
    const visit = await createWalkIn(first, restaurantId, command(), () => now);
    await expect(releaseWalkIn(first, restaurantId, visit.reservationId, 1, now)).rejects.toMatchObject({ code: "CONFLICT" });
    const departure = new Date(now.getTime() + 60_000);
    await releaseWalkIn(first, restaurantId, visit.reservationId, 0, departure);
    const stored = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: visit.reservationId }, include: { tables: true } });
    expect(stored.releasedAt).toEqual(departure); expect(stored.tables).toHaveLength(1);
    await createWalkIn(second, restaurantId, command(), () => departure);
    expect(await first.tableReservation.count({ where: { restaurantId } })).toBe(2);
  });

  it("cannot release another restaurant or an administrative reservation through the staff operation", async () => {
    const visit = await createWalkIn(first, restaurantId, command(), () => now);
    await expect(releaseWalkIn(first, otherRestaurantId, visit.reservationId, 0, now)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await first.tableReservation.update({ where: { id: visit.reservationId }, data: { source: "ADMIN" } });
    await expect(releaseWalkIn(first, restaurantId, visit.reservationId, 0, now)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows administrators to edit a walk-in without inventing a phone, retaining its arrival interval", async () => {
    const visit = await createWalkIn(first, restaurantId, command(), () => now);
    const stored = await first.tableReservation.findUniqueOrThrow({ where: { id: visit.reservationId } });
    const repository = new PrismaReservationRepository(first);
    const updated = await repository.updateReservation(restaurantId, { ...stored, notes: "Silla para bebé", expectedRevision: 0 });
    expect(updated.customerPhone).toBe(""); expect(updated.notes).toBe("Silla para bebé");
    expect((await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: visit.reservationId } })).blockedFrom).toEqual(now);
    await first.tableReservation.update({ where: { id: visit.reservationId }, data: { source: "ADMIN" } });
    await expect(repository.updateReservation(restaurantId, { ...stored, expectedRevision: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("detects usable dynamic assemblies for public-sized groups and respects unavailable sectors", async () => {
    const options = await getWalkInOptions(first, restaurantId, 6, 120, now);
    expect(options.rooms[0].locations).toHaveLength(1);
    await first.diningRoomLocation.update({ where: { id: locationId }, data: { active: false } });
    const unavailable = await getWalkInOptions(first, restaurantId, 2, 120, now);
    expect(unavailable.options.some((option) => option.available)).toBe(false);
  });
});
