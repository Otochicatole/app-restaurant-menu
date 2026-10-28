/** @vitest-environment jsdom */

import React, { Component, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { RestaurantPickerScreen } from "./RestaurantPickerScreen";
import type { RestaurantWorkspace } from "../contracts";
import type { RestaurantActionResult } from "./actions";

vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: () => null }));

const workspace: RestaurantWorkspace = {
  organizationId: "organization-1", organizationName: "Grupo", maxRestaurants: 5,
  canCreateRestaurant: true, active: null,
  restaurants: [{ id: "restaurant-1", organizationId: "organization-1", name: "Centro", slug: "centro",
    landingSlug: "centro", publicDescription: "Carta", status: "ACTIVE", landingEnabled: true, assetQuotaBytes: 1000 }],
};

class RouterBoundary extends Component<{ children?: ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { this.props.onError(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

const success = async (): Promise<RestaurantActionResult> => ({ success: true, data: {} });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("restaurant picker action feedback", () => {
  it.each(["select", "create"])("lets Next handle the %s redirect without displaying a connection error", async (operation) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onNavigation = vi.fn();
    const navigate = vi.fn(async () => { redirect("/admin/restaurantes/restaurant-1"); });
    render(React.createElement(RouterBoundary, { onError: onNavigation },
      React.createElement(RestaurantPickerScreen, { workspace,
        selectRestaurant: operation === "select" ? navigate : success,
        createRestaurant: operation === "create" ? navigate : success, deleteRestaurants: success }),
    ));
    const user = userEvent.setup();
    if (operation === "select") await user.click(screen.getByRole("button", { name: "Abrir" }));
    else {
      await user.click(screen.getByRole("button", { name: "Agregar restaurante" }));
      await user.type(screen.getByLabelText("Nombre", { exact: true }), "Nuevo restaurante");
      await user.type(screen.getByLabelText("Slug público", { exact: true }), "nuevo-restaurante");
      await user.click(screen.getByRole("button", { name: "Crear y abrir" }));
    }
    await waitFor(() => expect(onNavigation).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledOnce();
    expect(onNavigation.mock.calls[0][0]).toHaveProperty("digest", expect.stringContaining("NEXT_REDIRECT"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still displays a genuine connection failure and allows retrying", async () => {
    const selectRestaurant = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ success: true, data: {} });
    render(React.createElement(RestaurantPickerScreen, { workspace, selectRestaurant, createRestaurant: success, deleteRestaurants: success }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos conectar con el servidor");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(selectRestaurant).toHaveBeenCalledTimes(2);
  });

  it("preserves validation and authorization errors returned by the server", async () => {
    const selectRestaurant = vi.fn(async (): Promise<RestaurantActionResult> => ({ success: false, error: { code: "FORBIDDEN", message: "Este restaurante no está disponible" } }));
    render(React.createElement(RestaurantPickerScreen, { workspace, selectRestaurant, createRestaurant: success, deleteRestaurants: success }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Este restaurante no está disponible");
  });
});
