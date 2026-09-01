import { test, expect } from "@playwright/test";
import { E2E } from "./fixtures";

test("platform landing and the published Canvas menu are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Ingresar al panel" })).toBeVisible();

  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  await expect(page.getByRole("button", { name: "Ver contenido en texto" })).toBeVisible();
  await expect(page.getByText("Café E2E").first()).toBeAttached();
});

test("public menus expose only their own publication state", async ({ page }) => {
  await page.goto(`/m/${E2E.otherTenant.slug}`);
  await expect(page.getByRole("heading", { name: "Carta en preparación" })).toBeVisible();
  await expect(page.getByText("Café E2E")).toHaveCount(0);
});

test("anonymous users are redirected away from the CMS", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
