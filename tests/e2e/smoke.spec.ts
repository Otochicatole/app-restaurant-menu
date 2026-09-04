import { test, expect } from "@playwright/test";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";
import { E2E } from "./fixtures";

test("platform landing and the published Canvas menu are reachable", async ({ page }) => {
  const prisma = createSqlitePrismaClient(requireDisposableTestDatabase().connectionString);
  try {
    // The published JSON is authoritative. A missing derived reference must not
    // make media configured in that document disappear from the public menu.
    await prisma.menuAssetReference.deleteMany({ where: { assetId: "e2e-asset-cafe", scope: "PUBLISHED" } });
  } finally {
    await prisma.$disconnect();
  }

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Ingresar al panel" })).toBeVisible();
  await expect(page.locator('link[rel="icon"][href="/icon.svg"]')).toHaveCount(1);

  await page.goto(`/m/${E2E.tenantAdmin.slug}`);
  await expect(page.getByRole("button", { name: "Ver contenido en texto" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restablecer" })).toHaveCount(0);
  await expect(page.getByText("Café E2E").first()).toBeAttached();
  await page.locator("canvas").first().click({ position: { x: 200, y: 600 } });
  await expectLoadedCenteredImage(page, "Café E2E");
  await page.getByRole("button", { name: "Cerrar multimedia" }).click();
});

test("public menus expose only their own publication state", async ({ page }) => {
  await page.goto(`/m/${E2E.otherTenant.slug}`);
  await expect(page.getByRole("heading", { name: "Carta en preparación" })).toBeVisible();
  await expect(page.getByText("Café E2E")).toHaveCount(0);
});

test("desktop canvas keeps moving after releasing a mouse drag", async ({ page }) => {
  await page.setViewportSize({ width: 1_000, height: 700 });
  await page.goto(`/m/${E2E.zoomMenu.slug}`);
  await expect(page.locator(".konvajs-content")).toBeVisible();

  await page.mouse.move(500, 350);
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(20);
  }

  await page.mouse.move(560, 350);
  await page.mouse.down();
  for (let x = 550; x >= 500; x -= 10) {
    await page.mouse.move(x, 350);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();

  const positionAtRelease = await canvasRowHash(page);
  await page.waitForTimeout(120);
  const positionWhileCoasting = await canvasRowHash(page);
  expect(positionWhileCoasting).not.toBe(positionAtRelease);
});

test("anonymous users are redirected away from the CMS", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
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

async function canvasRowHash(page: import("@playwright/test").Page): Promise<number> {
  return page.locator(".konvajs-content canvas").first().evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    const pixels = context.getImageData(0, Math.floor(canvas.height / 2), canvas.width, 1).data;
    let hash = 2166136261;
    for (let index = 0; index < pixels.length; index += 4) {
      hash ^= pixels[index] ?? 0;
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 1] ?? 0;
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[index + 2] ?? 0;
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  });
}
