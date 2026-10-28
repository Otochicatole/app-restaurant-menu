import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient, type Client } from "@libsql/client";
import { createTemplateDocument } from "../src/modules/menu-editor/domain/template";
import { assertSchemaHardeningPreflight } from "./schema-hardening-preflight";

const directory = await mkdtemp(path.join(os.tmpdir(), "database-hardening-test-"));
const root = path.resolve("prisma/migrations");
const hardening = "20261028190000_database_hardening";
const organizations = "20261027180000_organization_restaurants";
const migrations = (await readdir(root)).filter((name) => /^\d/.test(name)).sort();
const sql = await readFile(path.join(root, hardening, "migration.sql"), "utf8");
const clients: Client[] = [];
function database(name: string) {
  const url = `file:${path.join(directory, `${name}.db`).replaceAll("\\", "/")}`;
  const client = createClient({ url });
  clients.push(client);
  return { client, url };
}
async function migrate(client: Client, before = "\uffff") {
  for (const name of migrations.filter((name) => name < before)) {
    await client.executeMultiple(await readFile(path.join(root, name, "migration.sql"), "utf8"));
  }
}
async function snapshot(client: Client) {
  const tables = await client.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  return JSON.stringify(await Promise.all(tables.rows.map(async ({ name }) => ({
    table: name,
    rows: (await client.execute(`SELECT * FROM "${String(name)}" ORDER BY rowid`)).rows,
  }))));
}
async function fixture(client: Client) {
  await client.executeMultiple(`
    INSERT INTO Organization(id,name,slug,updatedAt) VALUES('org-a','A','org-a',CURRENT_TIMESTAMP),('org-b','B','org-b',CURRENT_TIMESTAMP);
    INSERT INTO Admin(id,email,passwordHash,role,organizationId,updatedAt) VALUES('admin-a','owner@example.test','hash','TENANT_ADMIN','org-a',CURRENT_TIMESTAMP),('super','root@example.test','hash','SUPER_ADMIN',NULL,CURRENT_TIMESTAMP);
    INSERT INTO Restaurant(id,organizationId,name,slug,landingSlug,updatedAt) VALUES('a','org-a','A','restaurant-a','landing-a',CURRENT_TIMESTAMP),('b','org-b','B','restaurant-b','landing-b',CURRENT_TIMESTAMP);
    INSERT INTO Session(id,adminId,jti,expiresAt) VALUES('session-a','admin-a','jti-a','2099-01-01');
    INSERT INTO LoginThrottle(key,failures,windowStartedAt,updatedAt) VALUES('login-a',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO AssetCleanupJob(id,storageKey,updatedAt) VALUES('cleanup-a','old/file.png',CURRENT_TIMESTAMP);
    INSERT INTO MenuProject(id,restaurantId,name,slug,isPrimary,draftJson,draftRevision,publishedJson,publishedRevision,schemaVersion,updatedAt) VALUES('project-a','a','A','menu-a',1,'{}',2,'{}',1,1,CURRENT_TIMESTAMP),('project-b','b','B','menu-b',1,'{}',0,NULL,NULL,1,CURRENT_TIMESTAMP);
    INSERT INTO MenuAsset(id,restaurantId,kind,name,storageKey,mimeType,byteSize,checksum,width,height,updatedAt) VALUES('asset-a','a','IMAGE','A','restaurants/a/image.png','image/png',12,'checksum-a',20,30,CURRENT_TIMESTAMP),('asset-b','b','IMAGE','B','restaurants/b/image.png','image/png',12,'checksum-b',NULL,NULL,CURRENT_TIMESTAMP);
    INSERT INTO MenuAssetReference(restaurantId,projectId,assetId,scope) VALUES('a','project-a','asset-a','DRAFT');
    INSERT INTO MenuTemplate(id,restaurantId,name,documentJson,updatedAt) VALUES('template-a','a','Template','{}',CURRENT_TIMESTAMP);
    INSERT INTO MenuTemplateAsset(id,templateId,kind,name,storageKey,mimeType,byteSize,checksum,updatedAt) VALUES('template-asset-a','template-a','IMAGE','A','templates/a/image.png','image/png',12,'checksum-a',CURRENT_TIMESTAMP);
    INSERT INTO MenuTemplateAssetReference(restaurantId,templateId,assetId) VALUES('a','template-a','asset-a');
    INSERT INTO LandingPage(id,restaurantId,documentJson,updatedAt) VALUES('landing-a','a','{}',CURRENT_TIMESTAMP);
    INSERT INTO LandingCustomModule(id,restaurantId,name,updatedAt) VALUES('module-a','a','Module',CURRENT_TIMESTAMP);
    INSERT INTO LandingTemplate(id,restaurantId,name,documentJson,updatedAt) VALUES('landing-template-a','a','Template','{}',CURRENT_TIMESTAMP);
    INSERT INTO ReservationTimeSlot(id,restaurantId,time,sortOrder,updatedAt) VALUES('slot-a','a','20:00',-1,CURRENT_TIMESTAMP);
    INSERT INTO ReservationRecurringClosure(id,restaurantId,dayOfWeek,updatedAt) VALUES('closure-a','a',1,CURRENT_TIMESTAMP);
    INSERT INTO ReservationBlockedDate(id,restaurantId,date,updatedAt) VALUES('blocked-a','a','2026-12-25',CURRENT_TIMESTAMP);
    INSERT INTO RestaurantEvent(id,restaurantId,title,date,startTime,updatedAt) VALUES('event-a','a','Dinner','2026-12-20','20:00',CURRENT_TIMESTAMP);
    INSERT INTO TableReservation(id,restaurantId,code,customerName,customerPhone,date,time,eventId,updatedAt) VALUES('reservation-a','a','ABC123','Customer','12345678','2026-12-20','20:00','event-a',CURRENT_TIMESTAMP),('reservation-b','b','ABC123','Customer','12345678','2026-12-20','20:00',NULL,CURRENT_TIMESTAMP);
  `);
}

