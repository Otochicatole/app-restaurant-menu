import "server-only";
import { cookies } from "next/headers";
import { getServerEnv } from "@/platform/config/server-env";

export const ACTIVE_RESTAURANT_COOKIE = "active_restaurant";
export async function writeActiveRestaurantCookie(restaurantId: string) {
  (await cookies()).set(ACTIVE_RESTAURANT_COOKIE, restaurantId, { httpOnly: true, sameSite: "lax", path: "/",
    secure: getServerEnv().NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
}
export async function clearActiveRestaurantCookie() {
  const store = await cookies();
  store.delete(ACTIVE_RESTAURANT_COOKIE);
  store.delete("menu_project");
}
