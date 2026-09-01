import { describe, expect, it } from "vitest";
import { createIdentityAccess } from "./identity-access";
import type {
  AccountRecord,
  IdentityRepository,
  PasswordHasher,
  SessionCookie,
  SessionTokenService,
} from "./ports";

const NOW = new Date("2026-08-27T12:00:00.000Z");
const EXPIRES_AT = new Date("2026-08-28T12:00:00.000Z");

const activeTenantAccount: AccountRecord = {
  id: "admin-1",
  email: "Admin@Restaurant.test",
  passwordHash: "stored-hash",
  role: "TENANT_ADMIN",
  tenantId: "tenant-1",
  tenantSlug: "restaurant",
  tenantStatus: "ACTIVE",
  mustChangePassword: false,
};

const superAdminAccount: AccountRecord = {
  ...activeTenantAccount,
  id: "super-admin-1",
  email: "super@example.test",
  role: "SUPER_ADMIN",
  tenantId: null,
  tenantSlug: null,
  tenantStatus: null,
};

describe("identity access", () => {
  it("normalizes the email and establishes a tenant session after credentials are valid", async () => {
    const fixture = createFixture({ account: activeTenantAccount });

    const actor = await fixture.service.login(
      { email: "  ADMIN@RESTAURANT.TEST ", password: "password123" },
      "client-and-account",
    );

    expect(fixture.state.lookedUpEmail).toBe("admin@restaurant.test");
    expect(fixture.state.comparedHash).toBe("stored-hash");
    expect(fixture.state.loginRecord).toEqual({
      adminId: "admin-1",
      jti: "session-jti",
      expiresAt: EXPIRES_AT,
      occurredAt: NOW,
    });
    expect(fixture.state.writtenCookie).toEqual({ token: "signed-token", expiresAt: EXPIRES_AT });
    expect(fixture.state.throttleResets).toEqual(["client-and-account"]);
    expect(actor).toMatchObject({
      kind: "tenant-admin",
      tenantId: "tenant-1",
      tenantSlug: "restaurant",
      jti: "session-jti",
    });
  });

  it("always compares a password against the dummy hash when the email does not exist", async () => {
    const fixture = createFixture({ account: null });

    await expect(
      fixture.service.login({ email: "missing@example.test", password: "password123" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "Invalid email or password" });

    expect(fixture.state.comparedHash).toBe("dummy-hash");
    expect(fixture.state.loginRecord).toBeNull();
  });

  it("records only failed, well-formed credential attempts in the persistent throttle", async () => {
    const fixture = createFixture({ account: null });

    await expect(
      fixture.service.login(
        { email: "missing@example.test", password: "password123" },
        "client-and-account",
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(fixture.state.throttleFailures).toEqual(["client-and-account"]);
  });

  it("rejects a blocked credential key before reading the account", async () => {
    const fixture = createFixture({ account: activeTenantAccount, retryAfterSeconds: 42 });

    await expect(
      fixture.service.login(
        { email: activeTenantAccount.email, password: "password123" },
        "client-and-account",
      ),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      details: { retryAfterSeconds: 42 },
    });

    expect(fixture.state.lookedUpEmail).toBeNull();
  });

  it("revokes the database session if writing the cookie fails", async () => {
    const fixture = createFixture({ account: activeTenantAccount, cookieWriteFails: true });

    await expect(
      fixture.service.login({ email: activeTenantAccount.email, password: "password123" }),
    ).rejects.toThrow("cookie unavailable");

    expect(fixture.state.revokedJtis).toEqual(["session-jti"]);
  });

  it("rejects suspended tenant accounts after checking their password", async () => {
    const fixture = createFixture({
      account: { ...activeTenantAccount, tenantStatus: "SUSPENDED" },
    });

    await expect(
      fixture.service.login({ email: activeTenantAccount.email, password: "password123" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "La cuenta no está disponible" });
    expect(fixture.state.comparedHash).toBe("stored-hash");
  });

  it("changes the password and revokes every session except the current one as one repository operation", async () => {
    const fixture = createFixture({ account: activeTenantAccount });
    const actor = {
      kind: "tenant-admin" as const,
      role: "TENANT_ADMIN" as const,
      adminId: activeTenantAccount.id,
      email: activeTenantAccount.email,
      tenantId: "tenant-1",
      tenantSlug: "restaurant",
      mustChangePassword: true,
      jti: "current-jti",
    };

    await fixture.service.changePassword(actor, {
      currentPassword: "old-password",
      newPassword: "a-new-password",
      confirmPassword: "a-new-password",
    });

    expect(fixture.state.passwordChange).toEqual({
      adminId: "admin-1",
      expectedPasswordHash: "stored-hash",
      newPasswordHash: "new-hash",
      currentJti: "current-jti",
    });
  });

  it("clears a session whose tenant is suspended", async () => {
    const fixture = createFixture({
      account: { ...activeTenantAccount, tenantStatus: "SUSPENDED" },
      cookieToken: "signed-token",
    });

    await expect(fixture.service.getCurrentActor()).resolves.toBeNull();
    expect(fixture.state.revokedJtis).toEqual(["session-jti"]);
    expect(fixture.state.cookieCleared).toBe(true);
  });

  it("returns the current actor for an active persisted session", async () => {
    const fixture = createFixture({ account: activeTenantAccount, cookieToken: "signed-token" });

    await expect(fixture.service.getCurrentActor()).resolves.toMatchObject({
      kind: "tenant-admin",
      adminId: "admin-1",
      jti: "session-jti",
    });
    await expect(fixture.service.requireCurrentActor()).resolves.toMatchObject({ adminId: "admin-1" });
  });

  it("clears an invalid token without surfacing a cookie cleanup failure", async () => {
    const fixture = createFixture({
      account: activeTenantAccount,
      cookieToken: "invalid-token",
      tokenVerificationFails: true,
      cookieClearFails: true,
    });

    await expect(fixture.service.getSessionClaims()).resolves.toBeNull();
    expect(fixture.state.cookieCleared).toBe(true);
  });

  it("clears a valid token that no longer has a persisted session", async () => {
    const fixture = createFixture({
      account: activeTenantAccount,
      authenticatedAccount: null,
      cookieToken: "signed-token",
    });

    await expect(fixture.service.getCurrentActor()).resolves.toBeNull();
    expect(fixture.state.revokedJtis).toEqual([]);
    expect(fixture.state.cookieCleared).toBe(true);
  });

  it("logs out with no cookie, a valid cookie, and an invalid cookie", async () => {
    const noCookie = createFixture({ account: activeTenantAccount });
    await noCookie.service.logout();
    expect(noCookie.state.cookieCleared).toBe(true);

    const validCookie = createFixture({ account: activeTenantAccount, cookieToken: "signed-token" });
    await validCookie.service.logout();
    expect(validCookie.state.revokedJtis).toEqual(["session-jti"]);
    expect(validCookie.state.cookieCleared).toBe(true);

    const invalidCookie = createFixture({
      account: activeTenantAccount,
      cookieToken: "invalid-token",
      tokenVerificationFails: true,
    });
    await invalidCookie.service.logout();
    expect(invalidCookie.state.revokedJtis).toEqual([]);
    expect(invalidCookie.state.cookieCleared).toBe(true);
  });

  it("enforces tenant role and mandatory-password policies", async () => {
    const noSession = createFixture({ account: activeTenantAccount });
    await expect(noSession.service.requireTenantAdmin()).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const superAdmin = createFixture({ account: superAdminAccount, cookieToken: "signed-token" });
    await expect(superAdmin.service.requireTenantAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });

    const mustChange = createFixture({
      account: { ...activeTenantAccount, mustChangePassword: true },
      cookieToken: "signed-token",
    });
    await expect(mustChange.service.requireTenantAdmin()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Debés cambiar tu contraseña antes de continuar",
    });

    const tenant = createFixture({ account: activeTenantAccount, cookieToken: "signed-token" });
    await expect(tenant.service.requireTenantAdmin()).resolves.toMatchObject({ kind: "tenant-admin" });
  });

  it("enforces superadmin role", async () => {
    const tenant = createFixture({ account: activeTenantAccount, cookieToken: "signed-token" });
    await expect(tenant.service.requireSuperAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });

    const superAdmin = createFixture({ account: superAdminAccount, cookieToken: "signed-token" });
    await expect(superAdmin.service.requireSuperAdmin()).resolves.toMatchObject({ kind: "super-admin" });
  });

  it("rejects password changes for missing accounts, wrong passwords, and concurrent changes", async () => {
    const actor = tenantActor();

    const missing = createFixture({ account: null });
    await expect(missing.service.changePassword(actor, passwordCommand())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    const wrongPassword = createFixture({ account: activeTenantAccount, passwordMatches: false });
    await expect(wrongPassword.service.changePassword(actor, passwordCommand())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "La contraseña actual no es correcta",
    });

    const concurrent = createFixture({
      account: activeTenantAccount,
      passwordChangeSucceeds: false,
    });
    await expect(concurrent.service.changePassword(actor, passwordCommand())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "La contraseña cambió durante la operación. Volvé a intentarlo",
    });
  });
});