try {
  const absent = path.join(directory, "absent.db");
  await assertSchemaHardeningPreflight(`file:${absent.replaceAll("\\", "/")}`);
  assert.equal(await stat(absent).catch(() => null), null, "preflight never creates a missing database");

  const fresh = database("fresh");
  await migrate(fresh.client);
  await assertSchemaHardeningPreflight(fresh.url);
  assert.deepEqual((await fresh.client.execute("PRAGMA foreign_key_check")).rows, []);
  assert.equal((await fresh.client.execute("SELECT state FROM AppSchemaState")).rows[0]?.state, "READY");

  const upgrade = database("upgrade");
  await migrate(upgrade.client, hardening);
  await fixture(upgrade.client);
  await assertSchemaHardeningPreflight(upgrade.url);
  const before = await snapshot(upgrade.client);
  await upgrade.client.executeMultiple(sql);
  assert.equal(await snapshot(upgrade.client), before, "all existing values, IDs and relationships survive");
  await assertSchemaHardeningPreflight(upgrade.url);
  assert.deepEqual((await upgrade.client.execute("PRAGMA foreign_key_check")).rows, []);

  const invalidUpdates: Array<[string, string, string]> = [
    ["Admin", "id='admin-a'", "role='UNKNOWN'"], ["Admin", "id='admin-a'", "organizationId=NULL"], ["Admin", "id='super'", "organizationId='org-b'"],
    ["Organization", "id='org-a'", "status='UNKNOWN'"], ["Organization", "id='org-a'", "maxRestaurants=0"],
    ["Restaurant", "id='a'", "status='UNKNOWN'"], ["Restaurant", "id='a'", "assetQuotaBytes=0"], ["Restaurant", "id='a'", "dailyReservationCapacity=0"],
    ["LoginThrottle", "key='login-a'", "failures=-1"], ["AssetCleanupJob", "id='cleanup-a'", "attempts=-1"],
    ["MenuProject", "id='project-a'", "draftRevision=-1"], ["MenuProject", "id='project-a'", "publishedRevision=-1"], ["MenuProject", "id='project-a'", "publishedRevision=3"], ["MenuProject", "id='project-a'", "schemaVersion=0"],
    ["MenuAsset", "id='asset-a'", "kind='UNKNOWN'"], ["MenuAsset", "id='asset-a'", "byteSize=-1"], ["MenuAsset", "id='asset-a'", "width=0"], ["MenuAsset", "id='asset-a'", "height=-1"],
    ["MenuAssetReference", "projectId='project-a'", "scope='UNKNOWN'"],
    ["MenuTemplate", "id='template-a'", "visibility='UNKNOWN'"], ["MenuTemplate", "id='template-a'", "status='UNKNOWN'"], ["MenuTemplate", "id='template-a'", "schemaVersion=0"],
    ["MenuTemplateAsset", "id='template-asset-a'", "kind='UNKNOWN'"], ["MenuTemplateAsset", "id='template-asset-a'", "byteSize=-1"], ["MenuTemplateAsset", "id='template-asset-a'", "width=0"], ["MenuTemplateAsset", "id='template-asset-a'", "height=0"],
    ["LandingTemplate", "id='landing-template-a'", "visibility='UNKNOWN'"], ["LandingTemplate", "id='landing-template-a'", "status='UNKNOWN'"], ["LandingTemplate", "id='landing-template-a'", "schemaVersion=0"],
    ["ReservationRecurringClosure", "id='closure-a'", "dayOfWeek=7"], ["ReservationRecurringClosure", "id='closure-a'", "dayOfWeek=-1"],
    ["RestaurantEvent", "id='event-a'", "capacity=0"], ["RestaurantEvent", "id='event-a'", "capacity=1.5"], ["RestaurantEvent", "id='event-a'", "status='UNKNOWN'"],
    ["TableReservation", "id='reservation-a'", "partySize=0"], ["TableReservation", "id='reservation-a'", "status='UNKNOWN'"], ["TableReservation", "id='reservation-a'", "source='UNKNOWN'"],
  ];
  for (const [table, where, change] of invalidUpdates) {
    await assert.rejects(upgrade.client.execute(`UPDATE "${table}" SET ${change} WHERE ${where}`), /CHECK constraint failed/, `${table}: ${change}`);
  }
  await assert.rejects(upgrade.client.execute("INSERT INTO Admin(id,email,passwordHash,role,updatedAt) VALUES('invalid-admin','invalid@example.test','hash','TENANT_ADMIN',CURRENT_TIMESTAMP)"), /Admin_role_organization_check/);
  await assert.rejects(upgrade.client.execute("INSERT INTO TableReservation(id,restaurantId,code,customerName,customerPhone,partySize,date,time,updatedAt) VALUES('invalid-party','a','INVALID','Customer','12345678',0,'2026-12-21','21:00',CURRENT_TIMESTAMP)"), /TableReservation_partySize_check/);
  await assert.rejects(upgrade.client.execute("INSERT INTO Admin(id,email,passwordHash,role,updatedAt) VALUES('email-duplicate','OWNER@EXAMPLE.TEST','hash','SUPER_ADMIN',CURRENT_TIMESTAMP)"), /UNIQUE constraint failed/);
  await assert.rejects(upgrade.client.execute("INSERT INTO TableReservation(id,restaurantId,code,customerName,customerPhone,date,time,updatedAt) VALUES('code-duplicate','a','ABC123','Customer','12345678','2026-12-21','21:00',CURRENT_TIMESTAMP)"), /UNIQUE constraint failed/);
  await assert.rejects(upgrade.client.execute("UPDATE TableReservation SET restaurantId='a' WHERE id='reservation-b'"), /UNIQUE constraint failed/);
  await assert.rejects(upgrade.client.execute("INSERT INTO MenuAssetReference(restaurantId,projectId,assetId,scope) VALUES('a','project-a','asset-b','PUBLISHED')"), /FOREIGN KEY constraint failed/);
  await assert.rejects(upgrade.client.execute("UPDATE TableReservation SET eventId='event-a' WHERE id='reservation-b'"), /FOREIGN KEY constraint failed/);
  assert.equal(await snapshot(upgrade.client), before, "failed writes leave data intact");

  for (const [query, index] of [
    ["SELECT * FROM MenuTemplateAsset WHERE templateId='template-a'", "MenuTemplateAsset_templateId_idx"],
    ["SELECT * FROM MenuAssetReference WHERE restaurantId='a' AND assetId='asset-a'", "MenuAssetReference_restaurantId_assetId_idx"],
    ["SELECT * FROM MenuAsset WHERE restaurantId='a' AND checksum='checksum-a'", "MenuAsset_restaurantId_checksum_idx"],
  ]) {
    const plan = await upgrade.client.execute(`EXPLAIN QUERY PLAN ${query}`);
    assert(plan.rows.some((row) => String(row.detail).includes(index)), `query uses ${index}`);
  }
  const indices = (await upgrade.client.execute("SELECT name FROM sqlite_schema WHERE type='index'")).rows.map((row) => row.name);
  for (const removed of ["MenuProject_restaurantId_idx", "MenuProject_restaurantId_isPrimary_idx", "LandingPage_restaurantId_idx", "ReservationRecurringClosure_restaurantId_idx", "ReservationBlockedDate_restaurantId_date_idx"]) assert(!indices.includes(removed), `${removed} removed`);
  for (const kept of ["MenuProject_id_restaurantId_key", "MenuAsset_id_restaurantId_key", "MenuTemplate_id_restaurantId_key", "RestaurantEvent_id_restaurantId_key"]) assert(indices.includes(kept), `${kept} preserved`);

  const invalid = database("invalid");
  await migrate(invalid.client, hardening);
  await fixture(invalid.client);
  await invalid.client.executeMultiple(`UPDATE TableReservation SET partySize=0 WHERE id='reservation-a'; INSERT INTO Admin(id,email,passwordHash,role,updatedAt) VALUES('email-conflict','OWNER@EXAMPLE.TEST','hash','SUPER_ADMIN',CURRENT_TIMESTAMP); INSERT INTO TableReservation(id,restaurantId,code,customerName,customerPhone,date,time,updatedAt) VALUES('code-conflict','a','ABC123','Customer','12345678','2026-12-21','21:00',CURRENT_TIMESTAMP);`);
  await assert.rejects(assertSchemaHardeningPreflight(invalid.url), (error: unknown) => error instanceof Error && error.message.includes("TableReservation") && error.message.includes("reservation-a") && error.message.includes("email-conflict") && error.message.includes("code-conflict"));
  const invalidBefore = await snapshot(invalid.client);
  await assert.rejects(invalid.client.executeMultiple(sql), /constraint failed/);
  assert.equal(await snapshot(invalid.client), invalidBefore, "failed migration rolls every change back");
  assert.equal((await invalid.client.execute("SELECT COUNT(*) AS count FROM sqlite_schema WHERE name LIKE 'new_%'")).rows[0]?.count, 0);
  await invalid.client.executeMultiple("PRAGMA foreign_keys=ON; DELETE FROM Admin WHERE id='email-conflict'; DELETE FROM TableReservation WHERE id='code-conflict';");
  const invalidValueBefore = await snapshot(invalid.client);
  await assert.rejects(invalid.client.executeMultiple(sql), /TableReservation_partySize_check/);
  assert.equal(await snapshot(invalid.client), invalidValueBefore, "a late CHECK failure also rolls every table back");

  const orphan = database("orphan");
  await migrate(orphan.client, hardening);
  await fixture(orphan.client);
  await orphan.client.executeMultiple("PRAGMA foreign_keys=OFF; UPDATE MenuAsset SET restaurantId='missing' WHERE id='asset-b'; PRAGMA foreign_keys=ON;");
  await assert.rejects(assertSchemaHardeningPreflight(orphan.url), /Foreign keys inválidas/);
  const orphanBefore = await snapshot(orphan.client);
  await assert.rejects(orphan.client.executeMultiple(sql), /DatabaseHardening_foreign_keys_check/);
  assert.equal(await snapshot(orphan.client), orphanBefore, "foreign-key guard rolls back the migration");

  const legacy = database("generation-one");
  await migrate(legacy.client, organizations);
  await legacy.client.executeMultiple("INSERT INTO Tenant(id,name,slug,updatedAt) VALUES('legacy','Legacy','legacy',CURRENT_TIMESTAMP); INSERT INTO Admin(id,email,passwordHash,role,tenantId,updatedAt) VALUES('legacy-admin','legacy@example.test','hash','TENANT_ADMIN','legacy',CURRENT_TIMESTAMP);");
  await legacy.client.execute({ sql: "INSERT INTO MenuProject(id,tenantId,name,slug,isPrimary,draftJson,updatedAt) VALUES('legacy-project','legacy','Legacy','legacy-menu',1,?,CURRENT_TIMESTAMP)", args: [JSON.stringify(createTemplateDocument("Legacy"))] });
  await assertSchemaHardeningPreflight(legacy.url);
  await legacy.client.executeMultiple(await readFile(path.join(root, organizations, "migration.sql"), "utf8"));
  assert.equal((await legacy.client.execute("SELECT state FROM AppSchemaState")).rows[0]?.state, "MIGRATING");
  await legacy.client.executeMultiple(sql);
  await assertSchemaHardeningPreflight(legacy.url);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["run", "scripts/cutover-organizations.ts"], { env: { ...process.env, DATABASE_URL: legacy.url, STORAGE_ROOT: path.join(directory, "storage") }, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (data) => { output += String(data); });
    child.stderr.on("data", (data) => { output += String(data); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(output)));
  });
  assert.equal((await legacy.client.execute("SELECT state FROM AppSchemaState")).rows[0]?.state, "READY");
  assert.equal((await legacy.client.execute("SELECT COUNT(*) AS count FROM Admin")).rows[0]?.count, 1);
  console.log("Endurecimiento verificado: bases nuevas/existentes/legacy, preservación, constraints, índices, preflight y rollback atómico.");
} finally {
  for (const client of clients) client.close();
  try { await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch (error) {
    if (!(error instanceof Error && "code" in error && ["EBUSY", "EPERM"].includes(String(error.code)))) throw error;
    console.warn(`SQLite mantiene temporalmente bloqueado el directorio descartable: ${directory}`);
  }
}
