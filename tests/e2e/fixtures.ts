import type { Page } from "@playwright/test";

export const E2E = {
  zoomMenu: { slug: "e2e-zoom", width: 10_000, height: 40_000 },
  superAdmin: {
    email: "e2e-super@example.test",
    password: "E2e-super-password-123",
  },
  tenantAdmin: {
    email: "e2e-tenant@example.test",
    password: "E2e-tenant-password-123",
    slug: "e2e-cafe",
  },
  forcedPasswordAdmin: {
    email: "e2e-force@example.test",
    password: "E2e-force-password-123",
    replacementPassword: "E2e-replaced-password-456",
    slug: "e2e-force",
  },
  otherTenant: {
    email: "e2e-other@example.test",
    password: "E2e-other-password-123",
    slug: "e2e-other",
  },
} as const;

export type E2ECredentials = { email: string; password: string };

export async function loginAs(page: Page, account: E2ECredentials): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña").fill(account.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}
