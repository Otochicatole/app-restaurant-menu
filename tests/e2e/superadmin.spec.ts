import { expect, test } from "@playwright/test";
import { E2E, loginAs } from "./fixtures";

test("superadmin manages the complete tenant lifecycle", async ({ page }, testInfo) => {
  const tenantName = `E2E Creado ${testInfo.retry}`;
  const slug = `e2e-created-${testInfo.retry}`;
  const email = `e2e-created-${testInfo.retry}@example.test`;

  await loginAs(page, E2E.superAdmin);
  await expect(page).toHaveURL(/\/superadmin$/);
  await page.getByLabel("Nombre del negocio").fill(tenantName);
  await page.getByLabel("Correo de acceso").fill(email);
  await page.getByLabel("Slug público").fill(slug);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  const nameInput = page.getByLabel(`Nombre de ${tenantName}`);
  await expect(nameInput).toBeVisible();
  await expect(page.getByText("Contraseña temporal (guardala ahora)").first()).toBeVisible();
  const tenantRow = nameInput.locator("xpath=ancestor::div[@aria-busy][1]");

  await tenantRow.getByRole("button", { name: "Suspender" }).click();
  let dialog = page.getByRole("dialog", { name: `¿Suspender ${tenantName}?` });
  await dialog.getByRole("button", { name: "Suspender cuenta" }).click();
  await expect(dialog).toBeHidden();
  await expect(tenantRow.getByText("Suspendido", { exact: true })).toBeVisible();

  await tenantRow.getByRole("button", { name: "Reactivar" }).click();
  dialog = page.getByRole("dialog", { name: `¿Reactivar ${tenantName}?` });
  await dialog.getByRole("button", { name: "Reactivar cuenta" }).click();
  await expect(dialog).toBeHidden();
  await expect(tenantRow.getByText("Activo", { exact: true })).toBeVisible();

  await tenantRow.getByRole("button", { name: "Restablecer clave" }).click();
  dialog = page.getByRole("dialog", { name: `¿Restablecer la clave de ${tenantName}?` });
  await dialog.getByRole("button", { name: "Restablecer clave" }).click();
  await expect(dialog).toBeHidden();
  await expect(tenantRow.getByText("Contraseña temporal (guardala ahora)")).toBeVisible();

  await tenantRow.getByRole("button", { name: "Borrar" }).click();
  dialog = page.getByRole("dialog", { name: `¿Borrar ${tenantName}?` });
  await dialog.getByRole("button", { name: "Borrar cuenta" }).click();
  await expect(dialog).toBeHidden();
  await expect(nameInput).toHaveCount(0);
});
