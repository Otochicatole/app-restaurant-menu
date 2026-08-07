import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken } from "./tokens";
import type { SessionPayload } from "./tokens";

const COOKIE_NAME = "session";

export async function createSessionCookie(adminId: string, email: string): Promise<string> {
  const { token, jti } = await createSessionToken({ adminId, email });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return jti;
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function removeSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export { verifySessionToken };
export type { SessionPayload };
