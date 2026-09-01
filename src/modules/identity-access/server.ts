import "server-only";

import { cache } from "react";
import { ForbiddenError, UnauthorizedError } from "@/platform/application/errors";
import {
  changePasswordCommandSchema,
  loginCommandSchema,
  type ChangePasswordCommand,
  type LoginCommand,
  type LoginView,
  type SessionView,
} from "./contracts";
import type { CurrentActor, SuperAdminActor, TenantAdminActor } from "./domain/current-actor";
import type { SessionClaims } from "./domain/session";
import { JoseSessionTokenService, resolveJwtSecret } from "./infrastructure/jose-session-token-service";

const tokenVerifier = new JoseSessionTokenService(resolveJwtSecret());

export async function login(
  command: LoginCommand,
  context?: { throttleKey?: string },
): Promise<CurrentActor> {
  return (await identityAccess()).login(loginCommandSchema.parse(command), context?.throttleKey);
}

export async function logout(): Promise<void> {
  await (await identityAccess()).logout();
}

const readAuthenticatedAccount = cache(async (): Promise<CurrentActor | null> =>
  (await identityAccess()).getCurrentActor(),
);

export async function getAuthenticatedAccount(): Promise<CurrentActor | null> {
  return readAuthenticatedAccount();
}

export async function getCurrentSession(): Promise<SessionClaims | null> {
  return (await identityAccess()).getSessionClaims();
}

export async function requireAuthenticatedAccount(): Promise<CurrentActor> {
  const actor = await getAuthenticatedAccount();
  if (!actor) throw new UnauthorizedError("Sesión inválida o expirada");
  return actor;
}

export async function requireTenantAdmin(): Promise<TenantAdminActor> {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind !== "tenant-admin") throw new ForbiddenError("No tenés permisos para este espacio");
  if (actor.mustChangePassword) throw new ForbiddenError("Debés cambiar tu contraseña antes de continuar");
  return actor;
}

export async function requireSuperAdmin(): Promise<SuperAdminActor> {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind !== "super-admin") throw new ForbiddenError("No tenés permisos para esta sección");
  return actor;
}

export async function changePassword(command: ChangePasswordCommand): Promise<void> {
  const actor = await requireAuthenticatedAccount();
  await (await identityAccess()).changePassword(actor, changePasswordCommandSchema.parse(command));
}

export function toLoginView(actor: CurrentActor): LoginView {
  return {
    email: actor.email,
    role: actor.role,
    tenantSlug: actor.tenantSlug,
    mustChangePassword: actor.mustChangePassword,
  };
}

export function toSessionView(actor: CurrentActor): SessionView {
  return { ...toLoginView(actor), adminId: actor.adminId };
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  return tokenVerifier.verify(token);
}

export type { CurrentActor, SessionClaims, SuperAdminActor, TenantAdminActor };

async function identityAccess() {
  return (await import("./infrastructure/composition")).getIdentityAccess();
}
