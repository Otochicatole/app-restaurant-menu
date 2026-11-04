/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorTableContextMenu } from "./FloorTableContextMenu";

const viewport = { width: window.innerWidth, height: window.innerHeight };
const actions = { edit: vi.fn(), editGroup: vi.fn(), rotate: vi.fn(), move: vi.fn(), separate: vi.fn(), moveGroup: vi.fn(), rotateGroup: vi.fn(), close: vi.fn() };
const props = () => ({ name: "M1", point: { x: 1000, y: 760 }, disabled: false, onEdit: actions.edit, onRotate: actions.rotate, onMove: actions.move, onClose: actions.close });
const groupActions = { onSeparate: actions.separate, onMoveGroup: actions.moveGroup, onRotateGroup: actions.rotateGroup };

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

  it("keeps table and group editing in separate vertical menus", () => {
    const view = render(createElement(FloorTableContextMenu, { ...props(), ...groupActions }));
    const menu = screen.getByRole("menu", { name: "Acciones de mesa M1" });
    expect(menu.style.top).toBe("540px");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar mesa", "Girar", "Mover", "Separar mesa"]);
    expect(screen.queryByRole("menuitem", { name: "Editar grupo" })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar mesa" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Girar" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Mover" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Separar mesa" }));
    for (const action of [actions.edit, actions.rotate, actions.move, actions.separate]) expect(action).toHaveBeenCalledOnce();
    expect(actions.moveGroup).not.toHaveBeenCalled(); expect(actions.rotateGroup).not.toHaveBeenCalled();
    view.rerender(createElement(FloorTableContextMenu, { ...props(), ...groupActions, scope: "group", onEditGroup: actions.editGroup }));
    expect(menu.style.top).toBe("584px"); expect(menu.style.left).toBe("768px");
    expect(screen.getByRole("menu", { name: "Acciones del grupo M1" })).toBe(menu);
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar grupo", "Girar grupo 90°", "Mover grupo"]);
    expect(screen.queryByRole("menuitem", { name: "Editar mesa" })).toBeNull();
    fireEvent.keyDown(menu, { key: "End" }); expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Mover grupo" }));
    fireEvent.keyDown(menu, { key: "ArrowRight" }); expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Editar grupo" }));
    for (const [label, callback] of [["Editar grupo", actions.editGroup], ["Mover grupo", actions.moveGroup], ["Girar grupo 90°", actions.rotateGroup]] as const) {
      const button = screen.getByRole("menuitem", { name: label }); expect(button.getAttribute("autocomplete")).toBe("off"); fireEvent.click(button); expect(callback).toHaveBeenCalledOnce();
    }
    expect(actions.edit).toHaveBeenCalledOnce(); expect(actions.move).toHaveBeenCalledOnce(); expect(actions.rotate).toHaveBeenCalledOnce();
  });

  it("keeps individual and group mutations disabled together when permission is missing", () => {
    render(createElement(FloorTableContextMenu, { ...props(), ...groupActions, disabled: true, reason: "No tenés permiso para cambiar este armado." }));
    const menu = screen.getByRole("menu");
    expect(document.activeElement).toBe(menu);
    expect(menu.getAttribute("aria-describedby")).toBe(screen.getByText("No tenés permiso para cambiar este armado.").id);
    for (const item of screen.getAllByRole("menuitem")) { expect((item as HTMLButtonElement).disabled).toBe(true); fireEvent.click(item); }
    for (const callback of [actions.edit, actions.rotate, actions.move, actions.moveGroup, actions.rotateGroup, actions.separate]) expect(callback).not.toHaveBeenCalled();
    fireEvent.keyDown(menu, { key: "End" }); expect(document.activeElement).toBe(menu);
    fireEvent.keyDown(menu, { key: "Escape" }); expect(actions.close).toHaveBeenCalledOnce();
  });
});
