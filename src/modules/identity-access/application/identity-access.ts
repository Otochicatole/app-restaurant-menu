import {
  ForbiddenError,
  RateLimitedError,
  UnauthorizedError,
} from "../../../platform/application/errors";
import type { ChangePasswordCommand, LoginCommand } from "../contracts";
import type {
  CurrentActor,
  SuperAdminActor,
  TenantAdminActor,
} from "../domain/current-actor";
import type { SessionClaims } from "../domain/session";
import type {
  AccountRecord,
  Clock,
  IdentityRepository,
  LoginThrottle,
  PasswordHasher,
  SessionCookie,
  SessionTokenService,
} from "./ports";

export type IdentityAccessDependencies = {
  repository: IdentityRepository;
  passwordHasher: PasswordHasher;
  tokenService: SessionTokenService;
  sessionCookie: SessionCookie;
  clock: Clock;
  loginThrottle: LoginThrottle;
  dummyPasswordHash: string;
};

export function createIdentityAccess(dependencies: IdentityAccessDependencies) {
  const {
    repository,
    passwordHasher,
    tokenService,
    sessionCookie,
    clock,
    loginThrottle,
    dummyPasswordHash,
  } = dependencies;

  async function login(command: LoginCommand, throttleKey?: string): Promise<CurrentActor> {
    const email = command.email.trim().toLowerCase();
    if (throttleKey) {
      const retryAfterSeconds = await loginThrottle.retryAfterSeconds(throttleKey, clock.now());
      if (retryAfterSeconds != null) throw new RateLimitedError(retryAfterSeconds);
    }

    const account = await repository.findAccountByEmail(email);
    const validPassword = await passwordHasher.compare(
      command.password,
      account?.passwordHash ?? dummyPasswordHash,
    );

    if (!account || !validPassword) {
      if (throttleKey) await loginThrottle.recordFailure(throttleKey, clock.now());
      throw new UnauthorizedError("Invalid email or password");
    }

    const actorData = accountToActorData(account);
    if (!actorData) {
      throw new UnauthorizedError("La cuenta no está disponible");
    }

    if (throttleKey) await loginThrottle.reset(throttleKey);

    const occurredAt = clock.now();
    const issuedSession = await tokenService.issue(
      { adminId: account.id, email: account.email },
      occurredAt,
    );

    await repository.recordSuccessfulLogin({
      adminId: account.id,
      jti: issuedSession.claims.jti,
      expiresAt: issuedSession.expiresAt,
      occurredAt,
    });

    try {
      await sessionCookie.write(issuedSession.token, issuedSession.expiresAt);
    } catch (error) {
      await repository.revokeSession(issuedSession.claims.jti).catch(() => undefined);
      throw error;
    }

    return { ...actorData, jti: issuedSession.claims.jti };
  }

  async function logout(): Promise<void> {
    const token = await sessionCookie.read();
    if (!token) {
      await sessionCookie.clear();
      return;
    }

    let claims: SessionClaims | null = null;
    try {
      claims = await tokenService.verify(token);
    } catch {
      // An invalid cookie is still removed below.
    }

    try {
      if (claims) await repository.revokeSession(claims.jti);
    } finally {
      await sessionCookie.clear();
    }
  }

  async function getSessionClaims(): Promise<SessionClaims | null> {
    const token = await sessionCookie.read();
    if (!token) return null;
    try {
      return await tokenService.verify(token);
    } catch {
      await clearCookieWithoutMaskingAuthentication();
      return null;
    }
  }

  async function getCurrentActor(): Promise<CurrentActor | null> {
    const claims = await getSessionClaims();
    if (!claims) return null;

    const account = await repository.findAuthenticatedAccount({
      adminId: claims.adminId,
      jti: claims.jti,
      now: clock.now(),
    });
    const actorData = account ? accountToActorData(account) : null;

    if (!actorData) {
      if (account) await repository.revokeSession(claims.jti);
      await clearCookieWithoutMaskingAuthentication();
      return null;
    }

    return { ...actorData, jti: claims.jti };
  }

  async function requireCurrentActor(): Promise<CurrentActor> {
    const actor = await getCurrentActor();
    if (!actor) throw new UnauthorizedError("Sesión inválida o expirada");
    return actor;
  }

  async function requireTenantAdmin(): Promise<TenantAdminActor> {
    const actor = await requireCurrentActor();
    if (actor.kind !== "tenant-admin") {
      throw new ForbiddenError("No tenés permisos para este espacio");
    }
    if (actor.mustChangePassword) {
      throw new ForbiddenError("Debés cambiar tu contraseña antes de continuar");
    }
    return actor;
  }

  async function requireSuperAdmin(): Promise<Extract<CurrentActor, { kind: "super-admin" }>> {
    const actor = await requireCurrentActor();
    if (actor.kind !== "super-admin") {
      throw new ForbiddenError("No tenés permisos para esta sección");
    }
    return actor;
  }

  async function changePassword(actor: CurrentActor, command: ChangePasswordCommand): Promise<void> {
    const account = await repository.findAccountById(actor.adminId);
    if (!account) throw new UnauthorizedError();

    const validPassword = await passwordHasher.compare(command.currentPassword, account.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError("La contraseña actual no es correcta");
    }

    const newPasswordHash = await passwordHasher.hash(command.newPassword);
    const changed = await repository.changePasswordAndRevokeOtherSessions({
      adminId: actor.adminId,
      expectedPasswordHash: account.passwordHash,
      newPasswordHash,
      currentJti: actor.jti,
    });

    if (!changed) {
      throw new UnauthorizedError("La contraseña cambió durante la operación. Volvé a intentarlo");
    }
  }

  async function clearCookieWithoutMaskingAuthentication(): Promise<void> {
    try {
      await sessionCookie.clear();
    } catch {
      // Reading authentication state should not become a 500 because an invalid cookie could not be cleared.
    }
  }

  return {
    changePassword,
    getCurrentActor,
    getSessionClaims,
    login,
    logout,
    requireCurrentActor,
    requireSuperAdmin,
    requireTenantAdmin,
  };
}

type ActorWithoutSession = Omit<SuperAdminActor, "jti"> | Omit<TenantAdminActor, "jti">;

function accountToActorData(account: AccountRecord): ActorWithoutSession | null {
  const common = {
    adminId: account.id,
    email: account.email,
    mustChangePassword: account.mustChangePassword,
  };

  if (account.role === "SUPER_ADMIN") {
    return {
      ...common,
      kind: "super-admin",
      role: "SUPER_ADMIN",
      tenantId: null,
      tenantSlug: null,
    };
  }

  if (
    account.role === "TENANT_ADMIN" &&
    account.tenantId &&
    account.tenantSlug &&
    account.tenantStatus === "ACTIVE"
  ) {
    return {
      ...common,
      kind: "tenant-admin",
      role: "TENANT_ADMIN",
      tenantId: account.tenantId,
      tenantSlug: account.tenantSlug,
    };
  }

  return null;
}
