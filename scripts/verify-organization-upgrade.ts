import { mkdtemp, readdir, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@libsql/client";
import { createTemplateDocument } from "../src/modules/menu-editor/domain/template";
import { documentAssetIds, validateCanvasDocument } from "../src/modules/menu-editor/domain/document-policy";
import { getLandingRouteContext, recontextualizeLandingSource } from "../src/modules/landing-management/domain/landing-route-context";

const workspace = await mkdtemp(path.join(os.tmpdir(), "organization-upgrade-test-"));
const storage = path.join(workspace, "storage");
const databaseUrl = `file:${path.join(workspace, "upgrade.db").replaceAll("\\", "/")}`;
const database = createClient({ url: databaseUrl });
const migrationsRoot = path.resolve("prisma/migrations");
const migrations = (await readdir(migrationsRoot)).filter((name) => /^\d/.test(name)).sort();
const cutover = "20261027180000_organization_restaurants";
try {
  for (const name of migrations.filter((name) => name < cutover)) await database.executeMultiple(await readFile(path.join(migrationsRoot, name, "migration.sql"), "utf8"));
  const document = createTemplateDocument("Sucursal");
  const text = document.nodes.find((node) => node.type === "text");
  if (text?.type === "text") text.modalAssetId = "legacy-asset";
  await database.executeMultiple(`
    INSERT INTO Tenant(id,name,slug,status,multiMenuEnabled,maxMenus,landingEnabled,dailyReservationCapacity,createdAt,updatedAt) VALUES('legacy-org','Franquicia','landing-original','ACTIVE',1,1,1,37,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO Tenant(id,name,slug,status,createdAt,updatedAt) VALUES('empty-org','Sin carta','segunda-carta','SUSPENDED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO Admin(id,email,passwordHash,role,tenantId,createdAt,updatedAt) VALUES('legacy-admin','admin@upgrade.test','preserved-hash','TENANT_ADMIN','legacy-org',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO Session(id,adminId,jti,expiresAt,createdAt) VALUES('legacy-session','legacy-admin','preserved-jti','2099-01-01',CURRENT_TIMESTAMP);
    INSERT INTO LandingPage(id,tenantId,htmlContent,published,publishedAt,createdAt,updatedAt) VALUES('legacy-landing','legacy-org','<h1>Original</h1>',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO ReservationTimeSlot(id,tenantId,time,createdAt,updatedAt) VALUES('legacy-slot','legacy-org','20:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO RestaurantEvent(id,tenantId,title,date,startTime,createdAt,updatedAt) VALUES('legacy-event','legacy-org','Cena','2026-11-01','20:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO TableReservation(id,tenantId,code,customerName,customerPhone,date,time,eventId,createdAt,updatedAt) VALUES('legacy-reservation','legacy-org','ABC123','Cliente','12345678','2026-11-01','20:00','legacy-event',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO MenuAsset(id,tenantId,kind,name,storageKey,mimeType,byteSize,checksum,createdAt,updatedAt) VALUES('legacy-asset','legacy-org','IMAGE','Compartido','tenants/legacy-org/shared.png','image/png',4,'fixture',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const [id, slug, primary] of [["primary-menu", "carta-original", 1], ["second-menu", "segunda-carta", 0]] as const) {
    await database.execute({ sql: "INSERT INTO MenuProject(id,tenantId,name,slug,isPrimary,draftJson,publishedJson,publishedRevision,publishedAt,createdAt,updatedAt) VALUES(?,'legacy-org',?,?,?, ?,?,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", args: [id, slug, slug, primary, JSON.stringify(document), JSON.stringify(document)] });
    for (const scope of ["DRAFT", "PUBLISHED"]) await database.execute({ sql: "INSERT INTO MenuAssetReference(tenantId,projectId,assetId,scope) VALUES('legacy-org',?,'legacy-asset',?)", args: [id, scope] });
  }
  await database.execute({ sql: "INSERT INTO MenuTemplate(id,tenantId,name,documentJson,visibility,status,createdAt,updatedAt) VALUES('private-template','legacy-org','Privada',?,'PRIVATE','DRAFT',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", args: [JSON.stringify(document)] });
  await database.execute("INSERT INTO MenuTemplateAssetReference(tenantId,templateId,assetId) VALUES('legacy-org','private-template','legacy-asset')");
  await mkdir(path.join(storage, "tenants/legacy-org/landing"), { recursive: true });
  const legacyHtml = '<a href="/m/landing-original">Carta</a><script>fetch("/api/public/landing/landing-original/reservations")</script>';
  for (const name of ["index.html", "style.css", "script.js"]) await writeFile(path.join(storage, "tenants/legacy-org/landing", name), name === "index.html" ? legacyHtml : name);
  assert(await runCutover(false, ["--preflight"]) !== 0, "preflight detecta archivos faltantes");
  assert((await database.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name='Tenant'")).rows.length === 1, "preflight conserva esquema original");
  await writeFile(path.join(storage, "tenants/legacy-org/shared.png"), "test");
  await runCutover(true, ["--preflight"]);
  await database.executeMultiple(await readFile(path.join(migrationsRoot, cutover, "migration.sql"), "utf8"));
  assert((await database.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '_OrganizationLegacy_%'")).rows.length === 0, "SQL no deja tablas transitorias que provoquen drift");
  assert(Boolean((await database.execute("SELECT migrationJson FROM AppSchemaState")).rows[0]?.migrationJson), "backfill durable después de SQL");
  await rm(path.join(storage, "tenants/legacy-org/shared.png"));
  const failed = await runCutover(false);
  if (failed === 0) throw new Error("El backfill no detectó el archivo faltante.");
  if ((await database.execute("SELECT state FROM AppSchemaState")).rows[0]?.state !== "MIGRATING") throw new Error("Un cutover incompleto quedó habilitado.");
  await writeFile(path.join(storage, "tenants/legacy-org/shared.png"), "test");
  await runCutover();
  await runCutover();
  assert((await database.execute("SELECT COUNT(*) AS count FROM Organization")).rows[0]?.count === 2, "organizaciones");
  assert((await database.execute("SELECT COUNT(*) AS count FROM Restaurant")).rows[0]?.count === 3, "restaurantes y cuenta sin carta");
  assert((await database.execute("SELECT maxRestaurants FROM Organization WHERE id='legacy-org'")).rows[0]?.maxRestaurants === 2, "cupo conserva restaurantes existentes");
  assert((await database.execute("SELECT COUNT(*) AS count FROM Restaurant WHERE organizationId='legacy-org' AND dailyReservationCapacity=37")).rows[0]?.count === 2, "capacidad diaria heredada en principal y secundarios");
  assert((await database.execute("SELECT dailyReservationCapacity FROM Restaurant WHERE id='restaurant-empty-org'")).rows[0]?.dailyReservationCapacity === 50, "capacidad diaria predeterminada preservada");
  assert((await database.execute("SELECT landingSlug FROM Restaurant WHERE id='primary-menu'")).rows[0]?.landingSlug === "landing-original", "URL pública de landing");
  assert((await database.execute("SELECT slug FROM MenuProject WHERE id='primary-menu'")).rows[0]?.slug === "carta-original", "URL pública de carta");
  assert((await database.execute("SELECT landingSlug FROM Restaurant WHERE id='restaurant-empty-org'")).rows[0]?.landingSlug === "segunda-carta", "landing primaria conserva URL ante colisión");
  assert((await database.execute("SELECT landingSlug FROM Restaurant WHERE id='second-menu'")).rows[0]?.landingSlug === "segunda-carta-1", "landing secundaria resuelve colisión");
  assert((await database.execute("SELECT slug FROM Restaurant WHERE id='restaurant-empty-org'")).rows[0]?.slug === "segunda-carta-1", "carta nueva sin menú resuelve colisión");
  const publishedHtml = await readFile(path.join(storage, "restaurants/primary-menu/landing/index.html"), "utf8");
  assert(getLandingRouteContext(publishedHtml)?.menuSlug === "landing-original", "contexto de publicación conservado");
  const currentHtml = recontextualizeLandingSource(publishedHtml, { menuSlug: "carta-original", landingSlug: "landing-renombrada" });
  assert(currentHtml.includes('href="/m/carta-original"') && currentHtml.includes("/api/public/landing/landing-renombrada/reservations"), "rutas publicadas funcionan sin republicar");
  assert(await readFile(path.join(storage, "tenants/legacy-org/landing/index.html"), "utf8") === legacyHtml, "HTML original intacto para rollback");
  assert((await database.execute("SELECT restaurantId FROM TableReservation")).rows[0]?.restaurantId === "primary-menu", "reservas solo en principal");
  assert((await database.execute("SELECT COUNT(*) AS count FROM TableReservation")).rows[0]?.count === 1, "reservas sin duplicados");
  assert((await database.execute("SELECT COUNT(*) AS count FROM MenuTemplate WHERE visibility='PRIVATE'")).rows[0]?.count === 2, "plantillas privadas copiadas");
  assert((await database.execute("SELECT passwordHash,organizationId FROM Admin")).rows[0]?.passwordHash === "preserved-hash", "contraseña preservada");
  assert((await database.execute("SELECT jti FROM Session")).rows[0]?.jti === "preserved-jti", "sesión preservada");
  const projects = await database.execute("SELECT id,restaurantId,draftJson,publishedJson FROM MenuProject");
  for (const project of projects.rows) {
    for (const json of [project.draftJson, project.publishedJson]) {
      if (!json) continue;
      const ids = documentAssetIds(validateCanvasDocument(JSON.parse(String(json))));
      for (const id of ids) {
        const asset = await database.execute({ sql: "SELECT storageKey FROM MenuAsset WHERE id=? AND restaurantId=?", args: [id, project.restaurantId] });
        assert(asset.rows.length === 1, "referencias aisladas");
        assert(await readFile(path.join(storage, String(asset.rows[0]!.storageKey)), "utf8") === "test", "copias físicas");
      }
    }
  }
  assert((await database.execute("PRAGMA foreign_key_check")).rows.length === 0, "foreign keys");
  assert((await database.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE '_OrganizationLegacy_%'")).rows.length === 0, "tablas temporales eliminadas");
  assert((await database.execute("SELECT state FROM AppSchemaState")).rows[0]?.state === "READY", "estado final");
  assert((await database.execute("SELECT migrationJson FROM AppSchemaState")).rows[0]?.migrationJson == null, "metadata de backfill eliminada al finalizar");
  assert(await readFile(path.join(storage, "tenants/legacy-org/shared.png"), "utf8") === "test", "orígenes conservados para rollback");
  console.log("Migración de organizaciones verificada: upgrade, URLs, sesiones, reservas, bibliotecas, recuperación e idempotencia.");
} finally {
  database.close();
  try { await rm(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch (error) {
    if (!(error instanceof Error && "code" in error && ["EBUSY", "EPERM"].includes(String(error.code)))) throw error;
    console.warn(`SQLite mantiene temporalmente bloqueado el directorio descartable: ${workspace}`);
  }
}

function assert(value: boolean, label: string): asserts value {
  if (!value) throw new Error(`Falló la verificación: ${label}`);
}

async function runCutover(required = true, args: string[] = []): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["run", "scripts/cutover-organizations.ts", ...args], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl, STORAGE_ROOT: storage }, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    child.once("error", reject);
    child.once("exit", (code) => code !== 0 && required ? reject(new Error(output)) : resolve(code));
  });
}
