import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import type {
  ActiveTenant,
  CreateTenantCommand,
  DeleteTenantCommand,
  SetTenantStatusCommand,
  TenantListItem,
  UpdateTenantCommand,
} from "../contracts";
import type { TenantAccountRepository } from "../application/ports";

type TenantWithAdmin = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  admin: { email: string; lastLoginAt: Date | null } | null;
};

function toListItem(tenant: TenantWithAdmin): TenantListItem {
  if (!tenant.admin) throw new NotFoundError("Tenant account");
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    email: tenant.admin.email,
    lastLoginAt: tenant.admin.lastLoginAt?.toISOString() ?? null,
    createdAt: tenant.createdAt.toISOString(),
  };
}

export class PrismaTenantAccountRepository implements TenantAccountRepository {
  async findActiveBySlug(slug: string): Promise<ActiveTenant | null> {
    const tenant = await prisma.tenant.findFirst({
      where: { slug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true },
    });
    return tenant ? { ...tenant, status: "ACTIVE" } : null;
  }

  async list(): Promise<TenantListItem[]> {
    const tenants = await prisma.tenant.findMany({
      include: { admin: { select: { email: true, lastLoginAt: true } } },
      orderBy: { createdAt: "desc" },
    });
    return tenants.map(toListItem);
  }

  async create(input: CreateTenantCommand & { passwordHash: string }): Promise<TenantListItem> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const tenant = await transaction.tenant.create({
          data: { name: input.name, slug: input.slug },
        });
        const admin = await transaction.admin.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
            role: "TENANT_ADMIN",
            tenantId: tenant.id,
            mustChangePassword: true,
          },
        });
        await transaction.menuProject.create({
          data: {
            tenantId: tenant.id,
            draftJson: JSON.stringify(createTenantTemplate(input.name)),
            schemaVersion: 1,
          },
        });
        return toListItem({ ...tenant, admin });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("Ya existe un menú con ese slug o una cuenta con ese correo.");
      }
      throw error;
    }
  }

  async update(input: UpdateTenantCommand): Promise<TenantListItem> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const existing = await transaction.tenant.findUnique({
          where: { id: input.id },
          include: { admin: true },
        });
        if (!existing?.admin) throw new NotFoundError("Tenant");

        const tenant = await transaction.tenant.update({
          where: { id: input.id },
          data: { name: input.name },
        });
        const emailChanged = existing.admin.email !== input.email;
        const admin = await transaction.admin.update({
          where: { id: existing.admin.id },
          data: { email: input.email },
        });
        if (emailChanged) {
          await transaction.session.updateMany({
            where: { adminId: existing.admin.id, revoked: false },
            data: { revoked: true },
          });
        }
        return toListItem({ ...tenant, admin });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictError("Ya existe una cuenta con ese correo.");
      throw error;
    }
  }

  async setStatus(input: SetTenantStatusCommand): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findUnique({ where: { id: input.id }, include: { admin: true } });
      if (!tenant) throw new NotFoundError("Tenant");
      await transaction.tenant.update({ where: { id: input.id }, data: { status: input.status } });
      if (input.status === "SUSPENDED" && tenant.admin) {
        await transaction.session.updateMany({
          where: { adminId: tenant.admin.id, revoked: false },
          data: { revoked: true },
        });
      }
    });
  }

  async replacePassword(input: { id: string; passwordHash: string }): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findUnique({ where: { id: input.id }, include: { admin: true } });
      if (!tenant?.admin) throw new NotFoundError("Tenant account");
      await transaction.admin.update({
        where: { id: tenant.admin.id },
        data: { passwordHash: input.passwordHash, mustChangePassword: true },
      });
      await transaction.session.updateMany({
        where: { adminId: tenant.admin.id, revoked: false },
        data: { revoked: true },
      });
    });
  }

  async delete(input: DeleteTenantCommand): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findUnique({ where: { id: input.id } });
      if (!tenant) throw new NotFoundError("Tenant");
      if (tenant.slug !== input.confirmationSlug) {
        throw new ConflictError("La confirmación no coincide con el slug.");
      }

      const tenantPrefix = `tenants/${tenant.id}`;
      await enqueueAssetCleanup(tenantPrefix, transaction, { deletePrefix: true });
      await transaction.tenant.delete({ where: { id: tenant.id } });
    });
  }
}

function createTenantTemplate(name: string) {
  return {
    schemaVersion: 1,
    background: "#F3EEDC",
    initialViewport: { x: -120, y: -80, width: 1240, height: 900 },
    nodes: [
      { id: "template-title", type: "text", x: 80, y: 70, width: 900, height: 100, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: name, fontAssetId: null, fontSize: 72, fontWeight: "800", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.1, letterSpacing: 0, fill: "#3A4824", semanticRole: "heading" },
      { id: "template-subtitle", type: "text", x: 85, y: 190, width: 700, height: 56, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: "Diseñá tu carta desde este lienzo", fontAssetId: null, fontSize: 30, fontWeight: "400", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#AB5641", semanticRole: "paragraph" },
    ],
    groups: [],
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "P2002";
}
