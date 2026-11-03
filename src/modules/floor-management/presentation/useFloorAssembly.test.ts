/** @vitest-environment jsdom */
import { useState } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFloorOptions, validateAssembly, type FloorAssignmentInput, type FloorOptionsView, type FloorRoom } from "../contracts";
import { useFloorAssembly } from "./useFloorAssembly";

const api = vi.hoisted(() => ({ options: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorOptions: api.options }));

const room: FloorRoom = {
  id: "inside", restaurantId: "restaurant", revision: 3, name: "Salón", width: 1000, height: 700, active: true, fixtures: [], combinations: [],
  locations: [{ id: "window", name: "Ventana", x: 500, y: 350, width: 800, height: 500, rotation: 0, active: true }],
  tables: ["one", "two"].map((id, index) => ({ id, label: String(index + 1), capacity: 4, shape: "SQUARE", width: 80, height: 80, x: 0, y: 0, rotation: 0, active: true })),
};
const patio: FloorRoom = { ...room, id: "outside", name: "Patio", locations: [{ ...room.locations[0], id: "patio" }], tables: [{ ...room.tables[0], id: "three", label: "3" }] };
const interval = { serviceStartAt: "2026-11-10T22:00:00.000Z", serviceEndAt: "2026-11-11T00:00:00.000Z", blockedFrom: "2026-11-10T22:00:00.000Z", blockedUntil: "2026-11-11T00:00:00.000Z", timeZone: "America/Argentina/Buenos_Aires" };
function available(rooms = [room, patio]): FloorOptionsView {
  return { rooms: structuredClone(rooms), interval, options: rooms.flatMap(buildFloorOptions).map((option) => ({ ...option, available: option.capacity >= 6, resourceAvailable: true })) };
}
function useHarness() {
  const [value, onChange] = useState<FloorAssignmentInput | null>(null);
  const [roomId, setRoomId] = useState("inside");
  const [active, setActive] = useState(true);
  const controller = useFloorAssembly({ restaurantId: "restaurant", active, partySize: 6, durationMinutes: 120, roomId, value, onChange });
  return { controller, value, setRoomId, setActive };
}

describe("main-floor table assembly", () => {
  beforeEach(() => { vi.resetAllMocks(); api.options.mockResolvedValue(available()); });
  afterEach(cleanup);

  it("remembers a point selected before choosing inventory and makes 4 + 4 offer six useful places", async () => {
    const { result } = renderHook(useHarness);
    await waitFor(() => expect(result.current.controller.room?.id).toBe("inside"));
    act(() => result.current.controller.place({ x: 610, y: 380 }, "window"));
    expect(result.current.value).toBeNull();
    expect(result.current.controller.locationId).toBe("window");
    act(() => result.current.controller.toggleTable("one"));
    expect(result.current.controller.selected[0]).toMatchObject({ tableId: "one", x: 610, y: 380 });
    act(() => result.current.controller.toggleTable("two"));
    expect(result.current.value).toMatchObject({ optionId: "custom", locationId: "window", x: 610, y: 380, capacity: 6, customTables: [{ tableId: "one", x: 570, y: 380 }, { tableId: "two", x: 650, y: 380 }] });
    expect(validateAssembly(result.current.controller.selected)).toBeNull();
    expect(api.options).toHaveBeenCalledWith("restaurant", { date: "", time: "", partySize: 6 }, expect.any(AbortSignal), 120);
  });

  it("preserves a moved, rotated draft across refresh and reopening the data dialog", async () => {
    const { result } = renderHook(useHarness);
    await waitFor(() => expect(result.current.controller.room).toBeDefined());
    act(() => result.current.controller.selectLocation("window"));
    act(() => result.current.controller.toggleTable("one"));
    act(() => result.current.controller.toggleTable("two"));
    act(() => result.current.controller.rotate());
    act(() => result.current.controller.move(20, 10));
    const saved = structuredClone(result.current.value);
    const poses = structuredClone(result.current.controller.selected);
    const next = available();
    next.options = next.options.map((option) => ({ ...option, x: option.x + 100, y: option.y + 50, poses: option.poses.map((pose) => ({ ...pose, x: pose.x + 100, y: pose.y + 50 })) }));
    api.options.mockResolvedValue(next);
    act(() => result.current.controller.refresh());
    await waitFor(() => expect(api.options).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.controller.loading).toBe(false));
    expect(result.current.value).toEqual(saved);
    expect(result.current.controller.selected).toEqual(poses);
    act(() => result.current.setActive(false));
    act(() => result.current.setActive(true));
    await waitFor(() => expect(api.options).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.controller.loading).toBe(false));
    expect(result.current.value).toEqual(saved);
    expect(result.current.controller.selected).toEqual(poses);
  });

  it("keeps another room's physical tables out of the current room's draft", async () => {
    const { result } = renderHook(useHarness);
    await waitFor(() => expect(result.current.controller.room).toBeDefined());
    act(() => result.current.controller.selectLocation("window"));
    act(() => result.current.controller.toggleTable("one"));
    act(() => result.current.setRoomId("outside"));
    expect(result.current.controller.selected).toEqual([]);
    expect(result.current.controller.locationId).toBe("");
    act(() => result.current.controller.selectLocation("patio"));
    act(() => result.current.controller.toggleTable("one"));
    expect(result.current.value?.roomId).toBe("inside");
    act(() => result.current.controller.toggleTable("three"));
    expect(result.current.value).toMatchObject({ roomId: "outside", locationId: "patio", customTables: [{ tableId: "three" }] });
    expect(result.current.controller.selected.map((pose) => pose.tableId)).toEqual(["three"]);
  });

  it("keeps fractional table edges joined after movement, rotation and placement", async () => {
    const fractionalRoom = { ...room, tables: room.tables.map((table) => ({ ...table, width: 80.5, height: 80.5 })) };
    api.options.mockResolvedValue(available([fractionalRoom]));
    const { result } = renderHook(useHarness);
    await waitFor(() => expect(result.current.controller.room).toBeDefined());
    act(() => result.current.controller.selectLocation("window"));
    act(() => result.current.controller.toggleTable("one"));
    act(() => result.current.controller.toggleTable("two"));
    expect(validateAssembly(result.current.controller.selected)).toBeNull();
    act(() => result.current.controller.move(12.2, 9.1));
    expect(validateAssembly(result.current.controller.selected)).toBeNull();
    act(() => result.current.controller.rotate());
    expect(validateAssembly(result.current.controller.selected)).toBeNull();
    act(() => result.current.controller.place({ x: 610.3, y: 420.7 }, "window"));
    const [first, second] = result.current.controller.selected;
    expect(validateAssembly([first, second])).toBeNull();
    expect(first.x).toBeCloseTo(610.3);
    expect(second.x).toBeCloseTo(610.3);
    expect(second.y - first.y).toBeCloseTo(80.5);
  });
});
