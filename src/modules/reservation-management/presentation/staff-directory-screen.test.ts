/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    const tableDom = within(table);
    expect(tableDom.getByText("Ana")).toBeTruthy();
    expect(tableDom.getByText("Carlos")).toBeTruthy();
    expect(tableDom.queryByText("Lucía")).toBeNull();
    expect(tableDom.queryByRole("columnheader", { name: "Teléfono" })).toBeNull();
    expect(tableDom.queryByRole("columnheader", { name: "Notas / Turno" })).toBeNull();
    expect(tableDom.queryByText("11223344")).toBeNull();
    expect(tableDom.queryByText("Salón principal")).toBeNull();

    // Show inactive
    fireEvent.click(screen.getByLabelText("Mostrar inactivos"));
    expect(tableDom.getByText("Lucía")).toBeTruthy();

    // Filter by Cocina
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "KITCHEN" } });
    expect(tableDom.queryByText("Ana")).toBeNull();
    expect(tableDom.getByText("Carlos")).toBeTruthy();

    // Reset filter and open create modal
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "ALL" } });
    fireEvent.click(screen.getByRole("button", { name: "Nuevo integrante" }));
    expect(screen.queryByLabelText(/Teléfono/i)).toBeNull();
    expect(screen.queryByLabelText(/Turno/i)).toBeNull();
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

    // Edit modal should also omit phone and shift/notes inputs
    const refreshedTable = await waitFor(() => screen.getByRole("table", { name: "Listado de personal" }));
    fireEvent.click(within(refreshedTable).getByRole("button", { name: "Editar Ana" }));
    expect(screen.queryByLabelText(/Teléfono/i)).toBeNull();
    expect(screen.queryByLabelText(/Turno/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/restaurants/rest-1/service",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "save-staff", id: "s1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true }),
        }),
      );
    });
  });
});
