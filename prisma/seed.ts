import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";
import { TEMPLATE_PRESETS } from "../src/modules/menu-editor/domain/template-presets";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria para ejecutar el seed.");
assertLocalSqliteUrl(databaseUrl);
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl.trim(), timeout: 5_000 }) });

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD son obligatorios para ejecutar el seed.");
  if (password.length < 12) throw new Error("SUPER_ADMIN_PASSWORD debe tener al menos 12 caracteres.");

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing?.role === "TENANT_ADMIN") throw new Error("El correo del superadministrador ya pertenece a un cliente.");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", tenantId: null, mustChangePassword: false },
    create: { email, passwordHash, role: "SUPER_ADMIN", mustChangePassword: false },
  });

  const systemPublishedAt = new Date("2026-01-01T00:00:00.000Z");
  for (const preset of TEMPLATE_PRESETS) {
    await prisma.menuTemplate.upsert({
      where: { id: preset.id },
      update: { name: preset.name, description: preset.description, documentJson: JSON.stringify(preset.document), schemaVersion: preset.document.schemaVersion, visibility: "PUBLIC", status: "PUBLISHED", isSystem: true, tenantId: null, publishedAt: systemPublishedAt },
      create: { id: preset.id, name: preset.name, description: preset.description, documentJson: JSON.stringify(preset.document), schemaVersion: preset.document.schemaVersion, visibility: "PUBLIC", status: "PUBLISHED", isSystem: true, publishedAt: systemPublishedAt },
    });
  }

  console.log(`Seed completed successfully (${TEMPLATE_PRESETS.length} system templates)`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
