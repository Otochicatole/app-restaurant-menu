import { expect, test } from "@playwright/test";
import { E2E, loginAs } from "./fixtures";

test("tenant admin sees only its catalog and can safely create and remove a group", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Resumen del menú" })).toBeVisible();

  await page.goto("/admin/catalog");
  await expect(page.getByRole("heading", { name: "Catálogo del menú" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Café E2E" })).toBeVisible();
  await expect(page.getByText("Producto secreto E2E")).toHaveCount(0);

  const groupName = "Grupo temporal E2E";
  await page.getByRole("button", { name: "Nuevo grupo" }).click();
  const createDialog = page.getByRole("dialog", { name: "Crear grupo" });
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel("Nombre").fill(groupName);
  await createDialog.getByLabel("Descripción").fill("Creado y eliminado por Playwright");
  await createDialog.getByRole("button", { name: "Crear grupo" }).click();

  await expect(createDialog).toBeHidden();
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(groupName) })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar grupo" }).click();
  const deleteDialog = page.getByRole("dialog", { name: `¿Eliminar ${groupName}?` });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Eliminar" }).click();

  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(groupName) })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Todos los productos" })).toBeVisible();
});

test("tenant admin creates, publishes, removes media and deletes a product", async ({ page }, testInfo) => {
  const productName = `Producto E2E ${testInfo.retry}`;
  await loginAs(page, E2E.tenantAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/catalog/new");

  await page.getByLabel("Nombre").fill(productName);
  await page.getByLabel("Descripción").fill("Producto temporal de Playwright");
  await page.getByLabel("Precio").fill("7.50");
  await page.getByLabel("Grupo").selectOption({ label: "Bebidas" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "product.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Crear producto" }).click();

  await expect(page).toHaveURL(/\/admin\/catalog$/);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  let publicProduct = page.locator("[data-menu-product]").filter({ hasText: productName });
  await expect(publicProduct).toBeVisible();
  await expect(publicProduct.locator("[data-menu-media]")).toHaveCount(1);

  await page.goto("/admin/catalog");
  let productRow = page.locator("article").filter({ hasText: productName });
  await productRow.getByRole("button", { name: "Editar" }).click();
  const editDialog = page.getByRole("dialog", { name: "Editar producto" });
  await editDialog.getByRole("button", { name: "Quitar archivo" }).click();
  await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(editDialog).toBeHidden();

  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  publicProduct = page.locator("[data-menu-product]").filter({ hasText: productName });
  await expect(publicProduct).toBeVisible();
  await expect(publicProduct.locator("[data-menu-media]")).toHaveCount(0);

  await page.goto("/admin/catalog");
  productRow = page.locator("article").filter({ hasText: productName });
  await productRow.getByRole("button", { name: "Eliminar" }).click();
  const deleteDialog = page.getByRole("dialog", { name: `¿Eliminar ${productName}?` });
  await deleteDialog.getByRole("button", { name: "Eliminar" }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole("heading", { name: productName })).toHaveCount(0);
});
