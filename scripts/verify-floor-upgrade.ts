import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient, type Client } from "@libsql/client";
import { createTemplateDocument } from "../src/modules/menu-editor/domain/template";
import { assertSchemaHardeningPreflight } from "./schema-hardening-preflight";
import { createSqlitePrismaClient } from "../src/platform/database/sqlite-client";
import { PrismaIdentityRepository } from "../src/modules/identity-access/infrastructure/prisma-identity-repository";

const directory = await mkdtemp(path.join(os.tmpdir(), "floor-upgrade-test-"));
const migrationRoot = path.resolve("prisma/migrations");
const floor = "20261029120000_floor_management";
const inventory = "20261030120000_floor_inventory_locations";
const organizations = "20261027180000_organization_restaurants";
const migrations = (await readdir(migrationRoot)).filter((name) => /^\d/.test(name)).sort();
const clients: Client[] = [];
function database(name: string) {
  const url = `file:${path.join(directory, `${name}.db`).replaceAll("\\", "/")}`;
  const client = createClient({ url });
  clients.push(client);
  return { client, url };
}
async function apply(client: Client, names: string[]) {
  for (const name of names) await client.executeMultiple(await readFile(path.join(migrationRoot, name, "migration.sql"), "utf8"));
}

try {
  const fresh = database("fresh");
  await apply(fresh.client, migrations);
  assert.equal((await fresh.client.execute("SELECT generation FROM AppSchemaState")).rows[0]?.generation, 4);
  await assertSchemaHardeningPreflight(fresh.url);

  const existing = database("existing");
  await apply(existing.client, migrations.filter((name) => name < floor));
  await existing.client.executeMultiple(`
    INSERT INTO Organization(id,name,slug,updatedAt) VALUES('org-a','A','org-a',CURRENT_TIMESTAMP),('org-b','B','org-b',CURRENT_TIMESTAMP);
    INSERT INTO Restaurant(id,organizationId,name,slug,landingSlug,updatedAt) VALUES('a','org-a','A','a','a',CURRENT_TIMESTAMP),('b','org-b','B','b','b',CURRENT_TIMESTAMP);
    INSERT INTO Admin(id,email,passwordHash,role,organizationId,updatedAt) VALUES('admin-a','owner@example.test','preserved-hash','TENANT_ADMIN','org-a',CURRENT_TIMESTAMP);
    INSERT INTO Session(id,adminId,jti,expiresAt) VALUES('session-a','admin-a','preserved-session','2099-01-01');
    INSERT INTO RestaurantEvent(id,restaurantId,title,date,startTime,updatedAt) VALUES('event-a','a','Dinner','2026-12-01','20:00',CURRENT_TIMESTAMP);
    INSERT INTO TableReservation(id,restaurantId,code,customerName,customerPhone,date,time,updatedAt) VALUES('booking-a','a','A','Customer','12345678','2026-12-01','20:00',CURRENT_TIMESTAMP),('booking-b','b','B','Customer','12345678','2026-12-01','20:00',CURRENT_TIMESTAMP);
  `);
  await apply(existing.client, [floor]);
  assert.deepEqual((await existing.client.execute("SELECT email,passwordHash,organizationId,restaurantId FROM Admin WHERE id='admin-a'")).rows.map((row) => [row.email, row.passwordHash, row.organizationId, row.restaurantId]), [["owner@example.test", "preserved-hash", "org-a", null]]);
  assert.equal((await existing.client.execute("SELECT jti FROM Session WHERE id='session-a'")).rows[0]?.jti, "preserved-session");
  assert.deepEqual((await existing.client.execute("SELECT revision FROM TableReservation")).rows.map((row) => row.revision), [0, 0]);
  assert((await existing.client.execute("SELECT timeZone,floorManagementEnabled FROM Restaurant")).rows.every((row) => row.timeZone === "America/Argentina/Buenos_Aires" && row.floorManagementEnabled === 0));
  await assert.rejects(existing.client.execute("INSERT INTO Admin(id,email,passwordHash,role,updatedAt) VALUES('duplicate-email','OWNER@EXAMPLE.TEST','hash','SUPER_ADMIN',CURRENT_TIMESTAMP)"), /UNIQUE constraint failed/);
  await assert.rejects(existing.client.execute("UPDATE TableReservation SET partySize=0 WHERE id='booking-a'"), /TableReservation_partySize_check/);
  await assert.rejects(existing.client.execute("UPDATE TableReservation SET revision=-1 WHERE id='booking-a'"), /TableReservation_revision_check/);

  await existing.client.executeMultiple(`
    UPDATE Restaurant SET floorManagementEnabled=1 WHERE id='a';
    INSERT INTO Admin(id,email,passwordHash,role,restaurantId,updatedAt) VALUES('waiter-a','sala@example.test','hash','WAITER','a',CURRENT_TIMESTAMP);
    INSERT INTO Session(id,adminId,jti,expiresAt) VALUES('waiter-session','waiter-a','waiter-jti','2099-01-01');
    INSERT INTO DiningRoom(id,restaurantId,name,updatedAt) VALUES('room-a','a','Main',CURRENT_TIMESTAMP),('room-a2','a','Terrace',CURRENT_TIMESTAMP),('room-b','b','Main',CURRENT_TIMESTAMP);
    INSERT INTO DiningTable(id,restaurantId,roomId,label,shape,x,y,updatedAt) VALUES('table-a','a','room-a','1','SQUARE',100,100,CURRENT_TIMESTAMP),('table-a2','a','room-a','2','SQUARE',300,100,CURRENT_TIMESTAMP),('table-a3','a','room-a2','1','CIRCLE',100,100,CURRENT_TIMESTAMP),('table-b','b','room-b','1','RECTANGLE',100,100,CURRENT_TIMESTAMP);
    INSERT INTO DiningTableCombination(id,restaurantId,roomId,name,capacity,updatedAt) VALUES('combination-a','a','room-a','1+2',8,CURRENT_TIMESTAMP);
    INSERT INTO DiningTableCombinationMember(combinationId,tableId,restaurantId,roomId,x,y) VALUES('combination-a','table-a','a','room-a',-40,0),('combination-a','table-a2','a','room-a',40,0);
    INSERT INTO RestaurantEventRoom(eventId,roomId,restaurantId) VALUES('event-a','room-a','a');
    INSERT INTO ReservationAllocation(id,restaurantId,reservationId,roomId,combinationId,capacity,timeZone,serviceStartAt,serviceEndAt,blockedFrom,blockedUntil,roomRevision,updatedAt) VALUES('allocation-a','a','booking-a','room-a','combination-a',8,'America/Argentina/Buenos_Aires','2026-12-01T20:00:00.000Z','2026-12-01T22:00:00.000Z','2026-12-01T19:45:00.000Z','2026-12-01T22:15:00.000Z',0,CURRENT_TIMESTAMP);
    INSERT INTO ReservationAllocationTable(allocationId,tableId,restaurantId,roomId,labelSnapshot,shapeSnapshot,capacitySnapshot,width,height,x,y,rotation) VALUES('allocation-a','table-a','a','room-a','1','SQUARE',4,80,80,100,100,0),('allocation-a','table-a2','a','room-a','2','SQUARE',4,80,80,180,100,0);
  `);
  await assertSchemaHardeningPreflight(existing.url);
  const identityClient = createSqlitePrismaClient(existing.url);
  try {
    const identity = new PrismaIdentityRepository(identityClient);
    const waiter = await identity.findAccountByEmail("SALA@EXAMPLE.TEST");
    assert.equal(waiter?.role, "WAITER");
    assert.equal(waiter?.restaurantId, "a");
    assert.equal(waiter?.organizationId, "org-a", "waiter ownership is derived through its restaurant");
    assert.equal(waiter?.organizationStatus, "ACTIVE");
    assert.equal(waiter?.restaurantStatus, "ACTIVE");
    assert.equal(waiter?.floorManagementEnabled, true);
    assert.equal((await identity.findAuthenticatedAccount({ adminId: "waiter-a", jti: "waiter-jti", now: new Date() }))?.id, "waiter-a");
    assert.equal(await identity.findAuthenticatedAccount({ adminId: "waiter-a", jti: "other-jti", now: new Date() }), null);
  } finally { await identityClient.$disconnect(); }
  await assert.rejects(existing.client.execute("INSERT INTO Admin(id,email,passwordHash,role,restaurantId,updatedAt) VALUES('another-waiter','another@example.test','hash','WAITER','a',CURRENT_TIMESTAMP)"), /UNIQUE constraint failed/);
  await assert.rejects(existing.client.execute("INSERT INTO Admin(id,email,passwordHash,role,updatedAt) VALUES('unscoped-waiter','unscoped@example.test','hash','WAITER',CURRENT_TIMESTAMP)"), /Admin_role_organization_check/);
  await assert.rejects(existing.client.execute("UPDATE Admin SET organizationId='org-b' WHERE id='waiter-a'"), /Admin_role_organization_check/);
  await assert.rejects(existing.client.execute("UPDATE Admin SET restaurantId='b' WHERE id='admin-a'"), /Admin_role_organization_check/);
  await assert.rejects(existing.client.execute("INSERT INTO DiningTableCombinationMember(combinationId,tableId,restaurantId,roomId,x,y) VALUES('combination-a','table-a3','a','room-a',0,0)"), /FOREIGN KEY constraint failed/);
  await assert.rejects(existing.client.execute("INSERT INTO RestaurantEventRoom(eventId,roomId,restaurantId) VALUES('event-a','room-b','a')"), /FOREIGN KEY constraint failed/);
  await assert.rejects(existing.client.execute("UPDATE ReservationAllocation SET reservationId='booking-b' WHERE id='allocation-a'"), /FOREIGN KEY constraint failed/);
  await assert.rejects(existing.client.execute("UPDATE ReservationAllocationTable SET tableId='table-b' WHERE allocationId='allocation-a' AND tableId='table-a'"), /FOREIGN KEY constraint failed/);
  for (const query of [
    "UPDATE DiningRoom SET width=0 WHERE id='room-a'", "UPDATE DiningRoom SET revision=-1 WHERE id='room-a'",
    "UPDATE DiningTable SET capacity=0 WHERE id='table-a'", "UPDATE DiningTable SET shape='TRIANGLE' WHERE id='table-a'",
    "UPDATE DiningTable SET rotation=45 WHERE id='table-a'", "UPDATE DiningTable SET height=0 WHERE id='table-a'",
    "UPDATE DiningTableCombination SET capacity=0 WHERE id='combination-a'", "UPDATE DiningTableCombinationMember SET rotation=1 WHERE combinationId='combination-a'",
    "UPDATE ReservationAllocation SET serviceEndAt=serviceStartAt WHERE id='allocation-a'", "UPDATE ReservationAllocation SET blockedFrom=serviceEndAt WHERE id='allocation-a'",
    "UPDATE ReservationAllocation SET version=-1 WHERE id='allocation-a'", "UPDATE ReservationAllocationTable SET shapeSnapshot='TRIANGLE' WHERE allocationId='allocation-a'",
    "UPDATE ReservationAllocationTable SET capacitySnapshot=0 WHERE allocationId='allocation-a'", "UPDATE ReservationAllocationTable SET width=0 WHERE allocationId='allocation-a'",
  ]) await assert.rejects(existing.client.execute(query), /CHECK constraint failed/);
  await existing.client.executeMultiple("UPDATE TableReservation SET status='COMPLETED' WHERE id='booking-a'; UPDATE ReservationAllocation SET releasedAt='2026-12-01T21:00:00.000Z' WHERE id='allocation-a'; UPDATE DiningTable SET label='Renamed',x=800,width=100 WHERE id='table-a';");
  const snapshot = (await existing.client.execute("SELECT labelSnapshot,x,width FROM ReservationAllocationTable WHERE tableId='table-a'")).rows[0];
  assert.equal(snapshot?.labelSnapshot, "1"); assert.equal(snapshot?.x, 100); assert.equal(snapshot?.width, 80);
  assert.equal((await existing.client.execute("SELECT releasedAt FROM ReservationAllocation WHERE id='allocation-a'")).rows[0]?.releasedAt, "2026-12-01T21:00:00.000Z");
  await assert.rejects(existing.client.execute("DELETE FROM DiningTable WHERE id='table-a'"), /FOREIGN KEY constraint failed/);
  await existing.client.execute("DELETE FROM Admin WHERE id='waiter-a'");
  assert.equal((await existing.client.execute("SELECT COUNT(*) AS count FROM Session WHERE adminId='waiter-a'")).rows[0]?.count, 0);
  assert.equal((await existing.client.execute("SELECT COUNT(*) AS count FROM ReservationAllocationTable")).rows[0]?.count, 2);
  const preservedBookings = (await existing.client.execute("SELECT * FROM TableReservation ORDER BY id")).rows;
  const preservedPoses = (await existing.client.execute("SELECT * FROM ReservationAllocationTable ORDER BY tableId")).rows;
  await apply(existing.client, [inventory]);
  assert.equal((await existing.client.execute("SELECT generation FROM AppSchemaState")).rows[0]?.generation, 4);
  assert.deepEqual((await existing.client.execute("SELECT * FROM TableReservation ORDER BY id")).rows, preservedBookings, "inventory upgrade preserves every reservation field");
  assert.deepEqual((await existing.client.execute("SELECT * FROM ReservationAllocationTable ORDER BY tableId")).rows, preservedPoses, "inventory upgrade does not move historical table poses");
  const inheritedLocation = (await existing.client.execute("SELECT name,x,y,width,height FROM DiningRoomLocation WHERE roomId='room-a'")).rows[0];
  assert.deepEqual(inheritedLocation, { name: "Salón completo", x: 600, y: 400, width: 1200, height: 800 });
  assert.equal((await existing.client.execute("SELECT locationId FROM ReservationAllocation WHERE id='allocation-a'")).rows[0]?.locationId, "legacy-room-location-room-a");
  await existing.client.execute("UPDATE TableReservation SET source='WALK_IN' WHERE id='booking-b'");
  await assert.rejects(existing.client.execute("UPDATE TableReservation SET source='UNKNOWN' WHERE id='booking-b'"), /TableReservation_source_check/);
  await assert.rejects(existing.client.execute("UPDATE ReservationAllocation SET locationId='legacy-room-location-room-b' WHERE id='allocation-a'"), /FOREIGN KEY constraint failed/);
  await assert.rejects(existing.client.execute("UPDATE ReservationAllocation SET locationId='legacy-room-location-room-a2' WHERE id='allocation-a'"), /FOREIGN KEY constraint failed/);
  await assert.rejects(existing.client.execute("UPDATE DiningRoomLocation SET restaurantId='b' WHERE roomId='room-a'"), /FOREIGN KEY constraint failed/);
  for (const query of [
    "UPDATE DiningRoomLocation SET width=0 WHERE roomId='room-a'",
    "UPDATE DiningRoomLocation SET height=0 WHERE roomId='room-a'",
    "UPDATE DiningRoomLocation SET rotation=45 WHERE roomId='room-a'",
    "UPDATE TableReservation SET partySize=0 WHERE id='booking-a'",
    "UPDATE TableReservation SET revision=-1 WHERE id='booking-a'",
    "UPDATE ReservationAllocation SET version=-1 WHERE id='allocation-a'",
    "UPDATE ReservationAllocation SET blockedUntil=blockedFrom WHERE id='allocation-a'",
  ]) await assert.rejects(existing.client.execute(query), /CHECK constraint failed/);
  await assert.rejects(existing.client.execute("DELETE FROM DiningRoomLocation WHERE roomId='room-a'"), /FOREIGN KEY constraint failed/);
  await assert.rejects(existing.client.execute("INSERT INTO Admin(id,email,passwordHash,role,updatedAt) VALUES('duplicate-email-after-inventory','OWNER@EXAMPLE.TEST','hash','SUPER_ADMIN',CURRENT_TIMESTAMP)"), /UNIQUE constraint failed/);
  await assertSchemaHardeningPreflight(existing.url);
  assert.deepEqual((await existing.client.execute("PRAGMA foreign_key_check")).rows, []);

  const legacy = database("legacy");
  await apply(legacy.client, migrations.filter((name) => name < organizations));
  await legacy.client.executeMultiple("INSERT INTO Tenant(id,name,slug,updatedAt) VALUES('legacy','Legacy','legacy',CURRENT_TIMESTAMP); INSERT INTO Admin(id,email,passwordHash,role,tenantId,updatedAt) VALUES('legacy-admin','legacy@example.test','hash','TENANT_ADMIN','legacy',CURRENT_TIMESTAMP);");
  await legacy.client.execute({ sql: "INSERT INTO MenuProject(id,tenantId,name,slug,isPrimary,draftJson,updatedAt) VALUES('legacy-project','legacy','Legacy','legacy-menu',1,?,CURRENT_TIMESTAMP)", args: [JSON.stringify(createTemplateDocument("Legacy"))] });
  await apply(legacy.client, migrations.filter((name) => name >= organizations));
  assert.equal((await legacy.client.execute("SELECT generation FROM AppSchemaState")).rows[0]?.generation, 4);
  assert.equal((await legacy.client.execute("SELECT state FROM AppSchemaState")).rows[0]?.state, "MIGRATING");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["run", "scripts/cutover-organizations.ts"], { env: { ...process.env, DATABASE_URL: legacy.url, STORAGE_ROOT: path.join(directory, "storage") }, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); }); child.stderr.on("data", (chunk) => { output += String(chunk); });
    child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(output)));
  });
  assert.equal((await legacy.client.execute("SELECT generation FROM AppSchemaState")).rows[0]?.generation, 4, "backfill must never downgrade generation");
  assert.equal((await legacy.client.execute("SELECT state FROM AppSchemaState")).rows[0]?.state, "READY");
  await assertSchemaHardeningPreflight(legacy.url);
  console.log("Migración de salas verificada: generación 4, cuentas compartidas, aislamiento, constraints, snapshots, conservación y backfill legacy.");
} finally {
  for (const client of clients) client.close();
  try { await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch (error) {
    if (!(error instanceof Error && "code" in error && ["EBUSY", "EPERM"].includes(String(error.code)))) throw error;
    console.warn(`SQLite mantiene temporalmente bloqueado el directorio descartable: ${directory}`);
  }
}
