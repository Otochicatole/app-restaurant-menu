/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname, useRouter: () => ({push: route.push}) }));
vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }) }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: () => createElement("button", null, "Cerrar sesión") }));
import { AdminShell } from "./AdminShell";

const props = { restaurantId: "restaurant", organizationName: "Organización", brandTitle: "Café", brandSubtitle: "", showMenuPickerLink: true };
const child = createElement("div", { "data-testid": "editor" }, "Plano del salón");

describe("administrative full-screen floor editor", () => {
  afterEach(cleanup);

  it("keeps the original sidebar visible beside the room editor without the CMS header or a second mobile menu", () => {
    route.pathname = "/admin/restaurantes/restaurant/salones";
    const view = render(createElement(AdminShell, props as Parameters<typeof AdminShell>[0], child));
    expect(screen.getByTestId("editor")).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Navegación principal" })).toHaveLength(1);
    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(navigation.closest("aside")?.classList.contains("-translate-x-full")).toBe(false);
    expect(navigation.closest("aside")?.classList.contains("translate-x-0")).toBe(true);
    expect(screen.queryByRole("button", { name: "Abrir menú" })).toBeNull();
    expect(view.container.querySelector("header")).toBeNull();
  });

  it("retains the existing administrative shell on other restaurant routes", () => {
    route.pathname = "/admin/restaurantes/restaurant/settings";
    const view = render(createElement(AdminShell, props as Parameters<typeof AdminShell>[0], child));
    expect(screen.getByTestId("editor")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeTruthy();
    expect(view.container.querySelector("header")).not.toBeNull();
  });
});
