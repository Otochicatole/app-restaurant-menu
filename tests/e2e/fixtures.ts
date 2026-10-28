import type { Page } from "@playwright/test";
export const E2E = {
 zoomMenu: { slug: "e2e-zoom", width: 10_000, height: 40_000 },
 superAdmin: { email: "e2e-super@example.test", password: "E2e-super-password-123" },
 tenantAdmin: { email: "e2e-tenant@example.test", password: "E2e-tenant-password-123", slug: "e2e-cafe", restaurantId: "e2e-restaurant-cafe" },
 branch: { restaurantId: "e2e-restaurant-branch", slug: "e2e-branch", name: "E2E Sucursal" },
 forcedPasswordAdmin: { email: "e2e-force@example.test", password: "E2e-force-password-123", replacementPassword: "E2e-replaced-password-456", slug: "e2e-force", restaurantId: "e2e-restaurant-force", mustChangePassword: true },
 otherTenant: { email: "e2e-other@example.test", password: "E2e-other-password-123", slug: "e2e-other", restaurantId: "e2e-restaurant-other" },
} as const;
export type E2ECredentials = { email: string; password: string; restaurantId?: string; mustChangePassword?: boolean };
export function restaurantPath(restaurantId: string) { return "/admin/restaurantes/" + encodeURIComponent(restaurantId); }
export function editorApi(restaurantId: string) { return "/api/restaurants/" + encodeURIComponent(restaurantId) + "/editor"; }
export async function loginAs(page: Page, account: E2ECredentials, options: { openRestaurant?: boolean } = {}): Promise<void> {
 await page.goto("/admin/login");
 await page.getByLabel("Correo electrónico").fill(account.email);
 await page.getByLabel("Contraseña").fill(account.password);
 await page.getByRole("button", { name: "Iniciar sesión" }).click();
 await page.waitForURL((url) => url.pathname !== "/admin/login");
 if (options.openRestaurant !== false && account.restaurantId && !account.mustChangePassword) await page.goto(restaurantPath(account.restaurantId));
}
