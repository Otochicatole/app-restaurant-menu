import { expect, test, type Page, type Route } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";
import { createTemplateDocument } from "../../src/modules/menu-editor/domain/template";
import { E2E, editorApi, loginAs, restaurantPath } from "./fixtures";

test("login selects a restaurant and keeps two browser tabs isolated", async ({ page, context }) => {
 const prisma = createSqlitePrismaClient(requireDisposableTestDatabase().connectionString);
 try { await prisma.menuProject.updateMany({ where: { restaurantId: { in: [E2E.tenantAdmin.restaurantId, E2E.branch.restaurantId] } }, data: { draftRevision: 500 } }); }
 finally { await prisma.$disconnect(); }
 await loginAs(page, E2E.tenantAdmin, { openRestaurant: false });
 await expect(page).toHaveURL(/\/admin\/restaurantes$/);
 await page.screenshot({ path: "test-results/ui-qa/selector-desktop.png", fullPage: true });
 const cafe = page.locator("article").filter({ has: page.getByRole("heading", { name: "E2E Café", exact: true }) });
 const checkCafeNavigation = await watchSelectorNavigation(page);
 await cafe.getByRole("button", { name: "Abrir", exact: true }).click();
 await expect(page).toHaveURL(restaurantPath(E2E.tenantAdmin.restaurantId));
 await checkCafeNavigation();
 const editorCanvas = page.locator(".konvajs-content canvas").first();
 await expect(editorCanvas).toBeVisible();
 await expect.poll(() => editorCanvas.evaluate((element: HTMLCanvasElement) => {
  const pixels = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
  const colors = new Set<string>();
  for (let i = 0; i < pixels.length; i += 64) if (pixels[i + 3]) colors.add(pixels[i] + "," + pixels[i + 1] + "," + pixels[i + 2]);
  return colors.size;
 })).toBeGreaterThan(1);
 await page.screenshot({ path: "test-results/ui-qa/editor-organization-restaurant.png", fullPage: true });
 const otherPage = await context.newPage();
 await otherPage.goto("/admin/restaurantes");
 const checkBranchNavigation = await watchSelectorNavigation(otherPage);
 await otherPage.locator("article").filter({ has: otherPage.getByRole("heading", { name: E2E.branch.name, exact: true }) }).getByRole("button", { name: "Abrir", exact: true }).click();
 await expect(otherPage).toHaveURL(restaurantPath(E2E.branch.restaurantId));
 await checkBranchNavigation();
 const before = (await browserApi(otherPage, editorApi(E2E.branch.restaurantId) + "/project")).body;
 const text = "Solo restaurante Centro " + Date.now();
 await page.getByRole("button", { name: /^Texto(?: Agregar)?$/ }).click();
 await page.getByRole("complementary", { name: "Propiedades del objeto" }).getByRole("textbox", { name: "Contenido", exact: true }).fill(text);
 await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
 await page.getByRole("button", { name: "Publicar", exact: true }).click();
 await expect(page.getByRole("button", { name: "Publicado", exact: true })).toBeVisible();
 const after = (await browserApi(otherPage, editorApi(E2E.branch.restaurantId) + "/project")).body;
 expect(after.data.document).toEqual(before.data.document);
 expect(after.data.draftRevision).toBe(before.data.draftRevision);
 const saved = (await browserApi(page, editorApi(E2E.tenantAdmin.restaurantId) + "/project")).body;
 expect(JSON.stringify(saved.data.document)).toContain(text);
 await otherPage.reload();
 await expect(otherPage.getByText(text, { exact: true })).toHaveCount(0);
 const assets = (await browserApi(page, editorApi(E2E.tenantAdmin.restaurantId) + "/assets")).body;
 expect(assets.data.some((asset: { id: string }) => asset.id === "e2e-asset-cafe")).toBe(true);
 expect(assets.data.some((asset: { id: string }) => asset.id === "e2e-asset-branch")).toBe(false);
 expect((await browserApi(page, editorApi(E2E.branch.restaurantId) + "/assets/e2e-asset-cafe/file")).status).toBe(404);
 expect((await browserApi(page, editorApi(E2E.otherTenant.restaurantId) + "/project")).status).toBe(404);
 const created = (await browserApi(page, editorApi(E2E.tenantAdmin.restaurantId) + "/templates", "POST", { name: "Privada Centro " + Date.now(), description: "", submitPublic: false, document: saved.data.document })).body;
 expect(created.success).toBe(true);
 expect((await browserApi(page, editorApi(E2E.branch.restaurantId) + "/templates/" + created.data.id)).status).toBe(404);
 expect((await browserApi(page, editorApi(E2E.branch.restaurantId) + "/templates/" + created.data.id + "/apply", "POST", { baseRevision: after.data.draftRevision })).status).toBe(404);
 expect((await browserApi(page, "/api/editor/project", "PUT", { baseRevision: 0, document: before.data.document })).status).toBe(410);
 await otherPage.close();
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto("/admin/restaurantes");
 await expect(page.getByRole("heading", { name: "Tus restaurantes" })).toBeVisible();
 await page.screenshot({ path: "test-results/ui-qa/selector-mobile.png", fullPage: true });
});