function createFixture(options: {
  account: AccountRecord | null;
  cookieToken?: string;
  cookieWriteFails?: boolean;
  retryAfterSeconds?: number;
  authenticatedAccount?: AccountRecord | null;
  tokenVerificationFails?: boolean;
  cookieClearFails?: boolean;
  passwordMatches?: boolean;
  passwordChangeSucceeds?: boolean;
}) {
  const state: {
    lookedUpEmail: string | null;
    comparedHash: string | null;
    loginRecord: Parameters<IdentityRepository["recordSuccessfulLogin"]>[0] | null;
    writtenCookie: { token: string; expiresAt: Date } | null;
    revokedJtis: string[];
    passwordChange: Parameters<IdentityRepository["changePasswordAndRevokeOtherSessions"]>[0] | null;
    cookieCleared: boolean;
    throttleFailures: string[];
    throttleResets: string[];
  } = {
    lookedUpEmail: null,
    comparedHash: null,
    loginRecord: null,
    writtenCookie: null,
    revokedJtis: [],
    passwordChange: null,
    cookieCleared: false,
    throttleFailures: [],
    throttleResets: [],
  };

  const repository: IdentityRepository = {
    async findAccountByEmail(email) {
      state.lookedUpEmail = email;
      return options.account;
    },
    async findAccountById() {
      return options.account;
    },
    async findAuthenticatedAccount() {
      return options.authenticatedAccount === undefined ? options.account : options.authenticatedAccount;
    },
    async recordSuccessfulLogin(input) {
      state.loginRecord = input;
    },
    async revokeSession(jti) {
      state.revokedJtis.push(jti);
    },
    async changePasswordAndRevokeOtherSessions(input) {
      state.passwordChange = input;
      return options.passwordChangeSucceeds ?? true;
    },
  };

  const passwordHasher: PasswordHasher = {
    async compare(_plainText, passwordHash) {
      state.comparedHash = passwordHash;
      return options.passwordMatches ?? passwordHash === "stored-hash";
    },
    async hash() {
      return "new-hash";
    },
  };

  const tokenService: SessionTokenService = {
    async issue(payload) {
      return {
        token: "signed-token",
        claims: { ...payload, jti: "session-jti" },
        expiresAt: EXPIRES_AT,
      };
    },
    async verify() {
      if (options.tokenVerificationFails) throw new Error("invalid token");
      return { adminId: "admin-1", email: activeTenantAccount.email, jti: "session-jti" };
    },
  };

  const sessionCookie: SessionCookie = {
    async read() {
      return options.cookieToken;
    },
    async write(token, expiresAt) {
      if (options.cookieWriteFails) throw new Error("cookie unavailable");
      state.writtenCookie = { token, expiresAt };
    },
    async clear() {
      state.cookieCleared = true;
      if (options.cookieClearFails) throw new Error("cookie unavailable");
    },
  };

  return {
    state,
    service: createIdentityAccess({
      repository,
      passwordHasher,
      tokenService,
      sessionCookie,
      clock: { now: () => NOW },
      loginThrottle: {
        async retryAfterSeconds() {
          return options.retryAfterSeconds ?? null;
        },
        async recordFailure(key) {
          state.throttleFailures.push(key);
        },
        async reset(key) {
          state.throttleResets.push(key);
        },
      },
      dummyPasswordHash: "dummy-hash",
    }),
  };
}

function tenantActor() {
  return {
    kind: "tenant-admin" as const,
    role: "TENANT_ADMIN" as const,
    adminId: activeTenantAccount.id,
    email: activeTenantAccount.email,
    tenantId: "tenant-1",
    tenantSlug: "restaurant",
    mustChangePassword: false,
    jti: "current-jti",
  };
}

function passwordCommand() {
  return {
    currentPassword: "old-password",
    newPassword: "a-new-password",
    confirmPassword: "a-new-password",
  };
}
