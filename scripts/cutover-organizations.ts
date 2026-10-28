import { createHash } from "node:crypto";
import path from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";
import { LocalBlobStore } from "../src/platform/storage/local-blob-store";
import { documentAssetIds, validateCanvasDocument } from "../src/modules/menu-editor/domain/document-policy";
import { markLandingContext } from "../src/modules/landing-management/domain/landing-route-context";

type Row = Record<string, InValue>;
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
assertLocalSqliteUrl(databaseUrl);
const client = createClient({ url: databaseUrl });
const blobs = new LocalBlobStore(path.resolve(process.env.STORAGE_ROOT || "storage"));

try {
  if (process.argv.includes("--preflight")) await preflightOrganizationCutover(client);
  else await completeOrganizationCutover(client);
} finally {
  client.close();
}

async function preflightOrganizationCutover(database: Client): Promise<void> {
  const legacy = await database.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name='Tenant'");
  if (!legacy.rows.length) return;
  const assets = await database.execute("SELECT storageKey,byteSize FROM MenuAsset");
  for (const asset of assets.rows) {
    const file = await blobs.stat(String(asset.storageKey));
    if (!file || file.size !== Number(asset.byteSize)) throw new Error(`El archivo ${String(asset.storageKey)} falta o no coincide con su tamaño registrado. No se inició la migración de organizaciones.`);
  }
  const landings = await database.execute("SELECT tenantId FROM LandingPage WHERE published=1");
  for (const landing of landings.rows) {
    const key = `tenants/${String(landing.tenantId)}/landing/index.html`;
    if (!(await blobs.exists(key))) throw new Error(`Falta la landing publicada ${key}. No se inició la migración de organizaciones.`);
  }
  console.log(`Preflight de organizaciones correcto: ${assets.rows.length} archivos y ${landings.rows.length} landings publicadas.`);
}

