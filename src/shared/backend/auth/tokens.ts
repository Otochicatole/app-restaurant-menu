import { SignJWT, jwtVerify } from "jose";

const secretValue = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "local-dev-jwt-secret-change-in-development");
if (secretValue.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
}
const JWT_SECRET = new TextEncoder().encode(secretValue);


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
