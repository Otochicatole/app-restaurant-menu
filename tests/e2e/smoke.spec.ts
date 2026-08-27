import { test, expect } from "@playwright/test";

test("platform landing and legacy public menu are reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Ingresar al panel" })).toBeVisible();
  await page.goto("/m/fuzion");
  await expect(page.locator("main")).toBeVisible();
});

test("anonymous users are redirected away from the CMS", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
