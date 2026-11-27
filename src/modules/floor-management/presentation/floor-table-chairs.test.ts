import { describe, expect, it } from "vitest";
import { computeTableChairs } from "./floor-table-chairs";

describe("computeTableChairs", () => {
  it("places one chair per side around a 4-seat square table", () => {
    const chairs = computeTableChairs({
      id: "t1",
      shape: "SQUARE",
      capacity: 4,
      x: 200,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
      active: true,
    });

    expect(chairs).toHaveLength(4);
    expect(chairs.map((chair) => ({ x: chair.x, y: chair.y, rotation: chair.rotation }))).toEqual([
      { x: 0, y: -46.5, rotation: 180 },
      { x: 46.5, y: 0, rotation: -90 },
      { x: 0, y: 46.5, rotation: 0 },
      { x: -46.5, y: 0, rotation: 90 },
    ]);
  });

  it("distributes chairs along the long edges and ends of a 6-seat rectangle", () => {
    const chairs = computeTableChairs({
      id: "rect",
      shape: "RECTANGLE",
      capacity: 6,
      x: 300,
      y: 250,
      width: 140,
      height: 80,
      rotation: 0,
      active: true,
    });

    expect(chairs).toHaveLength(6);
    const topChairs = chairs.filter((chair) => chair.y < -40);
    const bottomChairs = chairs.filter((chair) => chair.y > 40);
    const leftChairs = chairs.filter((chair) => chair.x < -70);
    const rightChairs = chairs.filter((chair) => chair.x > 70);
    expect(topChairs).toHaveLength(2);
    expect(bottomChairs).toHaveLength(2);
    expect(leftChairs).toHaveLength(1);
    expect(rightChairs).toHaveLength(1);
  });

  it("places chairs evenly around a circular table", () => {
    const chairs = computeTableChairs({
      id: "round",
      shape: "CIRCLE",
      capacity: 4,
      x: 200,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
      active: true,
    });

    expect(chairs).toHaveLength(4);
    expect(Math.round(chairs[0].x)).toBe(0);
    expect(chairs[0].y).toBeLessThan(-40);
    expect(chairs[1].x).toBeGreaterThan(40);
    expect(Math.round(chairs[1].y)).toBe(0);
  });

  it("omits chairs blocked by an adjacent touching table or solid fixture", () => {
    const left = {
      id: "m9",
      shape: "SQUARE" as const,
      capacity: 4,
      x: 100,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
      active: true,
    };
    const right = { ...left, id: "m10", x: 180 };
    const wall = { type: "WALL" as const, x: 100, y: 150, width: 120, height: 20, rotation: 0 };

    const chairs = computeTableChairs(left, [left, right], [wall]);
    expect(chairs).toHaveLength(2);
    expect(chairs.some((chair) => chair.x > 40)).toBe(false);
    expect(chairs.some((chair) => chair.y < -40)).toBe(false);
  });

  it("respects table rotation when checking obstructions against neighbors", () => {
    const table = {
      id: "rot",
      shape: "RECTANGLE" as const,
      capacity: 2,
      x: 200,
      y: 200,
      width: 120,
      height: 70,
      rotation: 90,
      active: true,
    };
    // At rotation 90, local top (y = -41.5) maps to world right (+x = 241.5, y = 200)
    const neighbor = {
      id: "n2",
      shape: "SQUARE" as const,
      capacity: 4,
      x: 280,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
      active: true,
    };

    const chairs = computeTableChairs(table, [table, neighbor]);
    expect(chairs).toHaveLength(1);
    expect(chairs[0].y).toBeGreaterThan(35);
  });
});
