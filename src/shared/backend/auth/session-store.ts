import { prisma } from "@/shared/backend/database/prisma";

export async function createSession(adminId: string, jti: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await cleanupExpiredSessions(adminId);

  await prisma.session.create({
    data: { adminId, jti, expiresAt },
  });
}

export async function revokeSession(jti: string): Promise<void> {
  await prisma.session.updateMany({
    where: { jti },
    data: { revoked: true },
  });
}

export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { adminId, revoked: false },
    data: { revoked: true },
  });
}

export async function isSessionValid(jti: string): Promise<boolean> {
  const session = await prisma.session.findUnique({ where: { jti } });
  if (!session) return false;
  if (session.revoked) return false;
  if (session.expiresAt < new Date()) return false;
  return true;
}

async function cleanupExpiredSessions(adminId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      adminId,
      OR: [{ revoked: true }, { expiresAt: { lt: new Date() } }],
    },
  });
}
