import { expect, test } from "@playwright/test";
import { E2E, loginAs } from "./fixtures";

test("tenant admin opens the Canvas editor and publishes a document", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Editor de E2E Café")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Capas/ })).toBeVisible();

  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await expect(page.getByText("Nuevo texto").first()).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByText("Guardado")).toBeVisible();
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Publicado")).toBeVisible();
});

test("tenant admin can open the icon library and image library", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Iconos", exact: true }).click();
  await expect(page.getByText("Iconos").last()).toBeVisible();
  await expect(page.getByPlaceholder("Buscar iconos...")).toBeVisible();
  await page.getByPlaceholder("Buscar iconos...").fill("coffee");
  await expect(page.getByRole("button", { name: /Agregar icono/i }).first()).toBeVisible();

  await page.getByRole("button", { name: "Imágenes" }).click();
  await expect(page.getByText("Café E2E").last()).toBeVisible();
});

test("tenant admin can associate media, publish it immediately, and open it publicly", async ({ page, context }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await expect(page.getByText("Al hacer clic")).toBeVisible();
  await page.getByRole("button", { name: /^Al hacer clic/ }).click();
  await page.getByRole("button", { name: "Elegir multimedia" }).click();
  await page.locator("#editor-images").getByRole("button", { name: /Café E2E/ }).click();
  await expect(page.getByRole("button", { name: "Quitar" })).toBeEnabled();
  await expect(page.getByText("Cambios pendientes")).toBeVisible();

  const publish = page.getByRole("button", { name: "Publicar" });
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByText("Publicado", { exact: true })).toBeVisible();

  const publicPage = await context.newPage();
  await publicPage.goto(`/m/${E2E.tenantAdmin.slug}`);
  await publicPage.getByRole("button", { name: "Ver contenido en texto" }).click();
  await publicPage.getByRole("button", { name: "Nuevo texto", exact: true }).last().click();
  await expect(publicPage.getByRole("dialog", { name: "Café E2E" })).toBeVisible();
  await publicPage.getByRole("button", { name: "Cerrar multimedia" }).click();
  await publicPage.close();

  await page.reload();
  await page.getByText("Nuevo texto", { exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Cambiar multimedia" })).toBeVisible();
  await page.getByRole("button", { name: "Vista previa" }).click();
  const preview = page.getByRole("dialog", { name: "Vista previa del menú" });
  await expect(preview).toBeVisible();
  const previewCanvas = preview.locator("canvas").first();
  const canvasBox = await previewCanvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox) {
    const scale = (canvasBox.width - 20) / 1240;
    await previewCanvas.click({ position: { x: 10 + 370 * scale, y: 10 + 585 * scale } });
  }
  await expectLoadedCenteredImage(page, "Café E2E");
  await page.getByRole("button", { name: "Cerrar multimedia" }).click();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  await expect(page.getByRole("dialog", { name: "Vista previa del menú" })).toHaveCount(0);
});

test("tenant admin can choose rectangle border sides", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Rectángulo", exact: true }).first().click();

  await page.getByRole("button", { name: /^Borde Sin borde visible/ }).click();
  const top = page.getByRole("button", { name: "Borde arriba" });
  const right = page.getByRole("button", { name: "Borde derecha" });
  const bottom = page.getByRole("button", { name: "Borde abajo" });
  const left = page.getByRole("button", { name: "Borde izquierda" });
  await expect(top).toHaveAttribute("aria-pressed", "true");
  await expect(right).toHaveAttribute("aria-pressed", "true");
  await expect(bottom).toHaveAttribute("aria-pressed", "true");
  await expect(left).toHaveAttribute("aria-pressed", "true");

  await right.click();
  await bottom.click();
  await expect(right).toHaveAttribute("aria-pressed", "false");
  await expect(bottom).toHaveAttribute("aria-pressed", "false");
  await expect(top).toHaveAttribute("aria-pressed", "true");
  await expect(left).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await expect(right).toHaveAttribute("aria-pressed", "true");
  await expect(bottom).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /^Esquinas/ }).click();
  const topLeft = page.getByRole("spinbutton", { name: "Arriba izquierda" });
  const topRight = page.getByRole("spinbutton", { name: "Arriba derecha" });
  const bottomRight = page.getByRole("spinbutton", { name: "Abajo derecha" });
  const bottomLeft = page.getByRole("spinbutton", { name: "Abajo izquierda" });
  await topLeft.fill("12");
  await topRight.fill("24");
  await bottomRight.fill("36");
  await bottomLeft.fill("48");
  await expect(topLeft).toHaveValue("12");
  await expect(topRight).toHaveValue("24");
  await expect(bottomRight).toHaveValue("36");
  await expect(bottomLeft).toHaveValue("48");

  await page.getByRole("spinbutton", { name: "Valor común" }).fill("18");
  await page.getByRole("button", { name: "Igualar esquinas" }).click();
  await expect(topLeft).toHaveValue("18");
  await expect(topRight).toHaveValue("18");
  await expect(bottomRight).toHaveValue("18");
  await expect(bottomLeft).toHaveValue("18");
});

