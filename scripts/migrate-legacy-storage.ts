import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileExists, moveFile } from "../src/shared/backend/storage";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "fuzion" } });
  if (!tenant) throw new Error("No existe el tenant legacy fuzion. Ejecutá primero la migración de base.");
  const products = await prisma.product.findMany({ where: { tenantId: tenant.id, mediaPath: { not: null } }, select: { id: true, mediaPath: true } });
  const fonts = await prisma.font.findMany({ where: { tenantId: tenant.id, filePath: { not: null } }, select: { id: true, filePath: true } });
  const files = [...products.map((row) => ({ kind: "product" as const, id: row.id, path: row.mediaPath! })), ...fonts.map((row) => ({ kind: "font" as const, id: row.id, path: row.filePath! }))];

  for (const file of files) {
    const destination = `tenants/${tenant.id}/${file.kind === "product" ? "products" : "fonts"}/${file.path.split("/").pop()}`;
    if (!(await fileExists(file.path)) && !(await fileExists(destination))) {
      throw new Error(`Archivo referenciado no encontrado: ${file.path}`);
    }
  }

  for (const file of files) {
    const destination = `tenants/${tenant.id}/${file.kind === "product" ? "products" : "fonts"}/${file.path.split("/").pop()}`;
    if (file.path !== destination && await fileExists(file.path)) await moveFile(file.path, destination);
    if (file.kind === "product") await prisma.product.update({ where: { id: file.id }, data: { mediaPath: destination } });
    else await prisma.font.update({ where: { id: file.id }, data: { filePath: destination } });
  }
  console.log(`Migrated ${files.length} legacy files for ${tenant.slug}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
