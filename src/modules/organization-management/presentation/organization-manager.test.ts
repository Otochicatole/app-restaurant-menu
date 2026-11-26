// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OrganizationListItem } from "../contracts";
import { OrganizationManager } from "./OrganizationManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

afterEach(() => {
  cleanup();
  refreshMock.mockReset();
});

const organizations: OrganizationListItem[] = [
  {
    id: "org-1",
    name: "Grupo Palermo",
    slug: "grupo-palermo",
    status: "ACTIVE",
    maxRestaurants: 3,
    email: "admin@palermo.test",
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    restaurants: [
      {
        id: "rest-1",
        organizationId: "org-1",
        name: "Café Palermo",
        slug: "cafe-palermo",
        landingSlug: "cafe-palermo",
        publicDescription: "",
        status: "ACTIVE",
        menuEnabled: true,
        landingEnabled: false,
        reservationsEnabled: false,
        floorManagementEnabled: false,
        inventoryEnabled: false,
        assetQuotaBytes: 10 * 1024 * 1024,
      },
    ],
  },
  {
    id: "org-2",
    name: "Bistró Sur",
    slug: "bistro-sur",
    status: "SUSPENDED",
    maxRestaurants: 1,
    email: "hola@bistrosur.test",
    lastLoginAt: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    restaurants: [
      {
        id: "rest-2",
        organizationId: "org-2",
        name: "Bistró Sur Centro",
        slug: "bistro-sur",
        landingSlug: "bistro-sur",
        publicDescription: "",
        status: "ACTIVE",
        menuEnabled: true,
        landingEnabled: true,
        reservationsEnabled: true,
        floorManagementEnabled: true,
        inventoryEnabled: true,
        assetQuotaBytes: 20 * 1024 * 1024,
      },
    ],
  },
];

function createMockActions() {
  return {
    create: vi.fn(async (form: FormData) => {
      void form;
      return { success: true as const, data: { temporaryPassword: "tmp" } };
    }),
    update: vi.fn(async (form: FormData) => {
      void form;
      return { success: true as const, data: {} };
    }),
    status: vi.fn(async (form: FormData) => {
      void form;
      return { success: true as const, data: {} };
    }),
    resetPassword: vi.fn(async (form: FormData) => {
      void form;
      return { success: true as const, data: { temporaryPassword: "tmp" } };
    }),
    remove: vi.fn(async (form: FormData) => {
      void form;
      return { success: true as const, data: {} };
    }),
    restaurantOptions: vi.fn(async (form: FormData) => {
      void form;
      return { success: true as const, data: {} };
    }),
  };
}

describe("OrganizationManager", () => {
  it("filters organizations using normalized search and feature pills", () => {
    render(createElement(OrganizationManager, { organizations, actions: createMockActions() }));

    expect(screen.getByText("Grupo Palermo")).toBeTruthy();
    expect(screen.getByText("Bistró Sur")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Buscar clientes"), {
      target: { value: "cafe palermo" },
    });
    expect(screen.getByText("Grupo Palermo")).toBeTruthy();
    expect(screen.queryByText("Bistró Sur")).toBeNull();

    fireEvent.change(screen.getByLabelText("Buscar clientes"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Inventario" }));
    expect(screen.queryByText("Grupo Palermo")).toBeNull();
    expect(screen.getByText("Bistró Sur")).toBeTruthy();
  });

  it("applies plan presets and saves all 5 restaurant feature flags", async () => {
    const actions = createMockActions();
    render(createElement(OrganizationManager, { organizations, actions }));

    fireEvent.click(screen.getAllByRole("button", { name: "Administrar" })[0]);
    expect(screen.getByRole("dialog", { name: "Administrar Grupo Palermo" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Full Suite" }));

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(5);
    for (const sw of switches) {
      expect(sw.getAttribute("aria-checked")).toBe("true");
    }

    fireEvent.click(screen.getByRole("switch", { name: "Landing Page" }));
    expect(screen.getByRole("switch", { name: "Landing Page" }).getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Guardar módulos y opciones" }));

    await waitFor(() => {
      expect(actions.restaurantOptions).toHaveBeenCalledTimes(1);
    });

    const submitted = actions.restaurantOptions.mock.calls[0]?.[0];
    expect(submitted).toBeInstanceOf(FormData);
    if (!submitted) throw new Error("Expected FormData");
    expect(submitted.get("id")).toBe("rest-1");
    expect(submitted.get("menuEnabled")).toBe("true");
    expect(submitted.get("landingEnabled")).toBe("false");
    expect(submitted.get("reservationsEnabled")).toBe("true");
    expect(submitted.get("floorManagementEnabled")).toBe("true");
    expect(submitted.get("inventoryEnabled")).toBe("true");
  });
});
