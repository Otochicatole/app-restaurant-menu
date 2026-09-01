import type { PrismaClient } from "@/generated/prisma/client";
import type { AccountRecord, IdentityRepository } from "../application/ports";

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly client: PrismaClient) {}

  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    const account = await this.client.admin.findFirst({
      where: { email },
      include: { tenant: true },
    });
    return account ? toAccountRecord(account) : null;
  }

  async findAccountById(adminId: string): Promise<AccountRecord | null> {
    const account = await this.client.admin.findUnique({
      where: { id: adminId },
      include: { tenant: true },
    });
    return account ? toAccountRecord(account) : null;
  }

  async findAuthenticatedAccount(input: {
    adminId: string;
    jti: string;
    now: Date;
  }): Promise<AccountRecord | null> {
    const account = await this.client.admin.findFirst({
      where: {
        id: input.adminId,
        sessions: {
          some: {
            jti: input.jti,
            revoked: false,
            expiresAt: { gt: input.now },
          },
        },
      },
      include: { tenant: true },
    });
    return account ? toAccountRecord(account) : null;
  }

  async recordSuccessfulLogin(input: {
    adminId: string;
    jti: string;
    expiresAt: Date;
    occurredAt: Date;
  }): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      await transaction.session.deleteMany({
        where: {
          adminId: input.adminId,
          OR: [{ revoked: true }, { expiresAt: { lt: input.occurredAt } }],
        },
      });
      await transaction.session.create({
        data: {
          adminId: input.adminId,
          jti: input.jti,
          expiresAt: input.expiresAt,
        },
      });
      await transaction.admin.update({
        where: { id: input.adminId },
        data: { lastLoginAt: input.occurredAt },
      });
    });
  }

  async revokeSession(jti: string): Promise<void> {
    await this.client.session.updateMany({
      where: { jti },
      data: { revoked: true },
    });
  }

  async changePasswordAndRevokeOtherSessions(input: {
    adminId: string;
    expectedPasswordHash: string;
    newPasswordHash: string;
    currentJti: string;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const result = await transaction.admin.updateMany({
        where: { id: input.adminId, passwordHash: input.expectedPasswordHash },
        data: { passwordHash: input.newPasswordHash, mustChangePassword: false },
      });
      if (result.count !== 1) return false;

      await transaction.session.updateMany({
        where: {
          adminId: input.adminId,
          jti: { not: input.currentJti },
          revoked: false,
        },
        data: { revoked: true },
      });
      return true;
    });
  }

}

type PrismaAccount = Awaited<
  ReturnType<PrismaClient["admin"]["findUnique"]>
> & { tenant?: { id: string; slug: string; status: "ACTIVE" | "SUSPENDED" } | null };

function toAccountRecord(account: NonNullable<PrismaAccount>): AccountRecord {
  return {
    id: account.id,
    email: account.email,
    passwordHash: account.passwordHash,
    role: account.role,
    tenantId: account.tenantId,
    tenantSlug: account.tenant?.slug ?? null,
    tenantStatus: account.tenant?.status ?? null,
    mustChangePassword: account.mustChangePassword,
  };
}
