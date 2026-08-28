import { expect, test } from "@playwright/test";
import { E2E, loginAs } from "./fixtures";

test("mobile public menu supports search and the product media modal", async ({ page }) => {
  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  await expect(page.getByRole("heading", { name: "Carta de E2E Café", level: 1 })).toBeVisible();

  const product = page.locator("[data-menu-product]").filter({ hasText: "Café E2E" });
  await expect(product).toBeVisible();
  await expect(page.getByText("Producto secreto E2E")).toHaveCount(0);

  await page.getByRole("button", { name: "Abrir búsqueda" }).click();
  const searchDialog = page.getByRole("dialog", { name: "Buscar en el catálogo" });
  await expect(searchDialog).toBeVisible();
  await searchDialog.getByRole("searchbox", { name: "Buscar en el catálogo" }).fill("cafe");
  await expect(searchDialog.getByRole("button", { name: /Café E2E/ })).toBeVisible();
  await searchDialog.getByRole("button", { name: /Café E2E/ }).click();
  await expect(searchDialog).toBeHidden();
  await expect(product).toHaveClass(/menu-product-highlight/);

  const mediaButton = product.locator("[data-menu-media]");
  await mediaButton.click();
  const mediaDialog = page.getByRole("dialog", { name: "Café E2E" });
  await expect(mediaDialog).toBeVisible();
  await expect(mediaDialog.getByRole("img", { name: "Café E2E" })).toBeVisible();
  await mediaDialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(mediaDialog).toBeHidden();
  await expect(mediaButton).toBeFocused();
});

test("mobile forced-password account cannot enter the CMS before changing its password", async ({ page }) => {
  await loginAs(page, E2E.forcedPasswordAdmin);
  await expect(page).toHaveURL(/\/admin\/account\/password$/);
  await expect(page.getByRole("heading", { name: "Cambiá tu contraseña" })).toBeVisible();

  await page.goto("/admin/catalog");
  await expect(page).toHaveURL(/\/admin\/account\/password$/);

  await page.getByLabel("Contraseña actual").fill(E2E.forcedPasswordAdmin.password);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(E2E.forcedPasswordAdmin.replacementPassword);
  await page.getByLabel("Repetí la nueva contraseña").fill(E2E.forcedPasswordAdmin.replacementPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Resumen del menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("link", { name: "Catálogo", exact: true })).toBeVisible();
});
