/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloorTableModal } from "./FloorTableModal";

describe("FloorTableModal", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when closed and opens a fixed native dialog when open", () => {
    const view = render(
      createElement(
        FloorTableModal,
        {
          open: false,
          title: "Cuenta · Mesa 1",
          badge: "Mesa 1",
          subtitle: "Ventana · 4 comensales",
          onClose: vi.fn(),
        },
        createElement("p", null, "Contenido de mesa"),
      ),
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    view.rerender(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Cuenta · Mesa 1",
          badge: "Mesa 1",
          subtitle: "Ventana · 4 comensales",
          onClose: vi.fn(),
        },
        createElement("p", null, "Contenido de mesa"),
      ),
    );

    const dialog = screen.getByRole("dialog", { name: "Cuenta · Mesa 1" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(screen.getByText("Mesa 1")).toBeTruthy();
    expect(screen.getByText("Ventana · 4 comensales")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Minimizar/i })).toBeNull();
  });

  it("closes immediately on Cerrar or Escape when there are no unsaved changes", () => {
    const onClose = vi.fn();
    render(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Abrir mesa",
          onClose,
        },
        createElement("p", null, "Libre"),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows inline confirmation before discarding unsaved changes without calling window.confirm", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onClose = vi.fn();
    render(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Cuenta · Ana",
          hasUnsavedChanges: true,
          onClose,
        },
        createElement("p", null, "Borrador pendiente"),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Descartar y cerrar");
    const buttons = within(alert).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Descartar y cerrar", "Seguir editando"]);

    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descartar y cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("prevents closing while closeDisabled is true and invokes onRefresh", () => {
    const onClose = vi.fn();
    const onRefresh = vi.fn();
    render(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Cuenta · Mesa 2",
          closeDisabled: true,
          onRefresh,
          onClose,
        },
        createElement("p", null, "Guardando"),
      ),
    );

    const closeBtn = screen.getByRole("button", { name: "Cerrar" }) as HTMLButtonElement;
    const refreshBtn = screen.getByRole("button", { name: "Actualizar cuenta" }) as HTMLButtonElement;
    expect(closeBtn.disabled).toBe(true);
    expect(refreshBtn.disabled).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    cleanup();
    render(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Cuenta · Mesa 2",
          onRefresh,
          onClose,
        },
        createElement("p", null, "Activa"),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Actualizar cuenta" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("applies compact dialog sizing when requested", () => {
    const view = render(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Abrir mesa",
          size: "compact",
          onClose: vi.fn(),
        },
        createElement("p", null, "Compacto"),
      ),
    );
    expect(screen.getByRole("dialog", { name: "Abrir mesa" }).className).toContain("modalDialogCompact");

    view.rerender(
      createElement(
        FloorTableModal,
        {
          open: true,
          title: "Cuenta · Mesa 2",
          size: "wide",
          onClose: vi.fn(),
        },
        createElement("p", null, "Amplio"),
      ),
    );
    expect(screen.getByRole("dialog", { name: "Cuenta · Mesa 2" }).className).not.toContain("modalDialogCompact");
  });
});
