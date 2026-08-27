import { prisma } from "@/shared/backend/database/prisma";
import { NotFoundError, ConflictError } from "@/shared/backend/errors/app-error";
import type { TenantStatus } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { deleteDirectory, deleteFile, fileExists, moveDirectory } from "@/shared/backend/storage";

export type TenantContext = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
};

const RESERVED_SLUGS = new Set(["admin", "api", "m", "superadmin", "login", "_next"]);

export async function getActiveTenantBySlug(slug: string): Promise<TenantContext> {
  const tenant = await prisma.tenant.findFirst({ where: { slug, status: "ACTIVE" } });
  if (!tenant) throw new NotFoundError("Menu");
  return tenant;
}

export async function listTenants() {
  return prisma.tenant.findMany({
    include: { admin: { select: { email: true, lastLoginAt: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTenant(input: { name: string; slug: string; email: string; passwordHash: string }) {
  if (RESERVED_SLUGS.has(input.slug)) throw new ConflictError("Ese slug está reservado.");
  const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ConflictError("Ya existe un menú con ese slug.");
  const existingAdmin = await prisma.admin.findUnique({ where: { email: input.email } });
  if (existingAdmin) throw new ConflictError("Ya existe una cuenta con ese correo.");

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: input.name, slug: input.slug } });
    const admin = await tx.admin.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: "TENANT_ADMIN",
        tenantId: tenant.id,
        mustChangePassword: true,
      },
    });
    await tx.homePage.create({ data: { tenantId: tenant.id, title: input.name, description: "Menú digital" } });
    return { tenant, admin };
  });
}

export async function updateTenant(id: string, input: { name?: string; email?: string }) {
  const tenant = await prisma.tenant.findUnique({ where: { id }, include: { admin: true } });
  if (!tenant || !tenant.admin) throw new NotFoundError("Tenant");
  if (input.email && input.email !== tenant.admin.email) {
    const duplicate = await prisma.admin.findUnique({ where: { email: input.email } });
    if (duplicate) throw new ConflictError("Ya existe una cuenta con ese correo.");
  }
  return prisma.$transaction(async (tx) => {
    const updatedTenant = await tx.tenant.update({ where: { id }, data: input.name ? { name: input.name } : {} });
    const admin = input.email
      ? await tx.admin.update({ where: { id: tenant.admin!.id }, data: { email: input.email } })
      : tenant.admin!;
    if (input.email && input.email !== tenant.admin!.email) {
      await tx.session.updateMany({ where: { adminId: tenant.admin!.id }, data: { revoked: true } });
    }
    return { tenant: updatedTenant, admin };
  });
}

export async function setTenantStatus(id: string, status: TenantStatus) {
  const tenant = await prisma.tenant.findUnique({ where: { id }, include: { admin: true } });
  if (!tenant) throw new NotFoundError("Tenant");
  const updated = await prisma.tenant.update({ where: { id }, data: { status } });
  if (status === "SUSPENDED" && tenant.admin) {
    await prisma.session.updateMany({ where: { adminId: tenant.admin.id }, data: { revoked: true } });
  }
  return updated;
}

export async function getTenantById(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id }, include: { admin: true } });
  if (!tenant) throw new NotFoundError("Tenant");
  return tenant;
}

export function generateTemporaryPassword(): string {
  return randomBytes(15).toString("base64url");
}

export async function resetTenantPassword(id: string): Promise<string> {
  const tenant = await getTenantById(id);
  if (!tenant.admin) throw new NotFoundError("Tenant account");
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.admin.update({ where: { id: tenant.admin.id }, data: { passwordHash, mustChangePassword: true } });
  await prisma.session.updateMany({ where: { adminId: tenant.admin.id }, data: { revoked: true } });
  return temporaryPassword;
}

export async function deleteTenant(id: string, confirmationSlug: string): Promise<void> {
  const tenant = await getTenantById(id);
  if (tenant.slug !== confirmationSlug) throw new ConflictError("La confirmación no coincide con el slug.");

  const legacyFiles = [
    ...(await prisma.product.findMany({ where: { tenantId: tenant.id, mediaPath: { not: null } }, select: { mediaPath: true } })).map((row) => row.mediaPath!),
    ...(await prisma.font.findMany({ where: { tenantId: tenant.id, filePath: { not: null } }, select: { filePath: true } })).map((row) => row.filePath!),
  ];

  const directory = `tenants/${tenant.id}`;
  const quarantine = `trash/${tenant.id}-${Date.now()}`;
  const hasFiles = await fileExists(directory);
  if (hasFiles) await moveDirectory(directory, quarantine);
  try {
    await prisma.tenant.delete({ where: { id: tenant.id } });
  } catch (error) {
    if (hasFiles) await moveDirectory(quarantine, directory).catch(() => undefined);
    throw error;
  }
  if (hasFiles) await deleteDirectory(quarantine).catch((error) => console.error("Tenant storage cleanup failed", { tenantId: tenant.id, error }));
  for (const file of legacyFiles) {
    if (!file.startsWith(`tenants/${tenant.id}/`)) await deleteFile(file).catch((error) => console.error("Legacy tenant file cleanup failed", { tenantId: tenant.id, file, error }));
  }
}
