import { cookies } from "next/headers";
import { getServerEnv } from "@/platform/config/server-env";
import type { SessionCookie } from "../application/ports";

export const SESSION_COOKIE_NAME = "session";

export class NextSessionCookie implements SessionCookie {
  async read(): Promise<string | undefined> {
    return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  }

  async write(token: string, expiresAt: Date): Promise<void> {
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    (await cookies()).set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: getServerEnv().NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }

  async clear(): Promise<void> {
    (await cookies()).delete(SESSION_COOKIE_NAME);
  }
}