test("tenant admin can configure a rectangle gradient and background image", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Rectángulo", exact: true }).first().click();

  await page.getByRole("button", { name: "Agregar degradado" }).click();
  await expect(page.getByRole("button", { name: "Quitar degradado" })).toBeVisible();
  await page.getByRole("button", { name: "Degradado hacia derecha" }).click();
  await expect(page.getByRole("spinbutton", { name: "Ángulo del degradado" })).toHaveValue("90");

  await page.getByRole("button", { name: "Elegir imagen de fondo" }).click();
  await page.locator("#editor-images").getByRole("button", { name: /Café E2E/ }).click();
  await expect(page.getByText("Café E2E").last()).toBeVisible();
  await page.getByRole("combobox", { name: "Ajuste de imagen de fondo" }).selectOption("contain");
  await page.getByRole("spinbutton", { name: "Posición horizontal porcentaje" }).fill("25");
  await page.getByRole("spinbutton", { name: "Posición vertical porcentaje" }).fill("75");
  const imageOpacity = page.getByRole("spinbutton", { name: "Opacidad de imagen porcentaje" });
  await imageOpacity.fill("60");
  await expect(page.getByText("Cambios pendientes")).toBeVisible();

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(imageOpacity).toHaveValue("100");
  await page.getByRole("button", { name: "Rehacer" }).click();
  await expect(imageOpacity).toHaveValue("60");
  await expect(page.getByRole("button", { name: "Quitar imagen de fondo" })).toBeVisible();
});

test("properties stay readable and keep object actions visible while scrolling", async ({ page }, testInfo) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Rectángulo", exact: true }).first().click();
  const inspector = page.getByRole("complementary", { name: "Propiedades del objeto" });
  const name = inspector.getByRole("textbox", { name: "Nombre de la capa" });
  const duplicate = inspector.getByRole("button", { name: "Duplicar", exact: true });
  const nameBox = await name.boundingBox();
  const actionBox = await duplicate.boundingBox();
  await inspector.getByRole("button", { name: "Agregar degradado" }).click();
  await inspector.getByRole("slider", { name: "Posición final del degradado" }).scrollIntoViewIfNeeded();

  expect(await name.boundingBox()).toEqual(nameBox);
  expect(await duplicate.boundingBox()).toEqual(actionBox);
  await expect(name).toBeInViewport();
  await expect(duplicate).toBeInViewport();
  await expect(inspector.getByRole("button", { name: "Eliminar", exact: true })).toBeInViewport();
  expect(await inspector.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const controlsFit = await inspector.locator("input, select, textarea").evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().width > 0).every((element) => {
    const bounds = element.closest("aside")!.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return rect.left >= bounds.left && rect.right <= bounds.right;
  }));
  expect(controlsFit).toBe(true);
  await inspector.screenshot({ path: testInfo.outputPath("properties-gradient.png") });
  await inspector.getByRole("button", { name: /^Relleno y fondo/ }).click();
  await expect(inspector.getByRole("button", { name: /^Esquinas/ })).toBeVisible();
  await inspector.screenshot({ path: testInfo.outputPath("properties-sections.png") });
});

async function expectLoadedCenteredImage(page: import("@playwright/test").Page, name: string): Promise<void> {
  const dialog = page.getByRole("dialog", { name });
  const image = dialog.getByRole("img", { name });
  await expect(dialog).toBeVisible();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  const viewport = page.viewportSize();
  const box = await dialog.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  if (!viewport || !box) return;
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(2);
}
