import bcrypt from "bcryptjs";
import { prisma } from "@/shared/backend/database/prisma";
import {
  createSessionCookie,
  removeSessionCookie,
  getSession,
  verifySessionToken,
} from "@/shared/backend/auth/session";
import { createSession, revokeAllAdminSessionsExcept, revokeSession, isSessionValid } from "@/shared/backend/auth/session-store";
import { UnauthorizedError } from "@/shared/backend/errors/app-error";

export type AuthContext = {
  adminId: string;
  email: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN";
  tenantId: string | null;
  tenantSlug: string | null;
  mustChangePassword: boolean;
  jti: string;
};

export async function login(email: string, password: string): Promise<AuthContext> {
  const admin = await prisma.admin.findUnique({ where: { email }, include: { tenant: true } });

  if (!admin) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (admin.role === "TENANT_ADMIN" && (!admin.tenant || admin.tenant.status !== "ACTIVE")) {
    throw new UnauthorizedError("La cuenta no está disponible");
  }

  const jti = await createSessionCookie(admin.id, admin.email);
  await createSession(admin.id, jti);
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    tenantId: admin.tenantId,
    tenantSlug: admin.tenant?.slug ?? null,
    mustChangePassword: admin.mustChangePassword,
    jti,
  };
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

export async function getAuthenticatedAccount(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session) return null;

  const valid = await isSessionValid(session.jti);
  if (!valid) {
    await removeSessionCookie();
    return null;
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.adminId }, include: { tenant: true } });
  if (!admin || (admin.role === "TENANT_ADMIN" && (!admin.tenant || admin.tenant.status !== "ACTIVE"))) {
    await revokeSession(session.jti);
    await removeSessionCookie();
    return null;
  }

  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    tenantId: admin.tenantId,
    tenantSlug: admin.tenant?.slug ?? null,
    mustChangePassword: admin.mustChangePassword,
    jti: session.jti,
  };
}

export async function requireAuthenticatedAccount(): Promise<AuthContext> {
  const account = await getAuthenticatedAccount();
  if (!account) throw new UnauthorizedError("Sesión inválida o expirada");
  return account;
}

export async function requireTenantAdmin(): Promise<AuthContext> {
  const account = await requireAuthenticatedAccount();
  if (account.role !== "TENANT_ADMIN" || !account.tenantId) {
    throw new UnauthorizedError("No tenés permisos para este espacio");
  }
  if (account.mustChangePassword) {
    throw new UnauthorizedError("Debés cambiar tu contraseña antes de continuar");
  }
  return account;
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const account = await requireAuthenticatedAccount();
  if (account.role !== "SUPER_ADMIN") {
    throw new UnauthorizedError("No tenés permisos para esta sección");
  }
  return account;
}

export async function ensureAdmin() {
  return requireTenantAdmin();
}

export async function changePassword(adminId: string, currentPassword: string, newPassword: string, currentJti?: string): Promise<void> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new UnauthorizedError();

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) throw new UnauthorizedError("La contraseña actual no es correcta");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash, mustChangePassword: false } });
  if (currentJti) await revokeAllAdminSessionsExcept(adminId, currentJti);
}

export { verifySessionToken };
