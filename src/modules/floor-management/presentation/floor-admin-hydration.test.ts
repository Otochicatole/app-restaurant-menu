/** @vitest-environment jsdom */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { act, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorConfigView } from "../contracts";

const api = vi.hoisted(() => ({ config: vi.fn(), save: vi.fn(), push: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorConfig: api.config, saveFloorAction: api.save, floorInputClass: "input" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({push: api.push}) }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: ({room}: {room: {name: string}}) => createElement("div", {role: "img", "aria-label": `Plano de ${room.name}`}) }));

import { FloorAdminScreen } from "./FloorAdminScreen";

const toolNames = ["Salones", "Medidas", "Inventario", "Sectores", "Elementos", "Configuración"];
const dynamicNames = ["Guardar plano", ...toolNames];
const element = () => createElement(FloorAdminScreen, {restaurantId: "restaurant"});
const config = (loaded: boolean): FloorConfigView => ({
  restaurantId: "restaurant", restaurantName: "Bistró", enabled: true,
  timeZone: "America/Argentina/Buenos_Aires", compatibility: {status: "compatible"}, staffAccount: null,
  rooms: loaded ? [{id: "room", restaurantId: "restaurant", name: "Ventana", width: 800, height: 600, revision: 0, active: true, locations: [], fixtures: [], tables: [], combinations: []}] : [],
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return {promise, resolve};
}

describe("floor editor hydration and client configuration", () => {
  let root: Root | undefined;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.resetAllMocks();
    container = document.createElement("div"); document.body.appendChild(container);
  });
  afterEach(async () => {
    if (root) await act(async () => { root?.unmount(); });
    root = undefined; container.remove(); vi.restoreAllMocks();
  });

  it.each([false, true])("hydrates the same disabled controls before configuration resolves (room present: %s)", async (loaded) => {
    const request = deferred<FloorConfigView>(); api.config.mockReturnValue(request.promise);
    const component = element();
    container.innerHTML = renderToString(component);
    const dom = within(container); const serverHtml = container.innerHTML;
    for (const name of dynamicNames) {
      expect((dom.getByRole("button", {name}) as HTMLButtonElement).disabled).toBe(true);
      expect(dom.getByRole("button", {name}).hasAttribute("disabled")).toBe(true);
    }
    expect(api.config).not.toHaveBeenCalled();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {}); const recoverable = vi.fn();
    await act(async () => { root = hydrateRoot(container, component, {onRecoverableError: recoverable}); });
    expect(errors).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(serverHtml);
    expect(api.config).toHaveBeenCalledTimes(1);
    expect((api.config.mock.calls[0][1] as AbortSignal).aborted).toBe(false);
    await act(async () => { request.resolve(config(loaded)); });
    expect((dom.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true);
    for (const name of toolNames) expect((dom.getByRole("button", {name}) as HTMLButtonElement).disabled).toBe(!loaded && name !== "Salones" && name !== "Configuración");
    expect(Boolean(dom.queryByRole("img", {name: "Plano de Ventana"}))).toBe(loaded);
    expect(errors).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled();
  });

  it("hydrates correctly when configuration is already resolved as the client effect starts", async () => {
    api.config.mockResolvedValue(config(true));
    const component = element(); container.innerHTML = renderToString(component);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {}); const recoverable = vi.fn();
    expect((within(container).getByRole("button", {name: "Inventario"}) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { root = hydrateRoot(container, component, {onRecoverableError: recoverable}); });
    expect(within(container).getByRole("img", {name: "Plano de Ventana"})).toBeTruthy();
    expect((within(container).getByRole("button", {name: "Inventario"}) as HTMLButtonElement).disabled).toBe(false);
    expect(errors).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled();
  });

  it("opts dynamic server-rendered buttons out of restored state before React hydrates", async () => {
    const request = deferred<FloorConfigView>(); api.config.mockReturnValue(request.promise);
    const component = element(); container.innerHTML = renderToString(component);
    const dom = within(container); const serverHtml = container.innerHTML;
    for (const name of dynamicNames) {
      const button = dom.getByRole("button", {name}) as HTMLButtonElement;
      expect(button.getAttribute("autocomplete")).toBe("off");
      expect(button.disabled).toBe(true);
    }
    expect(container.innerHTML).toBe(serverHtml);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {}); const recoverable = vi.fn();
    await act(async () => { root = hydrateRoot(container, component, {onRecoverableError: recoverable}); });
    expect(container.innerHTML).toBe(serverHtml);
    expect(errors).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled();
    await act(async () => { request.resolve(config(true)); });
    for (const name of toolNames) expect((dom.getByRole("button", {name}) as HTMLButtonElement).disabled).toBe(false);
    expect((dom.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true);
    expect(errors).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled();
  });

  it("aborts its configuration request on unmount and ignores its late result", async () => {
    const request = deferred<FloorConfigView>(); api.config.mockReturnValue(request.promise);
    const component = element(); container.innerHTML = renderToString(component);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {}); const recoverable = vi.fn();
    await act(async () => { root = hydrateRoot(container, component, {onRecoverableError: recoverable}); });
    const signal = api.config.mock.calls[0][1] as AbortSignal;
    await act(async () => { root?.unmount(); }); root = undefined;
    expect(signal.aborted).toBe(true);
    await act(async () => { request.resolve(config(true)); });
    expect(container.innerHTML).toBe("");
    expect(errors).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled();
  });
});
