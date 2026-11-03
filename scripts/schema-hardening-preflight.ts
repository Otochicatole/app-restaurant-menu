import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";

type Check = { table: string; columns: string[]; valid: string; label: string };
const checks: Check[] = [];
function check(table: string, columns: string[], valid: string, label: string) {
  checks.push({ table, columns, valid, label });
}
function values(table: string, column: string, allowed: string[]) {
  check(table, [column], `"${column}" IN (${allowed.map((value) => `'${value}'`).join(",")})`, `${column} inválido`);
}
function minimum(table: string, column: string, bound: number, nullable = false) {
  check(table, [column], `${nullable ? `"${column}" IS NULL OR ` : ""}(typeof("${column}")='integer' AND "${column}">=${bound})`, `${column} debe ser entero ${nullable ? "o NULL, " : ""}>= ${bound}`);
}

for (const table of ["Organization", "Restaurant"]) values(table, "status", ["ACTIVE", "SUSPENDED"]);
minimum("Organization", "maxRestaurants", 1);
minimum("Restaurant", "assetQuotaBytes", 1);
minimum("Restaurant", "dailyReservationCapacity", 1);
minimum("LoginThrottle", "failures", 0);
minimum("AssetCleanupJob", "attempts", 0);
minimum("MenuProject", "draftRevision", 0);
minimum("MenuProject", "publishedRevision", 0, true);
check("MenuProject", ["publishedRevision", "draftRevision"], `"publishedRevision" IS NULL OR "publishedRevision"<="draftRevision"`, "publishedRevision supera draftRevision");
for (const table of ["MenuProject", "MenuTemplate", "LandingTemplate"]) minimum(table, "schemaVersion", 1);
for (const table of ["MenuAsset", "MenuTemplateAsset"]) {
  values(table, "kind", ["IMAGE", "VIDEO", "FONT"]);
  minimum(table, "byteSize", 0);
  minimum(table, "width", 1, true);
  minimum(table, "height", 1, true);
}
values("MenuAssetReference", "scope", ["DRAFT", "PUBLISHED"]);
for (const table of ["MenuTemplate", "LandingTemplate"]) {
  values(table, "visibility", ["PRIVATE", "PUBLIC"]);
  values(table, "status", ["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"]);
}
check("ReservationRecurringClosure", ["dayOfWeek"], `typeof("dayOfWeek")='integer' AND "dayOfWeek" BETWEEN 0 AND 6`, "dayOfWeek debe estar entre 0 y 6");
minimum("RestaurantEvent", "capacity", 1);
values("RestaurantEvent", "status", ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]);
minimum("TableReservation", "partySize", 1);
values("TableReservation", "status", ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED"]);
minimum("TableReservation", "revision", 0);
minimum("DiningRoom", "revision", 0);
for (const table of ["DiningTable", "DiningTableCombination", "ReservationAllocation"]) minimum(table, "capacity", 1);
minimum("ReservationAllocationTable", "capacitySnapshot", 1);
minimum("ReservationAllocation", "version", 0);
minimum("ReservationAllocation", "roomRevision", 0);
for (const table of ["DiningRoom", "DiningRoomLocation", "DiningTable", "ReservationAllocationTable"]) {
  check(table, ["width", "height"], '"width">0 AND "height">0', "dimensiones no positivas");
}
for (const table of ["DiningRoomLocation", "DiningTable", "DiningTableCombinationMember", "ReservationAllocationTable"]) {
  check(table, ["rotation"], '"rotation" IN (0,90,180,270)', "rotación inválida");
}
values("DiningTable", "shape", ["SQUARE", "RECTANGLE", "CIRCLE"]);
values("ReservationAllocationTable", "shapeSnapshot", ["SQUARE", "RECTANGLE", "CIRCLE"]);
check("ReservationAllocation", ["serviceStartAt", "serviceEndAt", "blockedFrom", "blockedUntil"], '"serviceEndAt">"serviceStartAt" AND "blockedUntil">"blockedFrom" AND "blockedFrom"<="serviceStartAt" AND "blockedUntil">="serviceEndAt"', "intervalos inválidos");

/** Read-only: missing databases and older tables/columns are deliberately skipped. */
export async function assertSchemaHardeningPreflight(databaseUrl: string): Promise<void> {
  assertLocalSqliteUrl(databaseUrl);
  const existing = await stat(path.resolve(databaseUrl.trim().slice("file:".length))).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (!existing) return;
  if (!existing.isFile()) throw new Error("La base SQLite debe ser un archivo regular.");
  const database = createClient({ url: databaseUrl.trim(), timeout: 5_000 });
  try {
    await database.execute("PRAGMA query_only=ON");
    const tables = await database.execute("SELECT name FROM sqlite_schema WHERE type='table'");
    const columns = new Map<string, Set<string>>();
    for (const { name } of tables.rows) {
      const info = await database.execute(`PRAGMA table_info("${String(name).replaceAll('"', '""')}")`);
      columns.set(String(name), new Set(info.rows.map((row) => String(row.name))));
    }
    const problems: string[] = [];
    const hasWaiterScope = columns.get("Admin")?.has("restaurantId");
    const adminChecks: Check[] = [
      { table: "Admin", columns: ["role"], valid: `"role" IN ('SUPER_ADMIN','TENANT_ADMIN'${hasWaiterScope ? ",'WAITER'" : ""})`, label: "role inválido" },
      { table: "Admin", columns: ["role", "organizationId", ...(hasWaiterScope ? ["restaurantId"] : [])],
        valid: hasWaiterScope
          ? `("role"='SUPER_ADMIN' AND "organizationId" IS NULL AND "restaurantId" IS NULL) OR ("role"='TENANT_ADMIN' AND "organizationId" IS NOT NULL AND "restaurantId" IS NULL) OR ("role"='WAITER' AND "organizationId" IS NULL AND "restaurantId" IS NOT NULL)`
          : `("role"='SUPER_ADMIN' AND "organizationId" IS NULL) OR ("role"='TENANT_ADMIN' AND "organizationId" IS NOT NULL)`, label: "rol y alcance incompatibles" },
    ];
    const reservationSource: Check = { table: "TableReservation", columns: ["source"],
      valid: `"source" IN ('ADMIN','LANDING'${columns.has("DiningRoomLocation") ? ",'WALK_IN'" : ""})`, label: "source inválido" };
    for (const rule of [...checks, ...adminChecks, reservationSource]) {
      const available = columns.get(rule.table);
      if (!available || !rule.columns.every((column) => available.has(column))) continue;
      const identity = available.has("id") ? '"id"' : available.has("key") ? '"key"' : available.has("projectId") ? `"projectId" || ':' || "assetId" || ':' || "scope"` : available.has("allocationId") ? `"allocationId" || ':' || "tableId"` : available.has("combinationId") ? `"combinationId" || ':' || "tableId"` : "rowid";
      const invalid = await database.execute(`SELECT ${identity} AS id FROM "${rule.table}" WHERE (${rule.valid}) IS NOT TRUE LIMIT 21`);
      if (invalid.rows.length) problems.push(`${rule.table}: ${rule.label}; IDs: ${invalid.rows.slice(0, 20).map((row) => String(row.id)).join(", ")}${invalid.rows.length > 20 ? ", …" : ""}`);
    }
    if (columns.get("Admin")?.has("email")) {
      const duplicates = await database.execute(`SELECT id FROM Admin WHERE lower(trim(email)) IN (SELECT lower(trim(email)) FROM Admin GROUP BY lower(trim(email)) HAVING COUNT(*)>1) LIMIT 21`);
      if (duplicates.rows.length) problems.push(`Admin: emails duplicados al normalizar mayúsculas/espacios; IDs: ${duplicates.rows.map((row) => String(row.id)).join(", ")}`);
    }
    const reservations = columns.get("TableReservation");
    const owner = reservations?.has("restaurantId") ? "restaurantId" : reservations?.has("tenantId") ? "tenantId" : null;
    if (owner && reservations?.has("code")) {
      const duplicates = await database.execute(`SELECT id FROM TableReservation WHERE ("${owner}",code) IN (SELECT "${owner}",code FROM TableReservation GROUP BY "${owner}",code HAVING COUNT(*)>1) LIMIT 21`);
      if (duplicates.rows.length) problems.push(`TableReservation: códigos duplicados por restaurante; IDs: ${duplicates.rows.map((row) => String(row.id)).join(", ")}`);
    }
    const references = await database.execute("PRAGMA foreign_key_check");
    if (references.rows.length) {
      const identities: string[] = [];
      for (const row of references.rows.slice(0, 20)) {
        const table = String(row.table);
        const identity = columns.get(table)?.has("id") ? "id" : columns.get(table)?.has("key") ? "key" : "rowid";
        const record = await database.execute({ sql: `SELECT "${identity}" AS id FROM "${table.replaceAll('"', '""')}" WHERE rowid=?`, args: [row.rowid] });
        identities.push(`${table} (ID ${String(record.rows[0]?.id ?? row.rowid)})`);
      }
      problems.push(`Foreign keys inválidas: ${identities.join(", ")}`);
    }
    if (problems.length) throw new Error(`No se inició el endurecimiento del esquema. Corregí estos registros antes de migrar:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  } finally {
    database.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("DATABASE_URL es obligatoria.");
    await assertSchemaHardeningPreflight(url);
    console.log("Preflight de integridad correcto.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Falló el preflight de integridad.");
    process.exitCode = 1;
  }
}
