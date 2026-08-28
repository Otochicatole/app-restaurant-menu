/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicMenuInteractions } from "./PublicMenuInteractions";

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PublicMenuInteractions", () => {
  it("searches accent-insensitively, opens media and restores focus", async () => {
    const user = userEvent.setup();
    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "li",
          { id: "product-product-1", "data-menu-product": "product-1" },
          React.createElement(
            "button",
            {
              type: "button",
              "data-menu-media": true,
              "data-media-name": "Café E2E",
              "data-media-url": "/media.png",
              "data-media-type": "image",
            },
            "Ver Café E2E",
          ),
        ),
        React.createElement(PublicMenuInteractions, {
          items: [
            {
              id: "product-1",
              name: "Café E2E",
              description: "Tostado reciente",
              groupName: "Bebidas",
            },
          ],
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Abrir búsqueda" }));
    const searchDialog = screen.getByRole("dialog", { name: "Buscar en el catálogo" });
    await user.type(within(searchDialog).getByRole("searchbox", { name: "Buscar en el catálogo" }), "cafe");
    await user.click(within(searchDialog).getByRole("button", { name: /Café E2E/ }));

    expect(screen.queryByRole("dialog", { name: "Buscar en el catálogo" })).toBeNull();
    expect(document.getElementById("product-product-1")?.classList.contains("menu-product-highlight")).toBe(true);

    const mediaTrigger = screen.getByRole("button", { name: "Ver Café E2E" });
    await user.click(mediaTrigger);
    const mediaDialog = await screen.findByRole("dialog", { name: "Café E2E" });
    expect(mediaDialog.querySelector('img[src="/media.png"]')).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(mediaTrigger).toBe(document.activeElement));
  });
});
