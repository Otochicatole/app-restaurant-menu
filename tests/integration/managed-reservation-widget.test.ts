// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_LANDING_MODULES, createBlockFromBuiltinModule } from "../../src/modules/landing-management/domain/landing-module-catalog";
import { compileLandingFromDocument, createDefaultLandingDocument } from "../../src/modules/landing-management/domain/landing-compiler";

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });

function mountTableWidget(legacy = false) {
  const definition = BUILTIN_LANDING_MODULES.find((entry) => entry.moduleKey === "reservations-table")!;
  const source = createDefaultLandingDocument("Prueba", "prueba");
  source.blocks = [createBlockFromBuiltinModule(definition)];
  const compiled = compileLandingFromDocument(source, { restaurantName: "Prueba", restaurantSlug: "prueba" });
  document.body.innerHTML = compiled.htmlContent;
  if (legacy) {
    document.querySelector("#resTableForm")?.insertAdjacentHTML("afterbegin", '<input type="hidden" id="resSelectedZone" name="zone" value="Salón Principal">');
    document.querySelector('[data-i18n="pap.dondeNota"]')!.textContent = "Elegí dónde querés estar: el deck afuera…";
    document.querySelector("#resSectoresGrid")!.innerHTML = '<button class="pap__sector es-elegido" data-zone="Salón Principal">Salón Principal</button>';
    document.querySelector("#papResumenDonde")!.textContent = "Salón Principal";
  }
  document.querySelector<HTMLElement>("#resSuccessView")!.scrollIntoView = vi.fn();
  window.eval(compiled.jsContent);
}

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

  it("hydrates legacy markup from the live sector catalog and submits only the requested ID", async () => {
    const name = "Ventana <img src=x>";
    const posts: object[] = [];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posts.push(JSON.parse(String(options.body)));
        return { ok: true, json: async () => ({ success: true, data: { reservation: { code: "R123", time: "20:00" } } }) };
      }
      const partySize = new URL(url, "https://restaurant.test").searchParams.get("partySize");
      const sectors = [
        { id: "window-a", name, roomName: partySize === "2" ? "Salón A" : "Salón A actualizado" },
        { id: "window-b", name, roomName: "Salón B" },
      ];
      return { ok: true, json: async () => ({ success: true, data: {
        currentDate: today, sectors: partySize === "4" ? sectors.slice(1) : sectors,
        dates: [{ date: today, available: true, availableSlots: [{ time: "20:00" }] }],
      } }) };
    }));

    mountTableWidget(true);
    const element = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
    await vi.waitFor(() => expect(element('#resSectoresGrid [data-sector-id="window-a"]')).toBeTruthy());
    expect(document.querySelector("#resSectoresGrid [data-zone]")).toBeNull();
    expect(element("#papResumenDonde").textContent).toBe("Sin preferencia");
    expect(element("#resSectoresGrid").textContent).toContain("Salón B");
    expect(element("#resSectoresGrid").querySelector("img")).toBeNull();
    expect(element(".pap__nota").textContent).toContain("al confirmar");

    element('#resSectoresGrid [data-sector-id="window-a"]').click();
    element("#papPartyPlusBtn").click();
    await vi.waitFor(() => expect(element("#papResumenDonde").textContent).toBe(`${name} · Salón A actualizado`));
    expect(element('#resSectoresGrid [data-sector-id="window-a"]').getAttribute("aria-pressed")).toBe("true");
    element("#papPartyPlusBtn").click();
    await vi.waitFor(() => expect(element("#papResumenDonde").textContent).toBe("Sin preferencia"));
    expect(document.querySelector('#resSectoresGrid [data-sector-id="window-a"]')).toBeNull();

    element('#resSectoresGrid [data-sector-id="window-b"]').click();
    element('#resSectoresGrid [data-sector-id=""]').click();
    expect(element("#papResumenDonde").textContent).toBe("Sin preferencia");
    element('#resSectoresGrid [data-sector-id="window-b"]').click();
    element("#papNextBtn").click();
    element('#resSlotsGrid [data-time="20:00"]').click();
    element("#papNextBtn").click();
    expect(element("#papBreadcrumbs").textContent).toContain(`${name} · Salón B`);
    expect(element("#papBreadcrumbs").querySelector("img")).toBeNull();
    element<HTMLInputElement>("#resNameInput").value = "Ana Pérez";
    element<HTMLInputElement>("#resPhoneInput").value = "123456789";
    element<HTMLInputElement>("#resNotesInput").value = "Cumpleaños";
    element("#resTableForm").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(element("#resVoucherZone").textContent).toBe(`${name} · Salón B`));
    expect(posts[0]).toMatchObject({ preferredSectorId: "window-b", notes: "Cumpleaños" });
  });

  it.each([
    { sectors: [], note: "Podés continuar sin elegir un sector." },
    { sectors: undefined, note: "No pudimos consultar los sectores. Podés continuar sin preferencia." },
  ])("handles an empty or unavailable sector catalog", async ({ sectors, note }) => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: { sectors, dates: [] } }) })));
    mountTableWidget();
    await vi.waitFor(() => expect(document.querySelector(".pap__nota")?.textContent).toBe(note));
    expect(document.querySelectorAll("#resSectoresGrid button")).toHaveLength(0);
    expect(document.querySelector("#papResumenDonde")?.textContent).toBe("Sin preferencia");
  });
});
