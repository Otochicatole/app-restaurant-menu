import { expect, test, type Page } from "@playwright/test";
import { E2E, loginAs } from "./fixtures";

async function canvasPixel(page: Page, horizontalPosition: number) {
  return page.locator(".konvajs-content canvas").evaluate((canvas: HTMLCanvasElement, position) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    const x = (10 + (rect.width - 20) * position) * ratio;
    const y = Math.min(200, rect.height / 2) * ratio;
    return Array.from(canvas.getContext("2d")!.getImageData(Math.floor(x), Math.floor(y), 1, 1).data).slice(0, 3);
  }, horizontalPosition);
}

async function expectFullWidth(page: Page) {
  await expect(page.getByRole("button", { name: "Alejar", exact: true })).toBeDisabled();
  await expect.poll(() => canvasPixel(page, 0.05)).toEqual([255, 0, 0]);
  await expect.poll(() => canvasPixel(page, 0.95)).toEqual([0, 0, 255]);
}

test("public menu fits large canvases independently of the saved editor zoom and screen size", async ({ page }) => {
  for (const width of [320, 440]) {
    await page.setViewportSize({ width, height: 956 });
    await page.goto(`/m/${E2E.zoomMenu.slug}`);
    await expectFullWidth(page);

    await page.mouse.move(width / 2, 600);
    await page.mouse.down();
    await page.mouse.move(width / 2, 250, { steps: 5 });
    await page.mouse.up();
    await page.setViewportSize({ width: 800, height: 400 });
    await expectFullWidth(page);
  }
});

test("pinch zoom retains its focus and horizontal panning, and reset returns to the full width", async ({ page, context }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await page.goto(`/m/${E2E.zoomMenu.slug}`);
  await expectFullWidth(page);
  const session = await context.newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 0, x: 180, y: 300 }, { id: 1, x: 260, y: 300 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 0, x: 140, y: 300 }, { id: 1, x: 300, y: 300 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByRole("button", { name: "Alejar", exact: true })).toBeEnabled();
    await expect.poll(() => canvasPixel(page, 0.58)).toEqual([0, 255, 0]);

    // Browser chrome changing the available height must not change the user's zoom.
    await page.setViewportSize({ width: 440, height: 700 });
    await expect.poll(() => canvasPixel(page, 0.58)).toEqual([0, 255, 0]);

    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 0, x: 330, y: 400 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 0, x: 80, y: 400 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => canvasPixel(page, 0.95)).toEqual([0, 0, 255]);
    await expect.poll(() => canvasPixel(page, 0.5)).toEqual([255, 255, 255]);

    await page.getByRole("button", { name: "Restablecer" }).click();
    await expectFullWidth(page);
  } finally {
    await session.detach();
  }
});

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