test("each restaurant displays its own landing and reservations", async ({ page }) => {
 await loginAs(page, E2E.tenantAdmin);
 await page.goto(restaurantPath(E2E.tenantAdmin.restaurantId) + "/reservas");
 await expect(page.getByText("Cliente de E2E Café", { exact: true })).toBeVisible();
 await expect(page.getByText("Cliente de E2E Sucursal", { exact: true })).toHaveCount(0);
 await page.goto(restaurantPath(E2E.branch.restaurantId) + "/reservas");
 await expect(page.getByText("Cliente de E2E Sucursal", { exact: true })).toBeVisible();
 await expect(page.getByText("Cliente de E2E Café", { exact: true })).toHaveCount(0);
 await page.goto("/l/" + E2E.tenantAdmin.slug);
 await expect(page.frameLocator("iframe").getByRole("heading", { name: "Landing de E2E Café" })).toBeVisible();
 await page.goto("/l/" + E2E.branch.slug);
 await expect(page.frameLocator("iframe").getByRole("heading", { name: "Landing de E2E Sucursal" })).toBeVisible();
 const first = (await browserApi(page, "/api/public/landing/" + E2E.tenantAdmin.slug + "/reservations/availability?date=2099-12-21")).body;
 const second = (await browserApi(page, "/api/public/landing/" + E2E.branch.slug + "/reservations/availability?date=2099-12-21")).body;
 expect(first.success).toBe(true); expect(second.success).toBe(true);
 expect(JSON.stringify(first.data)).toContain("20:00"); expect(JSON.stringify(first.data)).not.toContain("21:00");
 expect(JSON.stringify(second.data)).toContain("21:00"); expect(JSON.stringify(second.data)).not.toContain("20:00");
});

test("an empty organization can create and delete its last restaurant with its password", async ({ page }) => {
 const suffix = Date.now();
 const organizationId = "e2e-selector-" + suffix;
 const account = { email: "e2e-selector-" + suffix + "@example.test", password: "E2e-selector-password-123" };
 const prisma = createSqlitePrismaClient(requireDisposableTestDatabase().connectionString);
 try { await prisma.organization.create({ data: { id: organizationId, name: "E2E Cuenta vacía", slug: organizationId, maxRestaurants: 2, admin: { create: { email: account.email, passwordHash: await bcrypt.hash(account.password, 4), role: "TENANT_ADMIN" } } } }); }
 finally { await prisma.$disconnect(); }
 await loginAs(page, account);
 await expect(page.getByRole("heading", { name: "Todavía no hay restaurantes" })).toBeVisible();
 await page.getByRole("button", { name: "Agregar restaurante", exact: true }).click();
 await page.getByLabel("Nombre", { exact: true }).fill("E2E Restaurante nuevo");
 await page.getByLabel("Slug público", { exact: true }).fill("e2e-selector-new-" + suffix);
 const checkCreatedRestaurantNavigation = await watchSelectorNavigation(page);
 await page.getByRole("button", { name: "Crear y abrir", exact: true }).click();
 await expect(page).toHaveURL(/\/admin\/restaurantes\/[^/]+$/);
 await checkCreatedRestaurantNavigation();
 const restaurantId = new URL(page.url()).pathname.split("/").at(-1)!;
 const project = (await browserApi(page, editorApi(restaurantId) + "/project")).body;
 expect(project.data.document.nodes).toEqual([]);
 await page.goto("/admin/restaurantes");
 await page.getByRole("button", { name: "Eliminar E2E Restaurante nuevo", exact: true }).click();
 const dialog = page.getByRole("dialog", { name: "Eliminar restaurante", exact: true });
 await dialog.getByLabel("Contraseña actual").fill("Wrong-password-123");
 await dialog.getByRole("button", { name: "Eliminar definitivamente", exact: true }).click();
 await expect(dialog.getByRole("alert")).toBeVisible();
 await dialog.getByLabel("Contraseña actual").fill(account.password);
 await dialog.getByRole("button", { name: "Eliminar definitivamente", exact: true }).click();
 await expect(dialog).toBeHidden();
 await expect(page.getByRole("heading", { name: "Todavía no hay restaurantes" })).toBeVisible();
 await page.goto("/admin");
 await expect(page).toHaveURL(/\/admin\/restaurantes$/);
 await expect(page.getByRole("heading", { name: "Todavía no hay restaurantes" })).toBeVisible();
 const verify = createSqlitePrismaClient(requireDisposableTestDatabase().connectionString);
 try { expect(await verify.organization.count({ where: { id: organizationId } })).toBe(1); expect(await verify.restaurant.count({ where: { organizationId } })).toBe(0); }
 finally { await verify.$disconnect(); }
});