async function completeOrganizationCutover(database: Client): Promise<void> {
  const state = await database.execute("SELECT generation,state,migrationJson FROM AppSchemaState WHERE id='singleton'");
  if (!state.rows[0]?.migrationJson) {
    if (state.rows[0]?.generation !== 2 || state.rows[0]?.state !== "READY") throw new Error("El esquema de organizaciones no está listo.");
    return;
  }
  const legacy = JSON.parse(String(state.rows[0].migrationJson)) as { tenants: Row[]; projects: Row[]; assets: Row[]; templates: Row[]; landings: Row[] };
  await database.execute("UPDATE AppSchemaState SET state='MIGRATING',updatedAt=CURRENT_TIMESTAMP WHERE id='singleton'");
  const tenants = legacy.tenants;
  for (const tenant of tenants) {
    const tenantId = String(tenant.id);
    const projects = legacy.projects.filter((project) => project.tenantId === tenantId)
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || String(left.createdAt).localeCompare(String(right.createdAt)) || String(left.id).localeCompare(String(right.id)));
    const restaurants = projects.length ? projects.map((project) => ({ id: String(project.id), project })) : [{ id: `restaurant-${tenantId}`, project: null }];
    const primaryId = restaurants[0]!.id;
    const assets = legacy.assets.filter((asset) => asset.tenantId === tenantId);
    const templates = legacy.templates.filter((template) => template.tenantId === tenantId && template.visibility === "PRIVATE");

    for (const restaurant of restaurants) {
      const isPrimary = restaurant.id === primaryId;
      const assetIds = new Map<string, string>();
      for (const asset of assets) {
        const originalId = String(asset.id);
        const id = isPrimary ? originalId : clonedId("asset", restaurant.id, originalId);
        assetIds.set(originalId, id);
        const storageKey = `restaurants/${restaurant.id}/migrated/${id}${path.extname(String(asset.storageKey))}`;
        await copyBlob(String(asset.storageKey), storageKey, Number(asset.byteSize));
        await upsertRow(database, "MenuAsset", { ...asset, id, restaurantId: restaurant.id, storageKey }, ["tenantId"]);
      }
      if (restaurant.project) {
        const draft = remapDocument(String(restaurant.project.draftJson), assetIds);
        const published = restaurant.project.publishedJson ? remapDocument(String(restaurant.project.publishedJson), assetIds) : null;
        await database.execute({ sql: "UPDATE MenuProject SET draftJson=?,publishedJson=? WHERE id=? AND restaurantId=?", args: [JSON.stringify(draft), published ? JSON.stringify(published) : null, restaurant.project.id, restaurant.id] });
        await database.execute({ sql: "DELETE FROM MenuAssetReference WHERE projectId=?", args: [restaurant.project.id] });
        for (const [scope, document] of [["DRAFT", draft], ["PUBLISHED", published]] as const) {
          if (!document) continue;
          for (const assetId of documentAssetIds(document)) {
            await database.execute({ sql: "INSERT INTO MenuAssetReference (restaurantId,projectId,assetId,scope) VALUES (?,?,?,?)", args: [restaurant.id, restaurant.project.id, assetId, scope] });
          }
        }
      }
      if (!isPrimary) {
        for (const template of templates) {
          const templateId = clonedId("template", restaurant.id, String(template.id));
          const document = remapDocument(String(template.documentJson), assetIds);
          await upsertRow(database, "MenuTemplate", { ...template, id: templateId, restaurantId: restaurant.id, documentJson: JSON.stringify(document) }, ["tenantId"]);
          await database.execute({ sql: "DELETE FROM MenuTemplateAssetReference WHERE templateId=?", args: [templateId] });
          for (const assetId of documentAssetIds(document)) {
            await database.execute({ sql: "INSERT INTO MenuTemplateAssetReference (restaurantId,templateId,assetId) VALUES (?,?,?)", args: [restaurant.id, templateId, assetId] });
          }
        }
      }
    }
    const landing = legacy.landings.find((landing) => landing.tenantId === tenantId);
    for (const name of ["index.html", "style.css", "script.js"]) {
      const source = `tenants/${tenantId}/landing/${name}`;
      if (await blobs.exists(source)) await copyBlob(source, `restaurants/${primaryId}/landing/${name}`, undefined,
        name === "index.html" ? (content) => Buffer.from(markLandingContext(content.toString("utf8"), { menuSlug: String(tenant.slug), landingSlug: String(tenant.slug) }), "utf8") : undefined);
      else if (name === "index.html" && landing?.published) throw new Error(`Falta la landing publicada de ${tenantId}: ${source}`);
    }
  }
  const currentTables = await database.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE '_OrganizationLegacy_%' AND name NOT LIKE 'sqlite_%'");
  for (const table of currentTables.rows) {
    const foreignKeys = await database.execute(`PRAGMA foreign_key_check("${String(table.name).replaceAll('"', '""')}")`);
    if (foreignKeys.rows.length) throw new Error("El cutover produjo referencias inválidas; restaurá el snapshot antes de reabrir tráfico.");
  }
  // Legacy files remain untouched, so restoring the pre-cutover SQLite snapshot is sufficient.
  await database.execute("UPDATE AppSchemaState SET generation=2,state='READY',migrationJson=NULL,updatedAt=CURRENT_TIMESTAMP WHERE id='singleton'");
  console.log(`Cutover de organizaciones completo: ${tenants.length} organizaciones, bibliotecas y archivos aislados.`);
}

async function copyBlob(source: string, destination: string, expectedBytes?: number, transform?: (content: Buffer) => Buffer): Promise<void> {
  let content = await blobs.read(source);
  if (expectedBytes != null && content.byteLength !== expectedBytes) throw new Error(`El archivo ${source} no coincide con su tamaño registrado.`);
  if (transform) content = transform(content);
  if (await blobs.exists(destination)) {
    const existing = await blobs.read(destination);
    if (!content.equals(existing)) throw new Error(`El destino del cutover ya existe con otro contenido: ${destination}`);
    return;
  }
  await blobs.put(destination, content);
}

function clonedId(kind: string, restaurantId: string, sourceId: string): string {
  return `migrated-${kind}-${createHash("sha256").update(`${restaurantId}:${sourceId}`).digest("hex").slice(0, 32)}`;
}

function remapDocument(json: string, assets: Map<string, string>) {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, ["assetId", "fontAssetId", "modalAssetId"].includes(key) && typeof item === "string" ? assets.get(item) ?? item : visit(item)]));
  };
  return validateCanvasDocument(visit(JSON.parse(json)));
}

async function upsertRow(database: Client, table: string, row: Row, omitted: string[]): Promise<void> {
  const entries = Object.entries(row).filter(([key]) => !omitted.includes(key));
  const columns = entries.map(([key]) => `"${key}"`).join(",");
  const values = entries.map(([, value]) => value);
  const updates = entries.filter(([key]) => key !== "id").map(([key]) => `"${key}"=excluded."${key}"`).join(",");
  await database.execute({ sql: `INSERT INTO "${table}" (${columns}) VALUES (${entries.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${updates}`, args: values });
}
