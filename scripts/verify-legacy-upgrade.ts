import { spawn } from "node:child_process";
import { copyFile, cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";

const SCRIPT_DIRECTORY = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const MIGRATIONS_ROOT = path.join(PROJECT_ROOT, "prisma", "migrations");
const TEMPORARY_PARENT = path.join(tmpdir(), "app-restaurant-menu-migration-tests");

const LEGACY_MIGRATIONS = [
  "20260807163132_init",
  "20260807171342_add_sessions",
  "20260807173939_add_group_description",
  "20260811221319_add_home_page",
  "20260811223444_add_featured_products",
  "20260811234127_add_product_sort_order",
] as const;

const NEW_MIGRATIONS = [
  "20260817160637_add_product_media",
  "20260817164757_add_fonts_and_settings",
  "20260825120000_multi_tenant",
  "20260827193000_architecture_hardening",
  "20260827213000_sqlite_deployment_fix",
] as const;

const PRE_TENANT_MIGRATIONS = [
  ...LEGACY_MIGRATIONS,
  NEW_MIGRATIONS[0],
  NEW_MIGRATIONS[1],
] as const;
const ALL_MIGRATIONS = [...LEGACY_MIGRATIONS, ...NEW_MIGRATIONS] as const;

const REQUIRED_TABLES = [
  "_prisma_migrations",
  "Admin",
  "AssetCleanupJob",
  "FeaturedProduct",
  "Font",
  "Group",
  "HomePage",
  "LoginThrottle",
  "Product",
  "Session",
  "Setting",
  "Tenant",
] as const;

const REQUIRED_INDEXES = [
  "Admin_email_key",
  "Admin_tenantId_key",
  "AssetCleanupJob_availableAt_idx",
  "AssetCleanupJob_storageKey_key",
  "FeaturedProduct_id_tenantId_key",
  "FeaturedProduct_tenantId_idx",
  "FeaturedProduct_tenantId_position_key",
  "FeaturedProduct_tenant_product_key",
  "Font_system_name_unique",
  "Font_tenantId_idx",
  "Font_tenantId_name_key",
  "Group_id_tenantId_key",
  "Group_tenantId_idx",
  "Group_tenantId_name_key",
  "HomePage_tenantId_key",
  "LoginThrottle_updatedAt_idx",
  "Product_id_tenantId_key",
  "Product_tenantId_groupId_idx",
  "Product_tenantId_idx",
  "Session_adminId_idx",
  "Session_expiresAt_idx",
  "Session_jti_key",
  "Tenant_slug_key",
] as const;

await assertExpectedMigrationLayout();
await mkdir(TEMPORARY_PARENT, { recursive: true });
const temporaryRoot = await mkdtemp(path.join(TEMPORARY_PARENT, "legacy-upgrade-"));
assertOwnedTemporaryRoot(temporaryRoot);

const databasePath = path.join(temporaryRoot, "legacy-upgrade-test.db");
const databaseUrl = `file:${databasePath.replaceAll(path.sep, "/")}`;

try {
  const legacyConfig = await createPhaseConfig(temporaryRoot, "legacy", LEGACY_MIGRATIONS);
  await deployMigrations(legacyConfig, "six legacy migrations");
  await withDatabase(databaseUrl, async (client) => {
    await assertAppliedMigrations(client, LEGACY_MIGRATIONS);
    await seedLegacyCore(client);
  });

  const preTenantConfig = await createPhaseConfig(temporaryRoot, "pre-tenant", PRE_TENANT_MIGRATIONS);
  await deployMigrations(preTenantConfig, "media and font migrations");
  await withDatabase(databaseUrl, async (client) => {
    await assertAppliedMigrations(client, PRE_TENANT_MIGRATIONS);
    await seedLegacyMediaAndCustomization(client);
  });

  const fullConfig = await createPhaseConfig(temporaryRoot, "full", ALL_MIGRATIONS);
  await deployMigrations(fullConfig, "multi-tenant and hardening migrations");

  let stateBeforeReplay: unknown;
  await withDatabase(databaseUrl, async (client) => {
    await assertAppliedMigrations(client, ALL_MIGRATIONS);
    await verifyPreservedData(client);
    await verifySchemaObjects(client);
    await verifyConstraints(client);
    await verifyForeignKeysAndCascades(client);
    await verifyDatabaseIntegrity(client);
    stateBeforeReplay = await captureState(client);
  });

  await deployMigrations(fullConfig, "idempotent replay");

  await withDatabase(databaseUrl, async (client) => {
    await assertAppliedMigrations(client, ALL_MIGRATIONS);
    const stateAfterReplay = await captureState(client);
    assertDeepEqual(stateAfterReplay, stateBeforeReplay, "A second migrate deploy changed the upgraded database.");
    await verifyDatabaseIntegrity(client);
  });

  await verifyFreshMigrationHistory(temporaryRoot);

  console.log(
    `SQLite migrations verified: fresh install and ${LEGACY_MIGRATIONS.length} legacy + ${NEW_MIGRATIONS.length} upgrade; replays are idempotent.`,
  );
} finally {
  assertOwnedTemporaryRoot(temporaryRoot);
  if (process.env.KEEP_LEGACY_UPGRADE_DATABASE === "1") {
    console.log(`Retained legacy upgrade workspace for diagnostics: ${temporaryRoot}`);
  } else {
    // libSQL's native Windows binding releases its final directory handle on GC,
    // even after every client has been explicitly closed.
    const bunRuntime = (globalThis as typeof globalThis & { Bun?: { gc(force?: boolean): void } }).Bun;
    bunRuntime?.gc(true);
    await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

async function assertExpectedMigrationLayout(): Promise<void> {
  const entries = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  const actual = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const expected = [...ALL_MIGRATIONS].sort();
  assertDeepEqual(actual, expected, "The SQLite migration history no longer matches the verifier. Update both together.");
}

async function createPhaseConfig(
  temporaryRoot: string,
  phase: string,
  migrations: readonly string[],
  phaseDatabaseUrl = databaseUrl,
): Promise<string> {
  const phaseRoot = path.join(temporaryRoot, phase);
  const phaseMigrations = path.join(phaseRoot, "migrations");
  const phaseSchema = path.join(phaseRoot, "schema.prisma");
  const phaseConfig = path.join(phaseRoot, "prisma.config.ts");

  await mkdir(phaseMigrations, { recursive: true });
  await copyFile(path.join(MIGRATIONS_ROOT, "migration_lock.toml"), path.join(phaseMigrations, "migration_lock.toml"));
  await writeFile(phaseSchema, 'datasource db {\n  provider = "sqlite"\n}\n', {
    encoding: "utf8",
    flag: "wx",
  });
  for (const migration of migrations) {
    await cp(path.join(MIGRATIONS_ROOT, migration), path.join(phaseMigrations, migration), {
      recursive: true,
      errorOnExist: true,
    });
  }

  const configSource = [
    "export default {",
    `  schema: ${JSON.stringify(toConfigPath(phaseSchema))},`,
    "  migrations: {",
    `    path: ${JSON.stringify(toConfigPath(phaseMigrations))},`,
    "  },",
    "  datasource: {",
    `    url: ${JSON.stringify(phaseDatabaseUrl)},`,
    "  },",
    "};",
    "",
  ].join("\n");
  await writeFile(phaseConfig, configSource, { encoding: "utf8", flag: "wx" });
  return phaseConfig;
}

async function verifyFreshMigrationHistory(temporaryRoot: string): Promise<void> {
  const freshDatabasePath = path.join(temporaryRoot, "fresh-install-test.db");
  const freshDatabaseUrl = `file:${freshDatabasePath.replaceAll(path.sep, "/")}`;
  const freshConfig = await createPhaseConfig(temporaryRoot, "fresh", ALL_MIGRATIONS, freshDatabaseUrl);

  await deployMigrations(freshConfig, "fresh SQLite history");
  let stateBeforeReplay: unknown;
  await withDatabase(freshDatabaseUrl, async (client) => {
    await assertAppliedMigrations(client, ALL_MIGRATIONS);
    for (const table of [
      "Admin",
      "AssetCleanupJob",
      "FeaturedProduct",
      "Font",
      "Group",
      "HomePage",
      "LoginThrottle",
      "Product",
      "Session",
      "Setting",
      "Tenant",
    ] as const) {
      assertEqual(await countRows(client, table), 0, `Fresh migration unexpectedly populated ${table}.`);
    }
    await verifySchemaObjects(client);
    await verifyDatabaseIntegrity(client);
    stateBeforeReplay = await captureState(client);
  });

  await deployMigrations(freshConfig, "fresh idempotent replay");
  await withDatabase(freshDatabaseUrl, async (client) => {
    await assertAppliedMigrations(client, ALL_MIGRATIONS);
    assertDeepEqual(
      await captureState(client),
      stateBeforeReplay,
      "A second migrate deploy changed the fresh database.",
    );
    await verifyDatabaseIntegrity(client);
  });
}

async function deployMigrations(configPath: string, label: string): Promise<void> {
  const environment = { ...process.env };
  delete environment.DATABASE_URL;
  if (process.platform === "win32") {
    environment.RUST_LOG = "trace";
    environment.RUST_BACKTRACE = "full";
  }
  await runCommand(
    process.execPath,
    ["x", "prisma", "migrate", "deploy", "--config", configPath],
    environment,
  );
  console.log(`Applied ${label}.`);
}

function runCommand(
  command: string,
  arguments_: string[],
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: PROJECT_ROOT,
      env: environment,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code ?? "signal"}): ${command} ${arguments_.join(" ")}`));
    });
  });
}

async function withDatabase<T>(databaseUrl: string, operation: (client: Client) => Promise<T>): Promise<T> {
  const client = createClient({ url: databaseUrl });
  try {
    await client.execute("PRAGMA foreign_keys = ON");
    return await operation(client);
  } finally {
    client.close();
  }
}

async function seedLegacyCore(client: Client): Promise<void> {
  await client.executeMultiple(`
    INSERT INTO "Admin" ("id", "email", "passwordHash", "createdAt", "updatedAt") VALUES
      ('legacy-admin', 'OWNER@EXAMPLE.COM', 'legacy-owner-hash', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('legacy-super', 'SECONDARY@EXAMPLE.COM', 'legacy-super-hash', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    INSERT INTO "Session" ("id", "adminId", "jti", "expiresAt", "revoked", "createdAt") VALUES
      ('legacy-session-owner', 'legacy-admin', 'legacy-jti-owner', '2030-01-01T00:00:00.000Z', false, '2026-01-01T00:00:00.000Z'),
      ('legacy-session-super', 'legacy-super', 'legacy-jti-super', '2030-01-02T00:00:00.000Z', true, '2026-01-02T00:00:00.000Z');

    INSERT INTO "Group" ("id", "name", "description", "createdAt", "updatedAt") VALUES
      ('legacy-group', 'Bebidas', 'Bebidas legacy', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('legacy-group-food', 'Comidas', 'Comidas legacy', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    INSERT INTO "Product" ("id", "name", "description", "price", "groupId", "sortOrder", "createdAt", "updatedAt") VALUES
      ('legacy-product', 'Café legacy', 'Producto destacado', 10.5, 'legacy-group', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('legacy-invalid-product', 'Producto inválido', 'Slot inválido', 12, 'legacy-group', 1, '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
      ('legacy-media-product', 'Producto con media', 'Media válida', 15, 'legacy-group-food', 0, '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z'),
      ('legacy-broken-media-product', 'Producto con media rota', 'Media a normalizar', 16, 'legacy-group-food', 1, '2026-01-04T00:00:00.000Z', '2026-01-04T00:00:00.000Z');

    INSERT INTO "HomePage" ("id", "title", "description", "createdAt", "updatedAt") VALUES
      ('legacy-home', 'Carta legacy', 'Descripción preservada', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

    INSERT INTO "FeaturedProduct" ("id", "position", "productId", "createdAt", "updatedAt") VALUES
      ('legacy-featured-1', 1, 'legacy-product', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('legacy-featured-2', 2, 'legacy-product', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
      ('legacy-featured-invalid', 4, 'legacy-invalid-product', '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z');
  `);
  assertEqual(await countRows(client, "Admin"), 2, "Legacy admins were not seeded.");
  assertEqual(await countRows(client, "Product"), 4, "Legacy products were not seeded.");
  assertEqual(await countRows(client, "FeaturedProduct"), 3, "Legacy highlights were not seeded.");
}

async function seedLegacyMediaAndCustomization(client: Client): Promise<void> {
  await client.executeMultiple(`
    UPDATE "Product" SET "mediaPath" = 'products/legacy-image.png', "mediaType" = 'image'
     WHERE "id" = 'legacy-media-product';
    UPDATE "Product" SET "mediaPath" = 'products/legacy-document.pdf', "mediaType" = 'document'
     WHERE "id" = 'legacy-broken-media-product';

    INSERT INTO "Font" ("id", "name", "category", "source", "googleFamily", "fontFamily", "weights", "filePath", "createdAt", "updatedAt") VALUES
      ('legacy-font-google', 'Legacy Google', 'serif', 'google', 'Legacy Google', '"Legacy Google", serif', '400;700', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('legacy-font-custom', 'Legacy Custom', 'display', 'custom', NULL, 'LegacyCustom', '400', 'fonts/legacy-custom.woff2', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    INSERT INTO "Setting" ("key", "value", "createdAt", "updatedAt") VALUES
      ('menu.font.primary', 'legacy-font-custom', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
  `);
}

async function verifyPreservedData(client: Client): Promise<void> {
  const tenant = await queryOne(client, `SELECT "id", "name", "slug", "status" FROM "Tenant" WHERE "id" = 'legacy-fuzion'`);
  assertDeepEqual(tenant, { id: "legacy-fuzion", name: "Fuzion", slug: "fuzion", status: "ACTIVE" }, "The legacy tenant was not created correctly.");

  const admins = await queryRows(client, `
    SELECT "id", "email", "role", "tenantId", "mustChangePassword"
      FROM "Admin" WHERE "id" LIKE 'legacy-%' ORDER BY "id"
  `);
  assertDeepEqual(admins, [
    { id: "legacy-admin", email: "owner@example.com", role: "TENANT_ADMIN", tenantId: "legacy-fuzion", mustChangePassword: 0 },
    { id: "legacy-super", email: "secondary@example.com", role: "SUPER_ADMIN", tenantId: null, mustChangePassword: 0 },
  ], "Legacy accounts were not preserved or classified correctly.");

  assertEqual(await countRows(client, "Session"), 2, "Legacy sessions were not preserved.");
  assertEqual(await countRows(client, "Group"), 2, "Legacy groups were not preserved.");
  assertEqual(await countRows(client, "Product"), 4, "Legacy products were not preserved.");
  assertEqual(await countRows(client, "HomePage"), 1, "The legacy home page was not preserved.");
  assertEqual(await countRows(client, "Font"), 2, "Legacy fonts were not preserved.");
  assertEqual(await countRows(client, "Setting"), 1, "Legacy settings were not preserved.");

  const validMedia = await queryOne(client, `
    SELECT "tenantId", "groupId", "price", "sortOrder", "mediaPath", "mediaType"
      FROM "Product" WHERE "id" = 'legacy-media-product'
  `);
  assertDeepEqual(validMedia, {
    tenantId: "legacy-fuzion",
    groupId: "legacy-group-food",
    price: 15,
    sortOrder: 0,
    mediaPath: "products/legacy-image.png",
    mediaType: "image",
  }, "Valid legacy media was not preserved.");

  const normalizedMedia = await queryOne(client, `
    SELECT "mediaPath", "mediaType" FROM "Product" WHERE "id" = 'legacy-broken-media-product'
  `);
  assertDeepEqual(normalizedMedia, { mediaPath: null, mediaType: null }, "Invalid legacy media was not normalized safely.");

  const featured = await queryRows(client, `
    SELECT "id", "tenantId", "productId", "position" FROM "FeaturedProduct" ORDER BY "position"
  `);
  assertDeepEqual(featured, [{
    id: "legacy-featured-1",
    tenantId: "legacy-fuzion",
    productId: "legacy-product",
    position: 1,
  }], "The highlight migration did not preserve the lowest valid slot.");

  const fonts = await queryRows(client, `
    SELECT "id", "tenantId", "source", "filePath" FROM "Font" ORDER BY "id"
  `);
  assertDeepEqual(fonts, [
    { id: "legacy-font-custom", tenantId: "legacy-fuzion", source: "custom", filePath: "fonts/legacy-custom.woff2" },
    { id: "legacy-font-google", tenantId: null, source: "google", filePath: null },
  ], "Legacy font ownership was not preserved.");

  const setting = await queryOne(client, `
    SELECT "tenantId", "key", "value" FROM "Setting" WHERE "key" = 'menu.font.primary'
  `);
  assertDeepEqual(setting, {
    tenantId: "legacy-fuzion",
    key: "menu.font.primary",
    value: "legacy-font-custom",
  }, "Legacy settings were not assigned to the legacy tenant.");
}

async function verifySchemaObjects(client: Client): Promise<void> {
  const tables = (await queryRows(client, `SELECT "name" FROM "sqlite_schema" WHERE "type" = 'table' ORDER BY "name"`))
    .map((row) => String(row.name));
  assertNames("tables", REQUIRED_TABLES, tables);
  const indexes = (await queryRows(client, `
    SELECT "name" FROM "sqlite_schema"
     WHERE "type" = 'index' AND "name" NOT LIKE 'sqlite_autoindex_%' ORDER BY "name"
  `)).map((row) => String(row.name));
  assertNames("indexes", REQUIRED_INDEXES, indexes);

  await assertTableSqlContains(client, "Admin", ["Admin_role_check", "Admin_role_tenant_check"]);
  await assertTableSqlContains(client, "Tenant", ["Tenant_status_check"]);
  await assertTableSqlContains(client, "Product", ["Product_price_check", "Product_sortOrder_check", "Product_media_check"]);
  await assertTableSqlContains(client, "FeaturedProduct", ["FeaturedProduct_position_check"]);
  await assertTableSqlContains(client, "Font", ["Font_category_check", "Font_source_check"]);
  await assertTableSqlContains(client, "AssetCleanupJob", ["AssetCleanupJob_attempts_check"]);
}

async function verifyConstraints(client: Client): Promise<void> {
  await expectConstraintFailure(client, "case-insensitive admin email uniqueness", `
    INSERT INTO "Admin" ("id", "email", "passwordHash", "role", "tenantId", "mustChangePassword", "createdAt", "updatedAt")
    VALUES ('rejected-email', 'OWNER@example.com', 'hash', 'SUPER_ADMIN', NULL, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "case-insensitive tenant slug uniqueness", `
    INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
    VALUES ('rejected-slug', 'Rejected', 'FUZION', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "tenant status check", `
    INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
    VALUES ('rejected-status', 'Rejected', 'rejected-status', 'DELETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "superadmin tenant check", `
    INSERT INTO "Admin" ("id", "email", "passwordHash", "role", "tenantId", "mustChangePassword", "createdAt", "updatedAt")
    VALUES ('rejected-super', 'rejected-super@example.com', 'hash', 'SUPER_ADMIN', 'legacy-fuzion', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "tenant admin ownership check", `
    INSERT INTO "Admin" ("id", "email", "passwordHash", "role", "tenantId", "mustChangePassword", "createdAt", "updatedAt")
    VALUES ('rejected-tenant-admin', 'rejected-tenant@example.com', 'hash', 'TENANT_ADMIN', NULL, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "case-insensitive group uniqueness", `
    INSERT INTO "Group" ("id", "tenantId", "name", "description", "createdAt", "updatedAt")
    VALUES ('rejected-group', 'legacy-fuzion', 'bebidas', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "highlight product uniqueness", `
    INSERT INTO "FeaturedProduct" ("id", "tenantId", "position", "productId", "createdAt", "updatedAt")
    VALUES ('rejected-featured-product', 'legacy-fuzion', 2, 'legacy-product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "highlight position uniqueness", `
    INSERT INTO "FeaturedProduct" ("id", "tenantId", "position", "productId", "createdAt", "updatedAt")
    VALUES ('rejected-featured-position', 'legacy-fuzion', 1, 'legacy-invalid-product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "highlight position check", `
    INSERT INTO "FeaturedProduct" ("id", "tenantId", "position", "productId", "createdAt", "updatedAt")
    VALUES ('rejected-featured-slot', 'legacy-fuzion', 4, 'legacy-invalid-product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "negative product price", `UPDATE "Product" SET "price" = -1 WHERE "id" = 'legacy-product'`);
  await expectConstraintFailure(client, "negative product order", `UPDATE "Product" SET "sortOrder" = -1 WHERE "id" = 'legacy-product'`);
  await expectConstraintFailure(client, "incomplete media reference", `
    UPDATE "Product" SET "mediaPath" = 'products/rejected.png', "mediaType" = NULL WHERE "id" = 'legacy-product'
  `);
  await expectConstraintFailure(client, "global font uniqueness", `
    INSERT INTO "Font" ("id", "tenantId", "name", "category", "source", "fontFamily", "weights", "createdAt", "updatedAt")
    VALUES ('rejected-global-font', NULL, 'legacy google', 'serif', 'google', 'serif', '400', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "font category check", `
    INSERT INTO "Font" ("id", "tenantId", "name", "category", "source", "fontFamily", "weights", "createdAt", "updatedAt")
    VALUES ('rejected-font-category', 'legacy-fuzion', 'Rejected category', 'unknown', 'custom', 'sans-serif', '400', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "negative cleanup attempts", `
    INSERT INTO "AssetCleanupJob" ("id", "storageKey", "deletePrefix", "attempts", "availableAt", "createdAt", "updatedAt")
    VALUES ('rejected-cleanup-attempts', 'rejected.bin', false, -1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  await client.execute(`
    INSERT INTO "AssetCleanupJob" ("id", "storageKey", "deletePrefix", "attempts", "availableAt", "createdAt", "updatedAt")
    VALUES ('cleanup-fixture', 'cleanup-fixture.bin', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await expectConstraintFailure(client, "cleanup job idempotency", `
    INSERT INTO "AssetCleanupJob" ("id", "storageKey", "deletePrefix", "attempts", "availableAt", "createdAt", "updatedAt")
    VALUES ('cleanup-fixture-duplicate', 'cleanup-fixture.bin', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await client.execute(`DELETE FROM "AssetCleanupJob" WHERE "id" = 'cleanup-fixture'`);
}

async function verifyForeignKeysAndCascades(client: Client): Promise<void> {
  const productForeignKeys = await queryRows(client, `PRAGMA foreign_key_list("Product")`);
  assertCompositeForeignKey(productForeignKeys, "Group", [["groupId", "id"], ["tenantId", "tenantId"]]);
  const featuredForeignKeys = await queryRows(client, `PRAGMA foreign_key_list("FeaturedProduct")`);
  assertCompositeForeignKey(featuredForeignKeys, "Product", [["productId", "id"], ["tenantId", "tenantId"]]);

  await client.executeMultiple(`
    INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
    VALUES ('boundary-tenant', 'Boundary', 'boundary-tenant', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Group" ("id", "tenantId", "name", "description", "createdAt", "updatedAt")
    VALUES ('boundary-group', 'boundary-tenant', 'Boundary group', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);
  await expectConstraintFailure(client, "cross-tenant product group", `
    INSERT INTO "Product" ("id", "tenantId", "name", "description", "price", "groupId", "sortOrder", "createdAt", "updatedAt")
    VALUES ('rejected-cross-tenant-product', 'legacy-fuzion', 'Rejected', '', 1, 'boundary-group', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await client.execute(`DELETE FROM "Tenant" WHERE "id" = 'boundary-tenant'`);

  await client.executeMultiple(`
    INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
    VALUES ('cascade-tenant', 'Cascade', 'cascade-tenant', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Admin" ("id", "email", "passwordHash", "role", "tenantId", "mustChangePassword", "createdAt", "updatedAt")
    VALUES ('cascade-admin', 'cascade@example.com', 'hash', 'TENANT_ADMIN', 'cascade-tenant', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Session" ("id", "adminId", "jti", "expiresAt", "revoked", "createdAt")
    VALUES ('cascade-session', 'cascade-admin', 'cascade-jti', '2030-01-01T00:00:00.000Z', false, CURRENT_TIMESTAMP);
    INSERT INTO "Group" ("id", "tenantId", "name", "description", "createdAt", "updatedAt")
    VALUES ('cascade-group', 'cascade-tenant', 'Cascade group', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Product" ("id", "tenantId", "name", "description", "price", "groupId", "sortOrder", "createdAt", "updatedAt")
    VALUES ('cascade-product', 'cascade-tenant', 'Cascade product', '', 1, 'cascade-group', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "FeaturedProduct" ("id", "tenantId", "position", "productId", "createdAt", "updatedAt")
    VALUES ('cascade-featured', 'cascade-tenant', 1, 'cascade-product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "HomePage" ("id", "tenantId", "title", "description", "createdAt", "updatedAt")
    VALUES ('cascade-home', 'cascade-tenant', 'Cascade', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Font" ("id", "tenantId", "name", "category", "source", "fontFamily", "weights", "createdAt", "updatedAt")
    VALUES ('cascade-font', 'cascade-tenant', 'Cascade font', 'display', 'custom', 'CascadeFont', '400', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Setting" ("tenantId", "key", "value", "createdAt", "updatedAt")
    VALUES ('cascade-tenant', 'cascade.setting', 'value', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);
  await client.execute(`DELETE FROM "Tenant" WHERE "id" = 'cascade-tenant'`);

  for (const [table, where] of [
    ["Admin", `"id" = 'cascade-admin'`],
    ["Session", `"id" = 'cascade-session'`],
    ["Group", `"id" = 'cascade-group'`],
    ["Product", `"id" = 'cascade-product'`],
    ["FeaturedProduct", `"id" = 'cascade-featured'`],
    ["HomePage", `"id" = 'cascade-home'`],
    ["Font", `"id" = 'cascade-font'`],
    ["Setting", `"tenantId" = 'cascade-tenant'`],
  ] as const) {
    const row = await queryOne(client, `SELECT COUNT(*) AS "count" FROM "${table}" WHERE ${where}`);
    assertEqual(Number(row.count), 0, `Tenant cascade did not remove ${table}.`);
  }
}

async function verifyDatabaseIntegrity(client: Client): Promise<void> {
  const foreignKeys = await queryOne(client, `PRAGMA foreign_keys`);
  assertEqual(Number(foreignKeys.foreign_keys), 1, "SQLite foreign key enforcement is disabled.");
  const violations = await queryRows(client, `PRAGMA foreign_key_check`);
  assertEqual(violations.length, 0, `Foreign key violations found: ${JSON.stringify(violations)}`);
  const integrity = await queryRows(client, `PRAGMA integrity_check`);
  assertDeepEqual(integrity, [{ integrity_check: "ok" }], "SQLite integrity_check did not return ok.");
}

async function assertAppliedMigrations(client: Client, expected: readonly string[]): Promise<void> {
  const migrations = await queryRows(client, `
    SELECT "migration_name", "finished_at", "rolled_back_at", "applied_steps_count"
      FROM "_prisma_migrations" ORDER BY "migration_name"
  `);
  assertDeepEqual(migrations.map((migration) => migration.migration_name), [...expected].sort(), "Unexpected applied migration set.");
  for (const migration of migrations) {
    assert(migration.finished_at !== null, `Migration ${String(migration.migration_name)} did not finish.`);
    assert(migration.rolled_back_at === null, `Migration ${String(migration.migration_name)} was rolled back.`);
    assertEqual(Number(migration.applied_steps_count), 1, `Migration ${String(migration.migration_name)} was not applied once.`);
  }
}

async function captureState(client: Client): Promise<unknown> {
  const tables = ["Admin", "AssetCleanupJob", "FeaturedProduct", "Font", "Group", "HomePage", "LoginThrottle", "Product", "Session", "Setting", "Tenant", "_prisma_migrations"] as const;
  const counts: Record<string, number> = {};
  for (const table of tables) counts[table] = await countRows(client, table);
  return {
    counts,
    migrations: await queryRows(client, `SELECT "migration_name", "checksum", "finished_at", "rolled_back_at", "applied_steps_count" FROM "_prisma_migrations" ORDER BY "migration_name"`),
    admins: await queryRows(client, `SELECT "id", "email", "role", "tenantId", "mustChangePassword", "lastLoginAt" FROM "Admin" ORDER BY "id"`),
    products: await queryRows(client, `SELECT "id", "tenantId", "groupId", "name", "price", "sortOrder", "mediaPath", "mediaType" FROM "Product" ORDER BY "id"`),
    featured: await queryRows(client, `SELECT "id", "tenantId", "productId", "position" FROM "FeaturedProduct" ORDER BY "id"`),
    fonts: await queryRows(client, `SELECT "id", "tenantId", "name", "source", "filePath" FROM "Font" ORDER BY "id"`),
    settings: await queryRows(client, `SELECT "tenantId", "key", "value" FROM "Setting" ORDER BY "tenantId", "key"`),
  };
}

async function countRows(client: Client, table: string): Promise<number> {
  assert(/^[A-Za-z_]+$/.test(table), `Unsafe table name: ${table}`);
  const row = await queryOne(client, `SELECT COUNT(*) AS "count" FROM "${table}"`);
  return Number(row.count);
}

async function queryRows(client: Client, sql: string): Promise<Array<Record<string, unknown>>> {
  const result = await client.execute(sql);
  return result.rows.map((row) => ({ ...row }));
}

async function queryOne(client: Client, sql: string): Promise<Record<string, unknown>> {
  const rows = await queryRows(client, sql);
  assert(rows.length === 1, `Expected one row, received ${rows.length}: ${sql.trim()}`);
  return rows[0];
}

async function expectConstraintFailure(client: Client, label: string, sql: string): Promise<void> {
  try {
    await client.execute(sql);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    const details = `${code} ${error instanceof Error ? error.message : String(error)}`;
    if (/constraint|unique|foreign key|check/i.test(details)) return;
    throw new Error(`${label} failed for an unexpected reason: ${details}`, { cause: error });
  }
  throw new Error(`Expected SQLite to reject ${label}.`);
}

async function assertTableSqlContains(client: Client, table: string, fragments: readonly string[]): Promise<void> {
  const row = await queryOne(client, `SELECT "sql" FROM "sqlite_schema" WHERE "type" = 'table' AND "name" = '${table}'`);
  const sql = String(row.sql);
  for (const fragment of fragments) assert(sql.includes(fragment), `Table ${table} is missing ${fragment}.`);
}

function assertCompositeForeignKey(
  rows: Array<Record<string, unknown>>,
  referencedTable: string,
  expectedColumns: ReadonlyArray<readonly [string, string]>,
): void {
  const candidates = new Map<number, Array<[string, string]>>();
  for (const row of rows) {
    if (String(row.table) !== referencedTable) continue;
    const id = Number(row.id);
    const columns = candidates.get(id) ?? [];
    columns.push([String(row.from), String(row.to)]);
    candidates.set(id, columns);
    assertEqual(String(row.on_delete).toUpperCase(), "CASCADE", `${referencedTable} FK does not cascade deletes.`);
  }
  const matches = [...candidates.values()].some((columns) => {
    const normalized = columns.map(([from, to]) => `${from}:${to}`).sort();
    const expected = expectedColumns.map(([from, to]) => `${from}:${to}`).sort();
    return JSON.stringify(normalized) === JSON.stringify(expected);
  });
  assert(matches, `Missing composite foreign key to ${referencedTable}: ${JSON.stringify(expectedColumns)}.`);
}

function assertNames(label: string, expected: readonly string[], actual: readonly string[]): void {
  const missing = expected.filter((name) => !actual.includes(name));
  assert(missing.length === 0, `Missing ${label}: ${missing.join(", ")}.`);
}

function toConfigPath(value: string): string {
  return value.replaceAll(path.sep, "/");
}

function assertOwnedTemporaryRoot(target: string): void {
  const resolved = path.resolve(target);
  const relative = path.relative(TEMPORARY_PARENT, resolved);
  assert(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative), `Unsafe temporary root: ${resolved}`);
  assert(path.basename(resolved).startsWith("legacy-upgrade-"), `Unexpected temporary root name: ${resolved}`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(actualJson === expectedJson, `${message}\nExpected: ${expectedJson}\nActual: ${actualJson}`);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  assert(Object.is(actual, expected), `${message} Expected ${String(expected)}, received ${String(actual)}.`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
