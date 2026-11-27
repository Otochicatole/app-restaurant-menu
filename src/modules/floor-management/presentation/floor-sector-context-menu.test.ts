/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorSectorContextMenu } from "./FloorSectorContextMenu";

const addTable = vi.fn();
const viewport = { width: window.innerWidth, height: window.innerHeight };

function Harness({
  point = { x: 420, y: 300 },
  disabled = false,
}: {
  point?: { x: number; y: number };
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", { onClick: () => setOpen(true) }, "Sector"),
    createElement("button", null, "Otra acción"),
    open
      ? createElement(FloorSectorContextMenu, {
          name: "Ventana",
          point,
          disabled,
          onAddTable: addTable,
          onClose: () => setOpen(false),
        })
      : null,
  );
}

function open() {
  const trigger = screen.getByRole("button", { name: "Sector" });
  trigger.focus();
  fireEvent.click(trigger);
  return screen.getByRole("menu", { name: "Acciones de Ventana" });
}

describe("sector actions at the cursor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 248,
      height: 100,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 248,
      bottom: 100,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
  });

  it("offers only Agregar mesa aquí and triggers onAddTable", () => {
    render(createElement(Harness));
    open();
    expect(screen.getByText("Ventana")).toBeTruthy();
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toBe("Agregar mesa aquí");
    expect(items[0]?.getAttribute("autocomplete")).toBe("off");
    expect(document.activeElement).toBe(items[0]);
    fireEvent.click(items[0]!);
    expect(addTable).toHaveBeenCalledOnce();
  });

  it.each(["Escape", "outside pointer", "outside wheel", "scroll", "resize"])(
    "dismisses on %s and restores the invoking control",
    (event) => {
      render(createElement(Harness));
      const menu = open();
      if (event === "Escape") fireEvent.keyDown(menu, { key: "Escape" });
      if (event === "outside pointer") fireEvent.pointerDown(document.body);
      if (event === "outside wheel") fireEvent.wheel(document.body);
      if (event === "scroll") fireEvent.scroll(window);
      if (event === "resize") fireEvent(window, new Event("resize"));
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sector" }));
    },
  );

  it("does not steal focus from another clicked control or dismiss an internal wheel", () => {
    render(createElement(Harness));
    const menu = open();
    fireEvent.wheel(menu);
    expect(screen.getByRole("menu")).toBe(menu);
    const other = screen.getByRole("button", { name: "Otra acción" });
    other.focus();
    fireEvent.pointerDown(other);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(other);
  });

  it("clamps the measured panel within the viewport and keeps clear of the sidebar", () => {
    const view = render(createElement(Harness, { point: { x: 1000, y: 760 } }));
    let menu = open();
    expect(menu.style.left).toBe("768px");
    expect(menu.style.top).toBe("660px");
    view.rerender(createElement(Harness, { point: { x: -20, y: -10 } }));
    menu = screen.getByRole("menu");
    expect(menu.style.left).toBe("72px");
    expect(menu.style.top).toBe("8px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 240 });
    view.rerender(createElement(Harness, { point: { x: 300, y: 230 } }));
    menu = screen.getByRole("menu");
    expect(menu.style.left).toBe("72px");
    expect(menu.style.top).toBe("132px");
  });

  it("keeps action inert while a save is pending", () => {
    render(createElement(Harness, { disabled: true }));
    const menu = open();
    expect(document.activeElement).toBe(menu);
    const item = screen.getByRole("menuitem", { name: "Agregar mesa aquí" }) as HTMLButtonElement;
    expect(item.disabled).toBe(true);
    fireEvent.click(item);
    expect(addTable).not.toHaveBeenCalled();
  });
});
