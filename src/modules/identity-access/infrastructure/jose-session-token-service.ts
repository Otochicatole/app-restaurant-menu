import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { getServerEnv } from "@/platform/config/server-env";
import type { SessionTokenService } from "../application/ports";
import type { SessionClaims } from "../domain/session";

const SESSION_DURATION_SECONDS = 24 * 60 * 60;

const sessionClaimsSchema = z.object({
  adminId: z.string().min(1),
  email: z.string().email(),
  jti: z.string().min(1),
});

export class JoseSessionTokenService implements SessionTokenService {
  private readonly secret: Uint8Array;

  constructor(secretValue: string) {
    if (secretValue.length < 32) {
      throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
    }
    this.secret = new TextEncoder().encode(secretValue);
  }

  async issue(payload: { adminId: string; email: string }, now: Date) {
    const jti = crypto.randomUUID();
    const issuedAt = Math.floor(now.getTime() / 1000);
    const expiresAt = new Date((issuedAt + SESSION_DURATION_SECONDS) * 1000);
    const claims: SessionClaims = { ...payload, jti };
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + SESSION_DURATION_SECONDS)
      .sign(this.secret);

    return { token, claims, expiresAt };
  }

  async verify(token: string): Promise<SessionClaims> {
    const { payload } = await jwtVerify(token, this.secret);
    return sessionClaimsSchema.parse(payload);
  }
}

export function resolveJwtSecret(): string {
  return getServerEnv().JWT_SECRET;
}
