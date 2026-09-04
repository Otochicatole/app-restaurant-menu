import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { decodeTemplateBundle } from "../../src/modules/menu-editor/domain/template-bundle";
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

test("tenant admin can export a complete template and import it in another restaurant", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Plantillas", exact: true }).click();
  const library = page.locator("#editor-templates");
  const name = `Plantilla portable ${Date.now()}`;
  await library.getByRole("button", { name: "Guardar borrador" }).click();
  const saveDialog = page.getByRole("dialog", { name: "Guardar plantilla" });
  await saveDialog.getByLabel("Nombre").fill(name);
  await saveDialog.getByLabel("Descripción").fill("Documento y recursos incluidos");
  await saveDialog.getByRole("button", { name: "Guardar", exact: true }).click();
  const sourceCard = library.locator("article").filter({ hasText: name });
  await expect(sourceCard).toBeVisible();

  await page.route(/\/api\/editor\/templates\/[^/]+\/export$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  const downloadEvent = page.waitForEvent("download");
  await sourceCard.getByRole("button", { name: `Exportar ${name}` }).click();
  await expect(sourceCard.getByRole("button", { name: `Exportando ${name}` })).toBeVisible();
  const download = await downloadEvent;
  await expect(library.getByRole("status")).toContainText("Archivo listo:");
  expect(download.suggestedFilename()).toBe(`${name.replaceAll(" ", "-")}.menutemplate`);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("La plantilla exportada no generó un archivo local");
  const decoded = decodeTemplateBundle(new Uint8Array(await readFile(downloadPath)));
  expect(decoded.name).toBe(name);
  expect(decoded.assets.some((asset) => asset.kind === "IMAGE" && asset.name === "Café E2E")).toBe(true);

  await page.context().clearCookies();
  await loginAs(page, E2E.otherTenant);
  await page.getByRole("button", { name: "Plantillas", exact: true }).click();
  const targetLibrary = page.locator("#editor-templates");
  await page.route("**/api/editor/templates/import", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await targetLibrary.getByLabel("Importar plantilla completa").setInputFiles(downloadPath);
  await expect(targetLibrary.getByText("Importando plantilla…", { exact: true })).toBeVisible();
  await expect(page.getByText("Plantilla importada", { exact: true })).toBeVisible();
  const importedCard = targetLibrary.locator("article").filter({ hasText: name });
  await expect(importedCard).toBeVisible();
  await importedCard.getByRole("button", { name: "Usar" }).click();
  await expect(page.getByText("Plantilla aplicada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Imágenes", exact: true }).click();
  await expect(page.locator("#editor-images").getByRole("button", { name: /Café E2E/ })).toBeVisible();
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
  const publicCanvas = publicPage.locator("canvas").first();
  const publicCanvasBox = await publicCanvas.boundingBox();
  expect(publicCanvasBox).not.toBeNull();
  if (publicCanvasBox) {
    const scale = (publicCanvasBox.width - 20) / 1240;
    await publicCanvas.click({ position: { x: 10 + 370 * scale, y: 10 + 585 * scale } });
  }
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
  const fillHex = inspector.getByRole("textbox", { name: "Código HEX de color de relleno" });
  await fillHex.fill("#0459c8");
  await expect(fillHex).toHaveValue("#0459c8");
  await expect(page.getByText("Cambios pendientes")).toBeVisible();
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

test("tenant admin can copy and paste selected objects with keyboard shortcuts", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Rectángulo", exact: true }).first().click();

  const inspector = page.getByRole("complementary", { name: "Propiedades del objeto" });
  const layerName = `Copia rápida ${Date.now()}`;
  await inspector.getByRole("textbox", { name: "Nombre de la capa" }).fill(layerName);
  await inspector.getByRole("textbox", { name: "Código HEX de color de relleno" }).fill("#0459c8");
  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  const originalX = Number(await inspector.getByRole("spinbutton", { name: "X", exact: true }).inputValue());

  const layerRows = page.locator("#editor-layers").getByText(layerName, { exact: true });
  await expect(layerRows).toHaveCount(1);
  await layerRows.first().click();
  await page.keyboard.press("Control+C");
  await expect(page.getByText("Objeto copiado", { exact: true })).toBeVisible();
  await page.keyboard.press("Control+V");
  await expect(page.getByText("Objeto pegado", { exact: true })).toBeVisible();
  await expect(layerRows).toHaveCount(2);
  await expect(inspector.getByRole("textbox", { name: "Código HEX de color de relleno" })).toHaveValue("#0459c8");

  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  await expect(inspector.getByRole("spinbutton", { name: "X", exact: true })).toHaveValue(String(originalX + 24));
  await layerRows.first().click();
  await page.keyboard.press("Control+V");
  await expect(layerRows).toHaveCount(3);
  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  await expect(inspector.getByRole("spinbutton", { name: "X", exact: true })).toHaveValue(String(originalX + 48));

  await page.keyboard.press("Control+Z");
  await expect(layerRows).toHaveCount(2);
  await layerRows.first().click();
  await page.keyboard.press("Control+Z");
  await expect(layerRows).toHaveCount(1);

  await layerRows.first().click();
  const nameInput = inspector.getByRole("textbox", { name: "Nombre de la capa" });
  const layerCount = await page.locator("#editor-layers [aria-pressed]").count();
  await nameInput.fill("Campo");
  await nameInput.press("Control+A");
  await nameInput.press("Control+C");
  await nameInput.press("End");
  await nameInput.press("Control+V");
  await expect(nameInput).toHaveValue("CampoCampo");
  await expect(page.locator("#editor-layers [aria-pressed]")).toHaveCount(layerCount);
});

test("tenant admin can organize layers in nested groups with reversible visibility and locks", async ({ page, context }) => {
  await loginAs(page, E2E.tenantAdmin);
  const suffix = Date.now();
  const textLayer = `Texto grupo ${suffix}`;
  const shapeLayer = `Forma grupo ${suffix}`;
  const groupName = `Promoción ${suffix}`;
  const childGroupName = `Detalles ${suffix}`;
  const publicText = `Contenido agrupado ${suffix}`;
  const inspector = page.getByRole("complementary", { name: "Propiedades del objeto" });
  const layers = page.locator("#editor-layers");

  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await inspector.getByRole("textbox", { name: "Nombre de la capa" }).fill(textLayer);
  await inspector.getByRole("textbox", { name: "Contenido" }).fill(publicText);
  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  const textX = Number(await inspector.getByRole("spinbutton", { name: "X", exact: true }).inputValue());
  const textY = Number(await inspector.getByRole("spinbutton", { name: "Y", exact: true }).inputValue());
  await page.getByRole("button", { name: "Rectángulo", exact: true }).first().click();
  await inspector.getByRole("textbox", { name: "Nombre de la capa" }).fill(shapeLayer);
  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  const shapeX = Number(await inspector.getByRole("spinbutton", { name: "X", exact: true }).inputValue());
  const shapeY = Number(await inspector.getByRole("spinbutton", { name: "Y", exact: true }).inputValue());

  await layers.getByText(textLayer, { exact: true }).click();
  await layers.getByText(shapeLayer, { exact: true }).click({ modifiers: ["Shift"] });
  await page.keyboard.press("Control+G");
  const groupNameInput = layers.getByRole("textbox", { name: /^Nombre del grupo Grupo/ });
  await groupNameInput.fill(groupName);
  await groupNameInput.press("Enter");
  await expect(inspector.getByRole("heading", { name: "Grupo", exact: true })).toBeVisible();
  await expect(inspector.getByText("2 capas en este árbol.")).toBeVisible();

  await layers.getByRole("button", { name: "Nuevo grupo" }).click();
  const childNameInput = layers.getByRole("textbox", { name: /^Nombre del grupo Grupo/ });
  await childNameInput.fill(childGroupName);
  await childNameInput.press("Enter");
  const childRow = layers.getByRole("treeitem").filter({ hasText: childGroupName });
  await expect(childRow).toHaveAttribute("aria-level", "2");

  const draggedGroupName = `Extras ${suffix}`;
  await page.locator(".konvajs-content").first().click({ position: { x: 8, y: 8 } });
  await layers.getByRole("button", { name: "Nuevo grupo" }).click();
  const draggedNameInput = layers.getByRole("textbox", { name: /^Nombre del grupo Grupo/ });
  await draggedNameInput.fill(draggedGroupName);
  await draggedNameInput.press("Enter");
  const dragHandle = layers.getByRole("button", { name: `Reordenar grupo ${draggedGroupName}` });
  const outerTarget = layers.getByRole("button", { name: groupName, exact: true });
  await dragHandle.scrollIntoViewIfNeeded();
  const dragBox = await dragHandle.boundingBox();
  const targetBox = await outerTarget.boundingBox();
  if (!dragBox || !targetBox) throw new Error("Layer drag controls are not visible");
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(layers.getByRole("treeitem").filter({ hasText: draggedGroupName })).toHaveAttribute("aria-level", "2");

  await layers.getByText(groupName, { exact: true }).click();
  await layers.getByRole("button", { name: `Bloquear grupo ${groupName}` }).click();
  await expect(inspector.getByRole("button", { name: "Desbloquear grupo" })).toBeVisible();
  await layers.getByRole("button", { name: `Desbloquear grupo ${groupName}` }).click();
  await layers.getByRole("button", { name: `Ocultar grupo ${groupName}` }).click();
  await expect(layers.getByText(textLayer, { exact: true })).toBeVisible();
  await expect(layers.getByText(shapeLayer, { exact: true })).toBeVisible();
  await expect(page.getByText("Cambios pendientes")).toBeVisible();
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Publicado", { exact: true })).toBeVisible();
  const publicPage = await context.newPage();
  await publicPage.goto(`/m/${E2E.tenantAdmin.slug}`);
  await expect(publicPage.getByText(publicText, { exact: true })).toHaveCount(0);
  await publicPage.close();

  await layers.getByRole("button", { name: `Mostrar grupo ${groupName}` }).click();
  await layers.getByText(groupName, { exact: true }).click();
  await page.keyboard.press("Control+Shift+G");
  await expect(layers.getByText(groupName, { exact: true })).toHaveCount(0);
  await expect(layers.getByText(textLayer, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(layers.getByText(groupName, { exact: true })).toBeVisible();

  const stage = page.locator(".konvajs-content").first();
  await stage.click({ position: { x: 8, y: 8 } });
  const shapePoint = await editorCanvasPoint(page, shapeX + 130, shapeY + 80);
  await page.mouse.click(shapePoint.x, shapePoint.y);
  await expect(inspector.getByRole("heading", { name: "Grupo", exact: true })).toBeVisible();
  await page.mouse.dblclick(shapePoint.x, shapePoint.y);
  await expect(inspector.getByRole("textbox", { name: "Nombre de la capa" })).toHaveValue(shapeLayer);

  await layers.getByRole("button", { name: `Bloquear capa ${shapeLayer}` }).click();
  await stage.click({ position: { x: 8, y: 8 } });
  const textPoint = await editorCanvasPoint(page, textX + 20, textY + 25);
  await page.mouse.move(textPoint.x, textPoint.y);
  await page.mouse.down();
  await page.mouse.move(textPoint.x + 40, textPoint.y + 30, { steps: 5 });
  await page.mouse.up();
  await expect(inspector.getByRole("heading", { name: "Grupo", exact: true })).toBeVisible();

  await layers.getByRole("button", { name: `Desbloquear capa ${shapeLayer}` }).click();
  await layers.getByText(shapeLayer, { exact: true }).click();
  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  const movedShapeX = Number(await inspector.getByRole("spinbutton", { name: "X", exact: true }).inputValue());
  const movedShapeY = Number(await inspector.getByRole("spinbutton", { name: "Y", exact: true }).inputValue());
  await layers.getByText(textLayer, { exact: true }).click();
  await inspector.getByRole("button", { name: /^Posición y tamaño/ }).click();
  const movedTextX = Number(await inspector.getByRole("spinbutton", { name: "X", exact: true }).inputValue());
  const movedTextY = Number(await inspector.getByRole("spinbutton", { name: "Y", exact: true }).inputValue());
  expect(movedTextX - textX).toBeGreaterThan(0);
  expect(movedTextY - textY).toBeGreaterThan(0);
  expect(Math.abs((movedTextX - textX) - (movedShapeX - shapeX))).toBeLessThan(0.01);
  expect(Math.abs((movedTextY - textY) - (movedShapeY - shapeY))).toBeLessThan(0.01);
});

async function editorCanvasPoint(page: import("@playwright/test").Page, worldX: number, worldY: number): Promise<{ x: number; y: number }> {
  const stage = page.locator(".konvajs-content").first();
  const box = await stage.boundingBox();
  if (!box) throw new Error("Editor canvas is not visible");
  const bounds = { x: 0, y: 0, width: 1240, height: 900 };
  const scene = { width: Math.max(1, box.width - 80), height: Math.max(1, box.height - 80) };
  const scale = Math.max(0.1, Math.min(8, Math.min(scene.width / bounds.width, scene.height / bounds.height)));
  const cameraWidth = scene.width / scale;
  const cameraHeight = scene.height / scale;
  const cameraX = cameraWidth >= bounds.width ? bounds.x - (cameraWidth - bounds.width) / 2 : bounds.x;
  const cameraY = cameraHeight >= bounds.height ? bounds.y - (cameraHeight - bounds.height) / 2 : bounds.y;
  return { x: box.x + 40 + (worldX - cameraX) * scale, y: box.y + 40 + (worldY - cameraY) * scale };
}

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
