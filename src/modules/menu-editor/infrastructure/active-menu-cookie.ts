import "server-only";

import { cookies } from "next/headers";
import { getServerEnv } from "@/platform/config/server-env";

export const ACTIVE_MENU_COOKIE = "menu_project";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function readActiveMenuCookie(): Promise<string | undefined> {
  return (await cookies()).get(ACTIVE_MENU_COOKIE)?.value;
}

export async function writeActiveMenuCookie(projectId: string): Promise<void> {
  (await cookies()).set(ACTIVE_MENU_COOKIE, projectId, {
    httpOnly: true,
    secure: getServerEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearActiveMenuCookie(): Promise<void> {
  (await cookies()).delete(ACTIVE_MENU_COOKIE);
}
