import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria para ejecutar el seed.");
assertLocalSqliteUrl(databaseUrl);
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl.trim(), timeout: 5_000 }) });

const fontDefs = [
  ["Playfair Display", "serif", "Playfair Display", '"Playfair Display", serif', "400;700"],
  ["Lora", "serif", "Lora", '"Lora", serif', "400;700"],
  ["Merriweather", "serif", "Merriweather", '"Merriweather", serif', "400;700"],
  ["Cormorant Garamond", "serif", "Cormorant Garamond", '"Cormorant Garamond", serif', "400;700"],
  ["Roboto", "sans-serif", "Roboto", '"Roboto", sans-serif', "400;700"],
  ["Open Sans", "sans-serif", "Open Sans", '"Open Sans", sans-serif', "400;700"],
  ["Montserrat", "sans-serif", "Montserrat", '"Montserrat", sans-serif', "400;700"],
  ["Poppins", "sans-serif", "Poppins", '"Poppins", sans-serif', "400;700"],
  ["Roboto Mono", "monospace", "Roboto Mono", '"Roboto Mono", monospace', "400;700"],
  ["Space Mono", "monospace", "Space Mono", '"Space Mono", monospace', "400;700"],
  ["Oswald", "display", "Oswald", '"Oswald", sans-serif', "400;700"],
  ["Dancing Script", "script", "Dancing Script", '"Dancing Script", cursive', "400;700"],
  ["Lobster", "script", "Lobster", '"Lobster", cursive', "400"],
  ["Pacifico", "script", "Pacifico", '"Pacifico", cursive', "400"],
  ["Bebas Neue", "display", "Bebas Neue", '"Bebas Neue", sans-serif', "400"],
  ["Cinzel", "display", "Cinzel", '"Cinzel", serif', "400;700"],
  ["Abril Fatface", "display", "Abril Fatface", '"Abril Fatface", serif', "400"],
  ["Bangers", "display", "Bangers", '"Bangers", cursive', "400"],
] as const;

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

  for (const [name, category, googleFamily, fontFamily, weights] of fontDefs) {
    const current = await prisma.font.findFirst({ where: { name, tenantId: null } });
    if (current) {
      await prisma.font.update({ where: { id: current.id }, data: { category, source: "google", googleFamily, fontFamily, weights } });
    } else {
      await prisma.font.create({ data: { name, category, source: "google", googleFamily, fontFamily, weights } });
    }
  }

  console.log("Seed completed successfully");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
