import bcrypt from "bcryptjs";
import { prisma } from "@/shared/backend/database/prisma";
import {
  createSessionCookie,
  removeSessionCookie,
  getSession,
  verifySessionToken,
} from "@/shared/backend/auth/session";
import { createSession, revokeSession, isSessionValid } from "@/shared/backend/auth/session-store";
import { UnauthorizedError } from "@/shared/backend/errors/app-error";

export async function login(email: string, password: string): Promise<{ adminId: string; email: string }> {
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const jti = await createSessionCookie(admin.id, admin.email);
  await createSession(admin.id, jti);

  return { adminId: admin.id, email: admin.email };
}

export async function logout(): Promise<void> {
  const token = await getSession();
  if (token) {
    await revokeSession(token.jti);
  }
  await removeSessionCookie();
}

export async function getCurrentSession() {
  return getSession();
}

export async function ensureAdmin() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }

  const valid = await isSessionValid(session.jti);
  if (!valid) {
    await removeSessionCookie();
    throw new UnauthorizedError("Session revoked or expired");
  }

  return session;
}

export { verifySessionToken };
