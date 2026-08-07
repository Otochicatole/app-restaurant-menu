import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET === "local-dev-jwt-secret-change-in-production") {
  console.warn("[SECURITY] Using default JWT_SECRET in production. Set JWT_SECRET env var.");
}

export interface SessionPayload {
  adminId: string;
  email: string;
  jti: string;
}

export async function createSessionToken(payload: Omit<SessionPayload, "jti">): Promise<{ token: string; jti: string }> {
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
  return { token, jti };
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify<SessionPayload>(token, JWT_SECRET);
  return payload;
}