test("restaurant settings update both public URLs without changing its organization or sibling", async ({ page }) => {
 const suffix = Date.now();
 const organizationId = "e2e-profile-" + suffix;
 const restaurantId = organizationId + "-first";
 const siblingId = organizationId + "-second";
 const oldSlug = "e2e-profile-old-" + suffix;
 const newSlug = "e2e-profile-new-" + suffix;
 const account = { email: "e2e-profile-" + suffix + "@example.test", password: "E2e-profile-password-123", restaurantId };
 const prisma = createSqlitePrismaClient(requireDisposableTestDatabase().connectionString);
 try {
  await prisma.organization.create({ data: { id: organizationId, name: "E2E Organización perfil", slug: organizationId, maxRestaurants: 2,
   admin: { create: { email: account.email, passwordHash: await bcrypt.hash(account.password, 4), role: "TENANT_ADMIN" } },
   restaurants: { create: [
    { id: restaurantId, name: "E2E Perfil original", slug: oldSlug, landingSlug: oldSlug, landingEnabled: true,
     menuProject: { create: { name: "E2E Perfil original", slug: oldSlug, draftJson: JSON.stringify(createTemplateDocument("Perfil")), isPrimary: true } },
     landingPage: { create: { htmlContent: '<h1>Perfil publicado</h1><a href="/m/' + oldSlug + '">Ver carta de perfil</a><section data-restaurant-slug="' + oldSlug + '"></section>', published: true, publishedAt: new Date() } } },
    { id: siblingId, name: "E2E Perfil hermano", slug: organizationId + "-sibling", landingSlug: organizationId + "-sibling", menuProject: { create: { name: "E2E Perfil hermano", slug: organizationId + "-sibling", draftJson: JSON.stringify(createTemplateDocument("Hermano")), isPrimary: true } } },
   ] },
  } });
 } finally { await prisma.$disconnect(); }
 await loginAs(page, account);
 await page.goto("/l/" + oldSlug);
 await expect(page.frameLocator("iframe").getByRole("heading", { name: "Perfil publicado" })).toBeVisible();
 await page.goto(restaurantPath(restaurantId) + "/settings");
 await page.getByLabel("Nombre del restaurante").fill("E2E Perfil actualizado");
 await page.getByLabel("Enlace de la carta").fill(newSlug);
 await page.getByLabel("Enlace de la landing").fill(newSlug + "-landing");
 await page.getByRole("button", { name: "Guardar", exact: true }).click();
 const dialog = page.getByRole("dialog", { name: "Confirmá los cambios", exact: true });
 await dialog.getByLabel("Contraseña actual").fill(account.password);
 await dialog.getByRole("button", { name: "Confirmar y guardar", exact: true }).click();
 await expect(page.getByRole("status")).toContainText("Cambios guardados");
 const organization = (await browserApi(page, "/api/account/profile")).body;
 expect(organization.data.email).toBe(account.email);
 expect(organization.data.name).toBe("E2E Organización perfil");
 const sibling = (await browserApi(page, "/api/restaurants/" + siblingId + "/profile")).body;
 expect(sibling.data.name).toBe("E2E Perfil hermano");
 expect((await page.request.get("/m/" + oldSlug)).status()).toBe(404);
 expect((await page.request.get("/l/" + oldSlug)).status()).toBe(404);
 await page.goto("/l/" + newSlug + "-landing");
 await expect(page.frameLocator("iframe").getByRole("heading", { name: "Perfil publicado" })).toBeVisible();
 await expect(page.frameLocator("iframe").getByRole("link", { name: "Ver carta de perfil" })).toHaveAttribute("href", "/m/" + newSlug);
 await expect(page.frameLocator("iframe").locator("section[data-restaurant-slug]")).toHaveAttribute("data-restaurant-slug", newSlug + "-landing");
 await page.goto("/admin/account");
 const newEmail = "e2e-profile-updated-" + suffix + "@example.test";
 await page.getByLabel("Nombre de la organización").fill("E2E Organización actualizada");
 await page.getByLabel("Correo de acceso").fill(newEmail);
 await page.getByLabel("Contraseña actual").fill(account.password);
 await page.getByRole("button", { name: "Guardar cuenta", exact: true }).click();
 await expect(page.getByRole("status")).toContainText("Cuenta actualizada");
 const updatedAccount = (await browserApi(page, "/api/account/profile")).body;
 expect(updatedAccount.data.email).toBe(newEmail);
 expect(updatedAccount.data.name).toBe("E2E Organización actualizada");
 expect((await browserApi(page, "/api/restaurants/" + restaurantId + "/profile")).body.data.name).toBe("E2E Perfil actualizado");
 expect((await browserApi(page, "/api/restaurants/" + siblingId + "/profile")).body.data.name).toBe("E2E Perfil hermano");
 await page.context().clearCookies();
 await loginAs(page, { ...account, email: newEmail });
 await expect(page).toHaveURL(restaurantPath(restaurantId));
});

