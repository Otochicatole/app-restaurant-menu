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

test("tenant admin can choose rectangle border sides", async ({ page }) => {
  await loginAs(page, E2E.tenantAdmin);
  await page.getByRole("button", { name: "Rectángulo", exact: true }).first().click();

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
});
