/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorTableContextMenu } from "./FloorTableContextMenu";

const viewport = { width: window.innerWidth, height: window.innerHeight };
const actions = { edit: vi.fn(), separate: vi.fn(), close: vi.fn() };
const props = () => ({ name: "Mesa M1", point: { x: 1000, y: 760 }, disabled: false, onEdit: actions.edit, onClose: actions.close });
const groupActions = { onSeparate: actions.separate };

describe("joined table menu actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const height = 44 + this.querySelectorAll('[role="menuitem"]').length * 44;
      return { width: 248, height, x: 0, y: 0, top: 0, left: 0, right: 248, bottom: height, toJSON: () => ({}) };
    });
  });
  afterEach(() => {
    cleanup(); vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
  });

  it("offers the same vertical selection actions for one or many tables", () => {
    const view = render(createElement(FloorTableContextMenu, { ...props(), ...groupActions }));
    const menu = screen.getByRole("menu", { name: "Acciones de Mesa M1" });
    expect(menu.style.top).toBe("628px"); expect(menu.style.left).toBe("768px");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar", "Separar"]);
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Editar" }));
    fireEvent.keyDown(menu, { key: "End" }); expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Separar" }));
    fireEvent.keyDown(menu, { key: "ArrowDown" }); expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Editar" }));
    for (const [label, callback] of [["Editar", actions.edit], ["Separar", actions.separate]] as const) {
      const button = screen.getByRole("menuitem", { name: label });
      expect(button.getAttribute("autocomplete")).toBe("off"); fireEvent.click(button); expect(callback).toHaveBeenCalledOnce();
    }
    view.rerender(createElement(FloorTableContextMenu, { ...props(), name: "3 mesas seleccionadas" }));
    expect(screen.getByRole("menu", { name: "Acciones de 3 mesas seleccionadas" })).toBe(menu);
    expect((screen.getByRole("menuitem", { name: "Separar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(menu, { key: "End" }); expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Editar" }));
  });

  it("keeps individual and group mutations disabled together when permission is missing", () => {
    render(createElement(FloorTableContextMenu, { ...props(), ...groupActions, disabled: true, reason: "No tenés permiso para cambiar este armado." }));
    const menu = screen.getByRole("menu");
    expect(document.activeElement).toBe(menu);
    expect(menu.getAttribute("aria-describedby")).toBe(screen.getByText("No tenés permiso para cambiar este armado.").id);
    for (const item of screen.getAllByRole("menuitem")) { expect((item as HTMLButtonElement).disabled).toBe(true); fireEvent.click(item); }
    for (const callback of [actions.edit, actions.separate]) expect(callback).not.toHaveBeenCalled();
    fireEvent.keyDown(menu, { key: "End" }); expect(document.activeElement).toBe(menu);
    fireEvent.keyDown(menu, { key: "Escape" }); expect(actions.close).toHaveBeenCalledOnce();
  });
});
