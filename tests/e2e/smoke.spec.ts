import { test, expect } from "@playwright/test";
import { E2E } from "./fixtures";

test("platform landing and the e2e café menu are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Ingresar al panel" })).toBeVisible();

  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  await expect(page.getByRole("heading", { name: "Carta de E2E Café", level: 1 })).toBeVisible();
  await expect(page.locator("[data-menu-product]").filter({ hasText: "Café E2E" })).toBeVisible();
  await expect(page.getByText("Producto secreto E2E")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Productos destacados" })).toHaveCount(1);
});

test("public menus expose only their own tenant data", async ({ page }) => {
  await page.goto(`/m/${E2E.otherTenant.slug}`);

  await expect(page.getByRole("heading", { name: "Carta de E2E Otro", level: 1 })).toBeVisible();
  await expect(page.getByText("Producto secreto E2E")).toBeVisible();
  await expect(page.getByText("Café E2E")).toHaveCount(0);
});

test("anonymous users are redirected away from the CMS", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
