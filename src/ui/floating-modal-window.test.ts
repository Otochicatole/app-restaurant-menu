/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingModalWindow, type FloatingModalWindowProps } from "./FloatingModalWindow";

const originalViewport = { width: window.innerWidth, height: window.innerHeight };
function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}
function pointer(target: Window | Document | Node, type: string, x: number, y: number, id = 1, button = 0, isPrimary = true) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button });
  Object.defineProperty(event, "pointerId", { value: id }); Object.defineProperty(event, "isPrimary", { value: isPrimary });
  fireEvent(target, event);
}
function props(extra: Partial<FloatingModalWindowProps> = {}): FloatingModalWindowProps {
  return { id: "tools", title: "Iconos", isOpen: true, onClose: vi.fn(), initialPosition: { x: 100, y: 100 }, initialSize: { width: 320, height: 260 }, minWidth: 200, minHeight: 150, children: createElement("input", { "aria-label": "Búsqueda" }), ...extra };
}
function geometry(element: HTMLElement) { return { x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top), width: Number.parseFloat(element.style.width), height: Number.parseFloat(element.style.height) }; }

describe("shared floating tool window", () => {
  beforeEach(() => { setViewport(1000, 700); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); setViewport(originalViewport.width, originalViewport.height); document.body.style.overflow = ""; });

  it("fits the whole window on first mount below configured minimums on a small viewport", () => {
    setViewport(280, 210);
    render(createElement(FloatingModalWindow, props({ initialAnchor: "right", initialPosition: { x: 360, y: 120 }, initialSize: { width: 480, height: 620 }, minWidth: 360, minHeight: 420, role: "complementary", ariaLabel: "Armar mesas en sala" })));
    const panel = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    expect(geometry(panel)).toEqual({ x: 10, y: 10, width: 260, height: 190 });
    expect(panel.hasAttribute("aria-modal")).toBe(false);
    expect(screen.getByRole("heading", { name: "Iconos", level: 2 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mover ventana Iconos" })).toBeTruthy();
  });

  it("drags and resizes within all viewport edges while keeping the entire window reachable", () => {
    render(createElement(FloatingModalWindow, props()));
    const panel = screen.getByRole("dialog", { name: "Iconos" });
    const handle = screen.getByRole("button", { name: "Mover ventana Iconos" });
    pointer(handle, "pointerdown", 100, 100); pointer(window, "pointermove", 10000, 10000); pointer(window, "pointerup", 10000, 10000);
    expect(geometry(panel)).toEqual({ x: 670, y: 430, width: 320, height: 260 });
    const grip = screen.getByRole("button", { name: "Cambiar tamaño de ventana" });
    pointer(grip, "pointerdown", 990, 690, 2); pointer(window, "pointermove", -1000, -1000, 2); pointer(window, "pointerup", -1000, -1000, 2);
    expect(geometry(panel)).toEqual({ x: 670, y: 430, width: 200, height: 150 });
    pointer(grip, "pointerdown", 870, 580, 3); pointer(window, "pointermove", 10000, 10000, 3); pointer(window, "pointerup", 10000, 10000, 3);
    expect(geometry(panel)).toEqual({ x: 670, y: 430, width: 320, height: 260 });
    pointer(handle, "pointerdown", 670, 430, 4); pointer(window, "pointermove", -10000, -10000, 4); pointer(window, "pointerup", -10000, -10000, 4);
    expect(geometry(panel)).toEqual({ x: 10, y: 10, width: 320, height: 260 });
    const leftEdge = panel.querySelectorAll<HTMLDivElement>('[aria-hidden="true"].cursor-ew-resize')[1];
    pointer(leftEdge, "pointerdown", 10, 100, 5); pointer(window, "pointermove", -1000, 100, 5); pointer(window, "pointerup", -1000, 100, 5);
    expect(geometry(panel)).toEqual({ x: 10, y: 10, width: 320, height: 260 });
  });

  it("ignores secondary pointers and mouse buttons, then stops a canceled gesture and cleans up on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const view = render(createElement(FloatingModalWindow, props()));
    const panel = screen.getByRole("dialog"); const handle = screen.getByRole("button", { name: "Mover ventana Iconos" });
    pointer(handle, "pointerdown", 100, 100, 1, 2); pointer(window, "pointermove", 200, 200, 1);
    pointer(handle, "pointerdown", 100, 100, 2, 0, false); pointer(window, "pointermove", 200, 200, 2);
    expect(geometry(panel)).toEqual({ x: 100, y: 100, width: 320, height: 260 });
    pointer(handle, "pointerdown", 100, 100, 3); pointer(window, "pointermove", 150, 160, 3);
    pointer(window, "pointercancel", 150, 160, 3); pointer(window, "pointermove", 300, 300, 3);
    expect(geometry(panel)).toEqual({ x: 150, y: 160, width: 320, height: 260 });
    pointer(handle, "pointerdown", 150, 160, 4); pointer(window, "pointermove", 180, 190, 4);
    fireEvent(window, new Event("blur")); pointer(window, "pointermove", 300, 300, 4);
    expect(geometry(panel)).toEqual({ x: 180, y: 190, width: 320, height: 260 });
    pointer(handle, "pointerdown", 180, 190, 5); view.unmount();
    for (const name of ["pointermove", "pointerup", "pointercancel", "blur"]) expect(remove.mock.calls.filter(([event]) => event === name)).toHaveLength(3);
  });

  it("keeps editor tools inside their workspace and out of the CMS sidebar", () => {
    setViewport(390, 844);
    render(createElement(FloatingModalWindow, props({ viewportInset: { left: 64 }, initialAnchor: "right", initialPosition: { x: 80, y: 112 }, initialSize: { width: 420, height: 620 }, minWidth: 300 })));
    const panel = screen.getByRole("dialog");
    expect(geometry(panel)).toEqual({ x: 74, y: 112, width: 306, height: 620 });
    const handle = screen.getByRole("button", { name: "Mover ventana Iconos" });
    pointer(handle, "pointerdown", 80, 120); pointer(window, "pointermove", -500, 120); pointer(window, "pointerup", -500, 120);
    expect(geometry(panel).x).toBe(74);
    const grip = screen.getByRole("button", { name: "Cambiar tamaño de ventana" });
    pointer(grip, "pointerdown", 380, 730, 2); pointer(window, "pointermove", 800, 730, 2); pointer(window, "pointerup", 800, 730, 2);
    expect(geometry(panel).width).toBe(306);
  });

  it("keeps input state, details, scroll position and geometry when minimized and restored", () => {
    function Content() {
      const [value, setValue] = useState("");
      return createElement("div", { "data-testid": "content-scroll" }, createElement("details", null, createElement("summary", null, "Ajustes"), createElement("input", { "aria-label": "Dato", value, onChange: (event) => setValue(event.target.value) })));
    }
    render(createElement(FloatingModalWindow, props({ children: createElement(Content) })));
    const panel = screen.getByRole("dialog"); const input = screen.getByLabelText("Dato") as HTMLInputElement;
    const details = input.closest("details")!; details.open = true;
    const scroll = screen.getByTestId("content-scroll"); scroll.scrollTop = 75;
    fireEvent.change(input, { target: { value: "Ventana" } });
    fireEvent.keyDown(screen.getByRole("button", { name: "Cambiar tamaño de ventana" }), { key: "ArrowRight" });
    const before = geometry(panel);
    fireEvent.click(screen.getByRole("button", { name: "Minimizar ventana" }));
    expect(screen.queryByRole("textbox", { name: "Dato" })).toBeNull();
    expect(input.isConnected).toBe(true); expect(document.getElementById("tools-body")!.hidden).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar ventana" }));
    expect(screen.getByLabelText("Dato")).toBe(input); expect(input.value).toBe("Ventana");
    expect(details.open).toBe(true); expect(scroll.scrollTop).toBe(75); expect(geometry(panel)).toEqual(before);
  });

  it("can hide and reopen the same mounted nonmodal tool without losing its inputs or capturing board focus", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return createElement("div", null, createElement("button", { onClick: () => setOpen(true) }, "Abrir herramientas"), createElement(FloatingModalWindow, props({ role: "complementary", isOpen: open, keepMounted: true, onClose: () => setOpen(false) })));
    }
    document.body.style.overflow = "auto";
    render(createElement(Harness));
    const panel = screen.getByRole("complementary"); const input = screen.getByLabelText("Búsqueda") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Cuadrada" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ventana" }));
    expect(screen.queryByRole("complementary")).toBeNull(); expect(panel.isConnected).toBe(true); expect(panel.hidden).toBe(true); expect(panel.hasAttribute("inert")).toBe(true);
    const opener = screen.getByRole("button", { name: "Abrir herramientas" }); opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("complementary")).toBe(panel); expect(screen.getByLabelText("Búsqueda")).toBe(input); expect(input.value).toBe("Cuadrada");
    expect(document.activeElement).toBe(opener); expect(document.body.style.overflow).toBe("auto");
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }); fireEvent(input, tab); expect(tab.defaultPrevented).toBe(false);
  });

  it("fits a changing viewport and restores the preferred size after a temporary viewport reduction", () => {
    render(createElement(FloatingModalWindow, props({ initialAnchor: "right" })));
    const panel = screen.getByRole("dialog"); expect(geometry(panel).x).toBe(670);
    setViewport(240, 190); fireEvent(window, new Event("resize"));
    expect(geometry(panel)).toEqual({ x: 10, y: 10, width: 220, height: 170 });
    setViewport(1000, 700); fireEvent(window, new Event("resize"));
    expect(geometry(panel)).toEqual({ x: 10, y: 10, width: 320, height: 260 });
  });

  it("supports precise keyboard movement and sizing and keeps close disabled during an operation", () => {
    const onClose = vi.fn();
    render(createElement(FloatingModalWindow, props({ closeDisabled: true, onClose })));
    const panel = screen.getByRole("dialog");
    const handle = screen.getByRole("button", { name: "Mover ventana Iconos" });
    fireEvent.keyDown(handle, { key: "ArrowRight" }); fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
    const grip = screen.getByRole("button", { name: "Cambiar tamaño de ventana" });
    fireEvent.keyDown(grip, { key: "ArrowRight", shiftKey: true }); fireEvent.keyDown(grip, { key: "ArrowDown" });
    expect(geometry(panel)).toEqual({ x: 110, y: 101, width: 321, height: 270 });
    const close = screen.getByRole("button", { name: "Cerrar ventana" }) as HTMLButtonElement;
    expect(close.disabled).toBe(true); expect(close.getAttribute("autocomplete")).toBe("off");
    fireEvent.click(close); expect(onClose).not.toHaveBeenCalled();
  });

  it("centers horizontally and vertically inside bounds when initialAnchor is center", () => {
    setViewport(1400, 900);
    render(createElement(FloatingModalWindow, props({
      initialAnchor: "center",
      initialPosition: { x: 0, y: 0 },
      initialSize: { width: 1000, height: 600 },
      viewportInset: { bottom: 16 },
    })));
    const panel = screen.getByRole("dialog", { name: "Iconos" });
    // bounds: left=10, width=1380 -> x = 10 + (1380 - 1000)/2 = 200; top=10, height=864 -> y = 10 + (864 - 600)/2 = 142
    expect(geometry(panel)).toEqual({ x: 200, y: 142, width: 1000, height: 600 });
  });
});