async function watchSelectorNavigation(page: Page) {
 const storageKey = "e2e-selector-network-alert:" + Date.now() + ":" + Math.random();
 const stopEvent = storageKey + ":stop";
 // A Server Action can include the destination Flight tree in its response.
 // Delay its GET/RSC request, or newly requested destination JavaScript chunks.
 const destination = /\/(?:admin\/restaurantes\/|_next\/static\/chunks\/)/;
 const delayDestination = async (route: Route) => {
  if (route.request().method() === "GET") await new Promise((resolve) => setTimeout(resolve, 300));
  await route.continue();
 };
 await page.route(destination, delayDestination);
 await page.evaluate(({ storageKey, stopEvent }) => {
  sessionStorage.removeItem(storageKey);
  const remember = (text: string | null) => {
   if (text?.includes("No pudimos conectar con el servidor")) {
    sessionStorage.setItem(storageKey, text);
    observer.disconnect();
   }
  };
  const inspectNode = (node: Node) => {
   if (node instanceof Element) {
    if (node.matches('[role="alert"]')) remember(node.textContent);
    node.querySelectorAll('[role="alert"]').forEach((alert) => remember(alert.textContent));
   }
  };
  const observer = new MutationObserver((records) => {
   for (const record of records) {
    const target = record.target instanceof Element ? record.target : record.target.parentElement;
    if (target?.closest('[role="alert"]')) {
     remember(target.textContent);
     remember(record.oldValue);
     // Detached nodes and old text also catch alerts added and removed in one batch.
     [...record.addedNodes, ...record.removedNodes].forEach((node) => remember(node.textContent));
    }
    [...record.addedNodes, ...record.removedNodes].forEach(inspectNode);
    if (record.type === "attributes" && record.oldValue === "alert") remember(record.target.textContent);
   }
  });
  observer.observe(document.documentElement, {
   subtree: true, childList: true, characterData: true, characterDataOldValue: true,
   attributes: true, attributeFilter: ["role"], attributeOldValue: true,
  });
  window.addEventListener(stopEvent, () => observer.disconnect(), { once: true });
  document.querySelectorAll('[role="alert"]').forEach((alert) => remember(alert.textContent));
 }, { storageKey, stopEvent });
 return async () => {
  // Finish delayed callbacks before disabling interception, which resumes any
  // outstanding requests itself and would make their later continue() fail.
  await page.unrouteAll({ behavior: "wait" });
  const flashedError = await page.evaluate(({ storageKey, stopEvent }) => {
   window.dispatchEvent(new Event(stopEvent));
   return sessionStorage.getItem(storageKey);
  }, { storageKey, stopEvent });
  expect(flashedError, "El selector no debe mostrar un error de red, ni siquiera transitorio, al navegar.").toBeNull();
 };
}

async function browserApi(page: Page, url: string, method = "GET", data?: unknown) {
 return page.evaluate(async ({ url, method, data }) => {
  const response = await fetch(url, { method, ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) });
  return { status: response.status, body: await response.json().catch(() => null) };
 }, { url, method, data });
}
