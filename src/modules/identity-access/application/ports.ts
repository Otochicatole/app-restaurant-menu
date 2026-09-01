import type { AdminRole } from "../contracts";
import type { IssuedSession, SessionClaims } from "../domain/session";

export type AccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantStatus: "ACTIVE" | "SUSPENDED" | null;
  mustChangePassword: boolean;
};

export interface IdentityRepository {
  findAccountByEmail(email: string): Promise<AccountRecord | null>;
  findAccountById(adminId: string): Promise<AccountRecord | null>;
  findAuthenticatedAccount(input: {
    adminId: string;
    jti: string;
    now: Date;
  }): Promise<AccountRecord | null>;
  recordSuccessfulLogin(input: {
    adminId: string;
    jti: string;
    expiresAt: Date;
    occurredAt: Date;
  }): Promise<void>;
  revokeSession(jti: string): Promise<void>;
  changePasswordAndRevokeOtherSessions(input: {
    adminId: string;
    expectedPasswordHash: string;
    newPasswordHash: string;
    currentJti: string;
  }): Promise<boolean>;
}

export interface PasswordHasher {
  compare(plainText: string, passwordHash: string): Promise<boolean>;
  hash(plainText: string): Promise<string>;
}

export interface SessionTokenService {
  issue(payload: { adminId: string; email: string }, now: Date): Promise<IssuedSession>;
  verify(token: string): Promise<SessionClaims>;
}

export interface SessionCookie {
  read(): Promise<string | undefined>;
  write(token: string, expiresAt: Date): Promise<void>;
  clear(): Promise<void>;
}

export interface LoginThrottle {
  retryAfterSeconds(key: string, now: Date): Promise<number | null>;
  recordFailure(key: string, now: Date): Promise<void>;
  reset(key: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}
