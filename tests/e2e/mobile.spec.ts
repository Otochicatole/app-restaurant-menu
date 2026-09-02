import { expect, test } from "@playwright/test";
import { E2E, loginAs } from "./fixtures";

test("public menu renders the published Canvas and accessible text", async ({ page }) => {
  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  await expect(page.getByRole("button", { name: "Ver contenido en texto" })).toBeVisible();
  await expect(page.getByText("Café E2E").first()).toBeAttached();
  await page.getByRole("button", { name: "Ver contenido en texto" }).click();
  await expect(page.getByText("Café E2E").last()).toBeVisible();
  await page.getByRole("button", { name: "Café E2E" }).last().click();
  await expect(page.getByRole("dialog", { name: "Café E2E" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar multimedia" }).click();
  await expect(page.getByRole("dialog", { name: "Café E2E" })).toHaveCount(0);
});

test("forced-password account cannot enter the editor before changing its password", async ({ page }) => {
  await loginAs(page, E2E.forcedPasswordAdmin);
  await expect(page).toHaveURL(/\/admin\/account\/password$/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/account\/password$/);
  await page.getByLabel("Contraseña actual").fill(E2E.forcedPasswordAdmin.password);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(E2E.forcedPasswordAdmin.replacementPassword);
  await page.getByLabel("Repetí la nueva contraseña").fill(E2E.forcedPasswordAdmin.replacementPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Editor de carta" })).toBeVisible();
});
