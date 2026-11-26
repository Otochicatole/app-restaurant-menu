/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorSectorContextMenu } from "./FloorSectorContextMenu";

const actions = { edit: vi.fn(), rotate: vi.fn(), remove: vi.fn() };
const viewport = { width: window.innerWidth, height: window.innerHeight };
function Harness({ point = { x: 420, y: 300 }, disabled = false }: { point?: { x: number; y: number }; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return createElement("div", null,
    createElement("button", { onClick: () => setOpen(true) }, "Sector"),
    createElement("button", null, "Otra acción"),
    open ? createElement(FloorSectorContextMenu, { name: "Ventana", point, disabled, onEdit: actions.edit, onRotate: actions.rotate, onDelete: actions.remove, onClose: () => setOpen(false) }) : null);
}
function open() {
  const trigger = screen.getByRole("button", { name: "Sector" }); trigger.focus(); fireEvent.click(trigger);
  return screen.getByRole("menu", { name: "Acciones de Ventana" });
}

describe("sector actions at the cursor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 248, height: 100, x: 0, y: 0, top: 0, left: 0, right: 248, bottom: 100, toJSON: () => ({}) });
  });
  afterEach(() => {
    cleanup(); vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
  });

  it.each([["Editar", "edit"], ["Girar", "rotate"], ["Eliminar", "remove"]] as const)("offers %s for the selected sector", (label, action) => {
    render(createElement(Harness)); open();
    expect(screen.getByText("Ventana")).toBeTruthy();
    const item = screen.getByRole("menuitem", { name: label });
    expect(item.getAttribute("autocomplete")).toBe("off");
    fireEvent.click(item);
    expect(actions[action]).toHaveBeenCalledOnce();
  });

  it("focuses the first action and navigates all actions with arrows, Home and End", () => {
    render(createElement(Harness)); const menu = open();
    const edit = screen.getByRole("menuitem", { name: "Editar" });
    const rotate = screen.getByRole("menuitem", { name: "Girar" });
    const remove = screen.getByRole("menuitem", { name: "Eliminar" });
    expect(document.activeElement).toBe(edit);
    for (const [key, target] of [["ArrowRight", rotate], ["ArrowDown", remove], ["ArrowRight", edit], ["End", remove], ["ArrowUp", rotate], ["Home", edit], ["ArrowLeft", remove]] as const) {
      fireEvent.keyDown(menu, { key }); expect(document.activeElement).toBe(target);
    }
  });

  it.each(["Escape", "outside pointer", "outside wheel", "scroll", "resize"])("dismisses on %s and restores the invoking control", (event) => {
    render(createElement(Harness)); const menu = open();
    if (event === "Escape") fireEvent.keyDown(menu, { key: "Escape" });
    if (event === "outside pointer") fireEvent.pointerDown(document.body);
    if (event === "outside wheel") fireEvent.wheel(document.body);
    if (event === "scroll") fireEvent.scroll(window);
    if (event === "resize") fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sector" }));
  });

  it("does not steal focus from another clicked control or dismiss an internal wheel", () => {
    render(createElement(Harness)); const menu = open();
    fireEvent.wheel(menu); expect(screen.getByRole("menu")).toBe(menu);
    const other = screen.getByRole("button", { name: "Otra acción" }); other.focus(); fireEvent.pointerDown(other);
    expect(screen.queryByRole("menu")).toBeNull(); expect(document.activeElement).toBe(other);
  });

  it("clamps the measured panel within the viewport and keeps clear of the sidebar", () => {
    const view = render(createElement(Harness, { point: { x: 1000, y: 760 } })); let menu = open();
    expect(menu.style.left).toBe("768px"); expect(menu.style.top).toBe("660px");
    view.rerender(createElement(Harness, { point: { x: -20, y: -10 } })); menu = screen.getByRole("menu");
    expect(menu.style.left).toBe("72px"); expect(menu.style.top).toBe("8px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 240 });
    view.rerender(createElement(Harness, { point: { x: 300, y: 230 } })); menu = screen.getByRole("menu");
    expect(menu.style.left).toBe("72px"); expect(menu.style.top).toBe("132px");
  });

  it("keeps all actions inert while a save is pending", () => {
    render(createElement(Harness, { disabled: true })); const menu = open();
    expect(document.activeElement).toBe(menu);
    for (const item of screen.getAllByRole("menuitem")) { expect((item as HTMLButtonElement).disabled).toBe(true); fireEvent.click(item); }
    expect(actions.edit).not.toHaveBeenCalled(); expect(actions.rotate).not.toHaveBeenCalled(); expect(actions.remove).not.toHaveBeenCalled();
  });
});
