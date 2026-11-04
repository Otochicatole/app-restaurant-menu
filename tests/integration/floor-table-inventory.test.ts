import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { PrismaFloorRepository } from "../../src/modules/floor-management/infrastructure/prisma-floor-repository";
import type { FloorRoom, FloorTableInventoryInput } from "../../src/modules/floor-management/contracts";
import { createWalkIn, releaseWalkIn } from "../../src/modules/reservation-management/infrastructure/floor-walk-ins";

vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));
const directory = path.resolve("test-results", `floor-table-inventory-${randomUUID()}`);
const url = `file:${path.join(directory, "inventory.db").replaceAll("\\", "/")}`;

describe("narrow table inventory changes on SQLite", () => {
  let database: ReturnType<typeof createSqlitePrismaClient>;
  let competitor: ReturnType<typeof createSqlitePrismaClient>;
  let repository: PrismaFloorRepository;
  let restaurantId: string;
  let foreignRestaurantId: string;
  let room: FloorRoom;
  const command = (current = room): FloorTableInventoryInput => ({ roomId: current.id, expectedRevision: current.revision, tables: current.tables, combinations: current.combinations });

  beforeAll(async () => {
    await mkdir(directory, { recursive: true });
    const sqlite = createClient({ url });
    try {
      const root = path.resolve("prisma/migrations");
      for (const name of (await readdir(root)).filter((name) => /^\d/.test(name)).sort()) {
        await sqlite.executeMultiple(await readFile(path.join(root, name, "migration.sql"), "utf8"));
      }
      await sqlite.execute("PRAGMA journal_mode=WAL");
    } finally { sqlite.close(); }
    database = createSqlitePrismaClient(url); competitor = createSqlitePrismaClient(url);
    repository = new PrismaFloorRepository(database);
  }, 30_000);
  afterAll(async () => { await Promise.all([database?.$disconnect(), competitor?.$disconnect()]); });
  beforeEach(async () => {
    await database.organization.deleteMany();
    const organization = await database.organization.create({ data: { name: "Tables", slug: randomUUID() } });
    restaurantId = (await database.restaurant.create({ data: { organizationId: organization.id, name: "Main", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } })).id;
    foreignRestaurantId = (await database.restaurant.create({ data: { organizationId: organization.id, name: "Other", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } })).id;
    room = await repository.saveRoom(restaurantId, { name: "Dining room", width: 1000, height: 700, active: true,
      fixtures: [{ id: "wall", type: "WALL", label: "Wall", x: 50, y: 350, width: 10, height: 600, rotation: 0 }],
      locations: [{ id: "window", name: "Window", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true }],
      tables: [1, 2].map((number) => ({ id: randomUUID(), label: `M${number}`, shape: "SQUARE", width: 80, height: 80, capacity: 4, x: 0, y: 0, rotation: 0, active: true })), combinations: [],
    }, 0);
  });

  it("adds, edits, archives and combines tables while preserving room, sector and account data", async () => {
    const plan = await database.diningRoom.findUniqueOrThrow({ where: { id: room.id } });
    const sector = await database.diningRoomLocation.findUniqueOrThrow({ where: { id: "window" } });
    const restaurant = await database.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    const third = { ...room.tables[0], id: randomUUID(), label: "M3", shape: "RECTANGLE" as const, width: 120 };
    const tables = [{ ...room.tables[0], label: "Window table", capacity: 6 }, { ...room.tables[1], active: false }, third];
    const combinations = [{ id: randomUUID(), name: "Window setup", capacity: 8, active: true, members: [
      { tableId: tables[0].id, x: -60, y: 0, rotation: 0 as const }, { tableId: third.id, x: 40, y: 0, rotation: 0 as const },
    ] }];
    const saved = await repository.saveTables(restaurantId, { ...command(), tables, combinations });
    expect(saved.revision).toBe(room.revision + 1);
    expect(saved.tables).toEqual(expect.arrayContaining(tables));
    // Relation rows have no implicit SQL order; table identities and geometry must match.
    const orderedMembers = (items: typeof saved.combinations) => items.map((item) => ({ ...item, members: [...item.members].sort((a, b) => a.tableId.localeCompare(b.tableId)) }));
    expect(orderedMembers(saved.combinations)).toEqual(orderedMembers(combinations));
    const updated = await database.diningRoom.findUniqueOrThrow({ where: { id: room.id } });
    expect(updated).toMatchObject({ name: plan.name, width: plan.width, height: plan.height, fixturesJson: plan.fixturesJson, active: plan.active });
    expect(await database.diningRoomLocation.findUniqueOrThrow({ where: { id: "window" } })).toEqual(sector);
    expect(await database.restaurant.findUniqueOrThrow({ where: { id: restaurantId } })).toEqual(restaurant);
    expect(await database.admin.count()).toBe(0);
  });

  it.each(["name", "width", "height", "active", "locations", "fixtures", "timeZone", "staffAccount"])("rejects injected %s settings even when called below HTTP", async (property) => {
    await expect(repository.saveTables(restaurantId, { ...command(), [property]: "tampered" } as FloorTableInventoryInput)).rejects.toThrow();
    expect((await repository.getConfig(restaurantId)).rooms[0].revision).toBe(room.revision);
  });

  it("preserves physical IDs and archives omitted inventory instead of deleting history", async () => {
    const saved = await repository.saveTables(restaurantId, { ...command(), tables: [room.tables[0]] });
    expect(saved.tables).toHaveLength(2);
    expect(saved.tables.find((table) => table.id === room.tables[1].id)?.active).toBe(false);
    expect(saved.tables.find((table) => table.id === room.tables[0].id)?.active).toBe(true);
  });

  it("rejects another restaurant's room and table IDs without altering either inventory", async () => {
    await expect(repository.saveTables(foreignRestaurantId, command())).rejects.toThrow("Salón");
    const foreignRoom = await database.diningRoom.create({ data: { restaurantId: foreignRestaurantId, name: "Other room", width: 800, height: 600,
      tables: { create: { label: "Foreign", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 0, y: 0 } },
    }, include: { tables: true } });
    await expect(repository.saveTables(restaurantId, { ...command(), tables: [{ ...room.tables[0], id: foreignRoom.tables[0].id }] })).rejects.toThrow("Mesa, combinación o ubicación");
    expect(await database.diningTable.count({ where: { roomId: room.id } })).toBe(2);
    expect(await database.diningTable.count({ where: { roomId: foreignRoom.id } })).toBe(1);
  });

  it("keeps committed table geometry protected and preserves its allocation snapshot when renamed", async () => {
    const arrival = new Date("2099-12-01T20:00:00.000Z");
    const visit = await createWalkIn(database, restaurantId, { customerName: "Group", partySize: 2, notes: "", durationMinutes: 90,
      assignment: { roomId: room.id, locationId: "window", optionId: `table:${room.tables[0].id}`, x: 200, y: 200, rotation: 0, expectedRoomRevision: room.revision },
    }, () => arrival);
    const snapshot = await database.reservationAllocation.findUniqueOrThrow({ where: { reservationId: visit.reservationId }, include: { tables: true } });
    await expect(repository.saveTables(restaurantId, { ...command(), tables: room.tables.map((table, index) => index === 0 ? { ...table, width: 100, height: 100 } : table) })).rejects.toThrow("tiene reservas futuras");
    const saved = await repository.saveTables(restaurantId, { ...command(), tables: room.tables.map((table, index) => index === 0 ? { ...table, label: "M1 renamed" } : table) });
    expect(await database.reservationAllocation.findUniqueOrThrow({ where: { reservationId: visit.reservationId }, include: { tables: true } })).toEqual(snapshot);
    await releaseWalkIn(database, restaurantId, visit.reservationId, 0, new Date());
    const resized = await repository.saveTables(restaurantId, { ...command(saved), tables: saved.tables.map((table, index) => index === 0 ? { ...table, width: 100, height: 100 } : table) });
    expect(resized.tables.find((table) => table.id === room.tables[0].id)?.width).toBe(100);
  });

  it("lets exactly one independent client save a shared revision", async () => {
    const second = new PrismaFloorRepository(competitor);
    const results = await Promise.allSettled([
      repository.saveTables(restaurantId, { ...command(), tables: room.tables.map((table, index) => index === 0 ? { ...table, label: "First" } : table) }),
      second.saveTables(restaurantId, { ...command(), tables: room.tables.map((table, index) => index === 0 ? { ...table, label: "Second" } : table) }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.message).toContain("cambió en otra pestaña");
    expect((await repository.getConfig(restaurantId)).rooms[0].revision).toBe(room.revision + 1);
  });
});
