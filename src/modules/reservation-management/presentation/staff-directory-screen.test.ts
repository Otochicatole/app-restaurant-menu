/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffDirectoryScreen } from "./StaffDirectoryScreen";

const sampleStaff = [
  { id: "s1", name: "Ana", role: "WAITER", phone: "11223344", notes: "Salón principal", active: true, createdAt: "2026-11-14T00:00:00.000Z" },
  { id: "s2", name: "Carlos", role: "KITCHEN", phone: "", notes: "Parrilla", active: true, createdAt: "2026-11-14T00:00:00.000Z" },
  { id: "s3", name: "Lucía", role: "WAITER", phone: "", notes: "Suplente", active: false, createdAt: "2026-11-14T00:00:00.000Z" },
];

describe("StaffDirectoryScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the staff table, filters by role and inactive state, and creates/toggles members", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ success: true, data: { ...sampleStaff[0], ...body, id: body.id ?? "s4" } }));
      }
      return new Response(JSON.stringify({ success: true, data: sampleStaff }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(StaffDirectoryScreen, { restaurantId: "rest-1" }));

    const table = await waitFor(() => screen.getByRole("table", { name: "Listado de personal" }));
    expect(table).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Carlos")).toBeTruthy();
    expect(screen.queryByText("Lucía")).toBeNull();

    // Show inactive
    fireEvent.click(screen.getByLabelText("Mostrar inactivos"));
    expect(screen.getByText("Lucía")).toBeTruthy();

    // Filter by Cocina
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "KITCHEN" } });
    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getByText("Carlos")).toBeTruthy();

    // Reset filter and open create modal
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "ALL" } });
    fireEvent.click(screen.getByRole("button", { name: "Nuevo integrante" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Marcos" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/restaurants/rest-1/service",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "save-staff", name: "Marcos", role: "WAITER", phone: "", notes: "", active: true }),
        }),
      );
    });
  });
});
