/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorCanvasProps, FloorInteractionMode } from "./FloorCanvas";

const canvas = vi.hoisted(() => ({ props: {} as FloorCanvasProps & { zoom: number }, mounts: 0 }));
vi.mock("next/dynamic", async () => {
  const { useEffect } = await import("react");
  return { default: () => function Canvas(props: FloorCanvasProps & { zoom: number }) { canvas.props = props; useEffect(() => { canvas.mounts += 1; }, []); return null; } };
});
import { FloorCanvas } from "./FloorCanvas";

const room = { id: "room", name: "Ventana", width: 800, height: 600, fixtures: [] };
describe("floor canvas mode controls", () => {
  beforeEach(() => { canvas.mounts = 0; });
  afterEach(cleanup);

  it("starts in select mode, offers visible accessible controls and preserves zoom and the stage when modes and data change", () => {
    const view = render(createElement(FloorCanvas, { room, tables: [] }));
    expect(screen.getByRole("button", { name: "Seleccionar" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Acercar plano" }));
    expect(canvas.props.zoom).toBe(1.25);
    fireEvent.click(screen.getByRole("button", { name: "Mover vista" }));
    expect(canvas.props.interactionMode).toBe("pan");
    view.rerender(createElement(FloorCanvas, { room: { ...room }, tables: [], selectedIds: ["one"] }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(canvas.props.interactionMode).toBe("select");
    expect(canvas.props.zoom).toBe(1.25); expect(canvas.mounts).toBe(1);
  });

  it("temporarily pans while Space is held and restores the chosen mode on release or blur", () => {
    render(createElement(FloorCanvas, { room, tables: [] }));
    fireEvent.keyDown(document.body, { code: "Space" });
    expect(canvas.props.interactionMode).toBe("pan");
    fireEvent.keyUp(document.body, { code: "Space" });
    expect(canvas.props.interactionMode).toBe("select");
    fireEvent.keyDown(document.body, { code: "Space" });
    fireEvent.blur(window);
    expect(canvas.props.interactionMode).toBe("select");
    const input = document.createElement("input"); document.body.append(input);
    fireEvent.keyDown(input, { code: "Space" });
    expect(canvas.props.interactionMode).toBe("select"); input.remove();
    fireEvent.keyDown(screen.getByRole("button", { name: "Mover vista" }), { code: "Space" });
    expect(canvas.props.interactionMode).toBe("select");
  });

  it("supports controlled modes and opens selection actions from a labelled touch target", () => {
    const onInteractionModeChange = vi.fn(); const onContextMenuSelection = vi.fn();
    render(createElement(FloorCanvas, { room, tables: [], selectedIds: ["one", "two"], interactionMode: "pan", onInteractionModeChange, onContextMenuSelection }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(onInteractionModeChange).toHaveBeenCalledWith("select"); expect(canvas.props.interactionMode).toBe("pan");
    const actions = screen.getByRole("button", { name: "Acciones de la selección" });
    expect(actions.textContent).toContain("Acciones (2)");
    vi.spyOn(actions, "getBoundingClientRect").mockReturnValue({ x: 100, y: 120, left: 100, top: 120, right: 220, bottom: 164, width: 120, height: 44, toJSON: () => ({}) });
    fireEvent.click(actions);
    expect(onContextMenuSelection).toHaveBeenCalledWith({ x: 100, y: 120 });
  });

  it("activates placement from pan mode without resetting zoom or the stage, then still allows deliberate panning", () => {
    const view = render(createElement(FloorCanvas, { room, tables: [] }));
    fireEvent.click(screen.getByRole("button", { name: "Acercar plano" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover vista" }));
    view.rerender(createElement(FloorCanvas, { room, tables: [], onPlace: vi.fn() }));
    expect(canvas.props.interactionMode).toBe("select");
    expect(canvas.props.zoom).toBe(1.25); expect(canvas.mounts).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Mover vista" }));
    view.rerender(createElement(FloorCanvas, { room: { ...room }, tables: [], onPlace: vi.fn() }));
    expect(canvas.props.interactionMode).toBe("pan");
    view.rerender(createElement(FloorCanvas, { room, tables: [] }));
    view.rerender(createElement(FloorCanvas, { room, tables: [], onPlace: vi.fn() }));
    expect(canvas.props.interactionMode).toBe("select"); expect(canvas.mounts).toBe(1);
  });

  it("requests select mode when placement is activated with a controlled pan mode", () => {
    function Controlled({ placing }: { placing: boolean }) {
      const [interactionMode, onInteractionModeChange] = useState<FloorInteractionMode>("pan");
      return createElement(FloorCanvas, { room, tables: [], interactionMode, onInteractionModeChange, onPlace: placing ? vi.fn() : undefined });
    }
    const view = render(createElement(Controlled, { placing: false }));
    expect(canvas.props.interactionMode).toBe("pan");
    view.rerender(createElement(Controlled, { placing: true }));
    expect(canvas.props.interactionMode).toBe("select"); expect(canvas.mounts).toBe(1);
  });
});
