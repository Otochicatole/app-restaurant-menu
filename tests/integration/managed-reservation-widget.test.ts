// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_LANDING_MODULES, createBlockFromBuiltinModule } from "../../src/modules/landing-management/domain/landing-module-catalog";
import { compileLandingFromDocument, createDefaultLandingDocument } from "../../src/modules/landing-management/domain/landing-compiler";

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });

describe("managed booking widgets without a server", () => {
  it.each(["reservations-booking", "reservations-events"])("respects the server's event availability and canonical field names: %s", async (key) => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: {
      dates: [], recurringClosedDays: [], events: [{ id: "past-event", title: "Cena", date: "2099-01-01", startTime: "21:30", endTime: "23:00", capacity: 10, remainingSpots: 8, available: false }],
    } }) })));
    const definition = BUILTIN_LANDING_MODULES.find((entry) => entry.moduleKey === key)!;
    const source = createDefaultLandingDocument("Prueba", "prueba"); source.blocks = [createBlockFromBuiltinModule(definition)];
    const compiled = compileLandingFromDocument(source, { restaurantName: "Prueba", restaurantSlug: "prueba" });
    document.body.innerHTML = compiled.htmlContent; window.eval(compiled.jsContent);
    await vi.waitFor(() => expect(document.querySelector('[data-event-id="past-event"]')).not.toBeNull());
    expect((document.querySelector('[data-event-id="past-event"]') as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain("21:30");
    expect(document.querySelector('.res-event-card-meta, .event-meta-row')?.textContent).not.toContain("undefined");
  });

  it.each([
    { key: "reservations-table", control: "#papPartyPlusBtn", expected: "3" },
    { key: "reservations-booking", control: '#resPartyPills [data-party="4"]', expected: "4" },
  ])("refreshes quantity-specific availability and invents no full-day hours: $key", async ({ key, control, expected }) => {
    const requests: URL[] = [];
    const now = new Date();
    now.setDate(now.getDate() - 1); // Simulate a customer ahead of the restaurant's civil date.
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const request = new URL(url, "https://restaurant.test"); requests.push(request);
      return { ok: true, json: async () => ({ success: true, data: {
        currentDate: today, currentTime: "23:30", timeZone: "America/Argentina/Buenos_Aires",
        dates: [{ date: request.searchParams.get("date") ?? today, available: false, status: "FULLY_BOOKED", reason: "Sin mesas para ese grupo", availableSlots: [], occupiedTimes: [], totalSlots: 1 }],
        recurringClosedDays: [], events: [],
      } }) };
    }));
    const definition = BUILTIN_LANDING_MODULES.find((entry) => entry.moduleKey === key)!;
    const documentSource = createDefaultLandingDocument("Prueba", "prueba");
    documentSource.blocks = [createBlockFromBuiltinModule(definition)];
    const compiled = compileLandingFromDocument(documentSource, { restaurantName: "Prueba", restaurantSlug: "prueba" });
    document.body.innerHTML = compiled.htmlContent;
    window.eval(compiled.jsContent);
    await vi.waitFor(() => expect(requests.some((request) => request.searchParams.get("partySize") === "2")).toBe(true));
    await vi.waitFor(() => expect(requests.some((request) => request.searchParams.get("date") === today || request.searchParams.get("from") === today)).toBe(true));
    await vi.waitFor(() => expect(document.querySelectorAll('.res-slot-pill[data-time], .pap__hora[data-time]')).toHaveLength(0));
    (document.querySelector(control) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(requests.some((request) => request.searchParams.get("partySize") === expected)).toBe(true));
    expect(document.querySelectorAll('.res-slot-pill[data-time], .pap__hora[data-time]')).toHaveLength(0);
    expect((document.querySelector("#resSelectedTime") as HTMLInputElement | null)?.value ?? "").toBe("");
  });
});
