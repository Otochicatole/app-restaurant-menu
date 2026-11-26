import { getRedirectUrl, unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const origin = "https://restaurant.example";

describe("English application routes", () => {
  it.each([
    ["/sala?restaurantId=restaurant-1", "/floor?restaurantId=restaurant-1"],
    ["/admin/restaurantes", "/admin/restaurants"],
    ["/admin/restaurantes/restaurant-1", "/admin/restaurants/restaurant-1"],
    ["/admin/restaurantes/restaurant-1/salones?roomId=window", "/admin/restaurants/restaurant-1/rooms?roomId=window"],
    ["/admin/restaurantes/restaurant-1/reservas?date=2099-12-01", "/admin/restaurants/restaurant-1/reservations?date=2099-12-01"],
    ["/admin/restaurantes/restaurant-1/settings/fonts", "/admin/restaurants/restaurant-1/settings/fonts"],
    ["/admin/reservas", "/admin/reservations"],
    ["/superadmin/clientes", "/superadmin/clients"],
    ["/superadmin/clientes/organization-1/restaurantes/restaurant-1/landing?tab=code", "/superadmin/clients/organization-1/restaurants/restaurant-1/landing?tab=code"],
    ["/superadmin/plantillas?status=PUBLIC", "/superadmin/templates?status=PUBLIC"],
  ])("redirects %s directly to its canonical English URL", async (source, destination) => {
    const response = await unstable_getResponseFromNextConfig({ url: `${origin}${source}`, nextConfig });
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`${origin}${destination}`);
  });

  it.each([
    "/floor?restaurantId=restaurant-1",
    "/admin/restaurants",
    "/admin/restaurants/restaurant-1/rooms",
    "/admin/restaurants/restaurant-1/reservations",
    "/superadmin/clients/organization-1/restaurants/restaurant-1/landing",
    "/superadmin/templates",
    "/api/restaurants/restaurant-1/floor",
  ])("does not redirect the canonical route %s again", async (pathname) => {
    const response = await unstable_getResponseFromNextConfig({ url: `${origin}${pathname}`, nextConfig });
    expect(response.status).toBe(200);
    expect(getRedirectUrl(response)).toBeNull();
  });
});
