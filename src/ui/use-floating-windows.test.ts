/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingModalWindow, type FloatingModalWindowProps } from "./FloatingModalWindow";
import { useFloatingWindows } from "./useFloatingWindows";

afterEach(() => cleanup());

describe("independent floating windows", () => {
  it("opens separate tools, retains their original payloads and restores only the requested hidden window", () => {
    const { result } = renderHook(() => useFloatingWindows<{ name: string }>());
    const inventory = { name: "Inventario" }; const schedule = { name: "Horario" };
    act(() => { result.current.open("inventory", inventory); result.current.open("schedule", schedule); });
    expect(result.current.windows.map((window) => ({ id: window.id, visible: window.visible, offset: window.offset, zIndex: window.zIndex }))).toEqual([
      { id: "inventory", visible: true, offset: 0, zIndex: 30 }, { id: "schedule", visible: true, offset: 24, zIndex: 31 },
    ]);
    const originalActivation = result.current.windows[0].activation;
    act(() => { result.current.hide("inventory"); });
    expect(result.current.isVisible("inventory")).toBe(false); expect(result.current.isVisible("schedule")).toBe(true);
    act(() => { result.current.open("inventory", { name: "No reemplazar el formulario" }); });
    expect(result.current.windows).toHaveLength(2);
    expect(result.current.windows[0].value).toBe(inventory); expect(result.current.windows[1].value).toBe(schedule);
    expect(result.current.windows[0].activation).toBeGreaterThan(originalActivation);
    expect(result.current.windows[0].zIndex).toBeGreaterThan(result.current.windows[1].zIndex);
  });

  it("promotes pointer or keyboard focus without requesting restoration or exceeding confirmation layers", () => {
    const { result } = renderHook(() => useFloatingWindows<number>());
    act(() => { for (let index = 0; index < 30; index += 1) result.current.open(`tool-${index}`, index); });
    const ids = result.current.windows.map((window) => window.id);
    const activation = result.current.windows[0].activation;
    act(() => { result.current.focus("tool-0"); });
    expect(result.current.windows.map((window) => window.id)).toEqual(ids);
    expect(result.current.windows[0].activation).toBe(activation);
    expect(result.current.windows[0].zIndex).toBe(49);
    expect(result.current.windows.filter((window) => window.zIndex === 49)).toHaveLength(1);
    expect(result.current.windows.every((window) => window.zIndex >= 30 && window.zIndex < 50)).toBe(true);
    act(() => { result.current.hide("tool-0"); result.current.focus("tool-0"); });
    expect(result.current.isVisible("tool-0")).toBe(false);
    expect(result.current.windows[0].activation).toBe(activation);
  });

  it("discards only a closed tool, clears a room's tools and keeps mutation callbacks stable", () => {
    const { result } = renderHook(() => useFloatingWindows<string>());
    const callbacks = { open: result.current.open, hide: result.current.hide, close: result.current.close, focus: result.current.focus, clear: result.current.clear };
    act(() => { result.current.open("one", "Uno"); result.current.open("two", "Dos"); result.current.hide("two"); result.current.close("one"); });
    expect(result.current.windows).toEqual([expect.objectContaining({ id: "two", value: "Dos", visible: false })]);
    act(() => { result.current.open("one", "Nuevo formulario"); });
    expect(result.current.windows.find((window) => window.id === "one")!.value).toBe("Nuevo formulario");
    for (const name of Object.keys(callbacks) as (keyof typeof callbacks)[]) expect(result.current[name]).toBe(callbacks[name]);
    act(() => { result.current.clear(); }); expect(result.current.windows).toEqual([]);
    act(() => { result.current.open("next-room", "Otro salón"); });
    expect(result.current.windows[0]).toMatchObject({ id: "next-room", offset: 0, zIndex: 30 });
  });

  it("preserves each mounted form and its geometry while opening, focusing, minimizing or hiding another tool", () => {
    function Content({ id, onDiscard }: { id: string; onDiscard: () => void }) {
      const [value, setValue] = useState("");
      return createElement("div", null, createElement("input", { "aria-label": `Dato ${id}`, value, onChange: (event) => setValue(event.target.value) }), createElement("button", { onClick: onDiscard }, "Descartar este formulario"));
    }
    function Harness() {
      const tools = useFloatingWindows<string>();
      return createElement("div", null,
        createElement("button", { onClick: () => tools.open("inventory", "Inventario") }, "Abrir inventario"),
        createElement("button", { onClick: () => tools.open("schedule", "Horario") }, "Abrir horario"),
        tools.windows.map((tool) => {
          const windowProps: FloatingModalWindowProps = { id: tool.id, title: tool.value, isOpen: tool.visible, keepMounted: true, onClose: () => tools.hide(tool.id), onFocus: () => tools.focus(tool.id), activation: tool.activation, initialOffset: tool.offset, initialAnchor: "right", zIndex: tool.zIndex, initialSize: { width: 320, height: 260 }, initialPosition: { x: 100, y: 100 }, children: undefined };
          return createElement(FloatingModalWindow, { key: tool.id, ...windowProps }, createElement(Content, { id: tool.id, onDiscard: () => tools.close(tool.id) }));
        }));
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Abrir inventario" }));
    const first = screen.getByRole("dialog", { name: "Inventario" }); const input = screen.getByRole("textbox", { name: "Dato inventory" }) as HTMLInputElement;
    const initialLeft = Number.parseFloat(first.style.left);
    fireEvent.change(input, { target: { value: "Mesa junto a la ventana" } });
    fireEvent.keyDown(within(first).getByRole("button", { name: "Mover ventana Inventario" }), { key: "ArrowLeft" });
    const left = first.style.left;
    fireEvent.click(screen.getByRole("button", { name: "Abrir horario" }));
    const second = screen.getByRole("dialog", { name: "Horario" });
    expect(Number.parseFloat(second.style.left)).toBe(initialLeft - 24);
    expect(Number.parseFloat(second.style.top)).toBe(124);
    expect(screen.getAllByRole("dialog")).toHaveLength(2); expect(Number(second.style.zIndex)).toBeGreaterThan(Number(first.style.zIndex));
    act(() => input.focus());
    expect(Number(first.style.zIndex)).toBeGreaterThan(Number(second.style.zIndex));
    fireEvent.click(within(first).getByRole("button", { name: "Minimizar ventana" }));
    const secondInput = screen.getByRole("textbox", { name: "Dato schedule" }); act(() => secondInput.focus());
    expect(within(first).queryByRole("textbox")).toBeNull();
    expect(Number(second.style.zIndex)).toBeGreaterThan(Number(first.style.zIndex));
    fireEvent.click(screen.getByRole("button", { name: "Abrir inventario" }));
    expect(screen.getByRole("textbox", { name: "Dato inventory" })).toBe(input);
    expect(input.value).toBe("Mesa junto a la ventana"); expect(first.style.left).toBe(left);
    fireEvent.click(within(first).getByRole("button", { name: "Cerrar ventana" }));
    expect(screen.queryByRole("dialog", { name: "Inventario" })).toBeNull(); expect(input.isConnected).toBe(true);
    expect(screen.getByRole("dialog", { name: "Horario" })).toBe(second);
    fireEvent.click(screen.getByRole("button", { name: "Abrir inventario" }));
    expect(screen.getByRole("textbox", { name: "Dato inventory" })).toBe(input);
    fireEvent.click(within(first).getByRole("button", { name: "Descartar este formulario" }));
    expect(input.isConnected).toBe(false); expect(screen.getByRole("dialog", { name: "Horario" })).toBe(second);
  });
});
