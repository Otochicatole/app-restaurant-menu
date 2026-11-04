/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorTableContextMenu } from "./FloorTableContextMenu";

const viewport = { width: window.innerWidth, height: window.innerHeight };
const actions = { edit: vi.fn(), rotate: vi.fn(), move: vi.fn(), separate: vi.fn(), moveGroup: vi.fn(), rotateGroup: vi.fn(), close: vi.fn() };
const props = () => ({ name: "M1", point: { x: 1000, y: 760 }, disabled: false, onEdit: actions.edit, onRotate: actions.rotate, onMove: actions.move, onClose: actions.close });
const groupActions = { onSeparate: actions.separate, onMoveGroup: actions.moveGroup, onRotateGroup: actions.rotateGroup };

describe("joined table menu actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const height = this.querySelectorAll('[role="menuitem"]').length > 3 ? 238 : 100;
      return { width: 248, height, x: 0, y: 0, top: 0, left: 0, right: 248, bottom: height, toJSON: () => ({}) };
    });
  });
  afterEach(() => {
    cleanup(); vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
  });

  it("adds group actions to keyboard navigation and reclamps when a joined group becomes available", () => {
    const view = render(createElement(FloorTableContextMenu, props()));
    const menu = screen.getByRole("menu");
    expect(screen.queryByRole("group", { name: "Acciones del grupo" })).toBeNull();
    expect(menu.style.top).toBe("660px");
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Mover" }));
    view.rerender(createElement(FloorTableContextMenu, { ...props(), ...groupActions }));
    expect(menu.style.top).toBe("522px");
    expect(menu.style.left).toBe("768px");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar", "Girar", "Mover", "Mover grupo", "Girar grupo 90°", "Separar mesa"]);
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Separar mesa" }));
    fireEvent.keyDown(menu, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Editar" }));
    for (const [label, callback] of [["Mover grupo", actions.moveGroup], ["Girar grupo 90°", actions.rotateGroup], ["Separar mesa", actions.separate]] as const) {
      const button = screen.getByRole("menuitem", { name: label });
      expect(button.getAttribute("autocomplete")).toBe("off");
      fireEvent.click(button); expect(callback).toHaveBeenCalledOnce();
    }
    expect(actions.move).not.toHaveBeenCalled(); expect(actions.rotate).not.toHaveBeenCalled();
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
