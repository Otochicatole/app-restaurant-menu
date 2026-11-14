// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_LANDING_MODULES, createBlockFromBuiltinModule } from "../../src/modules/landing-management/domain/landing-module-catalog";
import { compileLandingFromDocument, createDefaultLandingDocument } from "../../src/modules/landing-management/domain/landing-compiler";
import { LANDING_TEMPLATE_PRESETS } from "../../src/modules/landing-management/domain/landing-template-presets";

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

  it("loads and books a single specific event with its cover inside the Arco landing preset", async () => {
    const posts: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posts.push({ url, body: JSON.parse(String(options.body)) });
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { reservation: { code: "EVT-900", eventTitle: "Noche de Jazz", date: "2099-05-01", time: "21:00", partySize: 3, customerName: "Lucía" } },
          }),
        };
      }
      if (url.includes("/reservations/events")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { events: [{ id: "evt-1", title: "Noche de Jazz", description: "Cuarteto en vivo", date: "2099-05-01", startTime: "21:00", imageUrl: "https://cdn.example/jazz-cover.jpg", priceLabel: "$18.000", capacity: 30, remainingSpots: 12, available: true }] },
          }),
        };
      }
      return { ok: true, json: async () => ({ success: true, data: { dates: [], recurringClosedDays: [], events: [], sectors: [] } }) };
    }));

    const arcoPreset = LANDING_TEMPLATE_PRESETS.find((preset) => preset.id === "landing-preset-arco-bar")!;
    const compiled = compileLandingFromDocument(arcoPreset.document, { restaurantName: "Arco", restaurantSlug: "arco-bar" });
    document.body.innerHTML = compiled.htmlContent;
    document.querySelector<HTMLElement>("#resSuccessView")!.scrollIntoView = vi.fn();
    window.eval(compiled.jsContent);

    await vi.waitFor(() => expect((document.querySelector("#evtCoverImg") as HTMLImageElement).src).toContain("jazz-cover.jpg"));
    expect((document.querySelector("#evtSideImage") as HTMLImageElement).src).toContain("jazz-cover.jpg");
    expect(document.querySelector("#evtCoverMainTitle")?.textContent).toBe("Noche de Jazz");
    expect(document.querySelector<HTMLElement>("#evtStep2View")?.style.display).toBe("flex");
    expect(document.querySelector("#evtStepCounter")?.textContent).toBe("Paso 1 de 2");

    (document.querySelector("#evtSpotsPlusBtn") as HTMLButtonElement).click();
    expect(document.querySelector("#evtSpotsDisplay")?.textContent).toBe("3");
    (document.querySelector("#evtNextBtn") as HTMLButtonElement).click();
    expect(document.querySelector<HTMLElement>("#evtStep3View")?.style.display).toBe("flex");
    expect(document.querySelector("#evtStepCounter")?.textContent).toBe("Paso 2 de 2");

    (document.querySelector("#eventCustomerName") as HTMLInputElement).value = "Lucía";
    (document.querySelector("#eventCustomerPhone") as HTMLInputElement).value = "+5491155551111";
    document.querySelector("#eventBookingForm")!.dispatchEvent(new Event("submit", { cancelable: true }));

    await vi.waitFor(() => expect(document.querySelector("#eventVoucherCode")?.textContent).toBe("EVT-900"));
    expect(posts).toHaveLength(1);
    expect(posts[0]?.url).toContain("/api/public/landing/arco-bar/reservations/events");
    expect(posts[0]?.body).toMatchObject({ eventId: "evt-1", partySize: 3, customerName: "Lucía" });
  });

  it("lets visitors switch between multiple events, updates portada, and shows covers in reservations-booking", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/reservations/events") || url.includes("/reservations/availability")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              dates: [],
              recurringClosedDays: [],
              events: [
                { id: "evt-1", title: "Cata Nocturna", description: "5 etiquetas", date: "2099-05-01", startTime: "20:30", imageUrl: "https://cdn.example/cata.jpg", priceLabel: "$20.000", capacity: 20, remainingSpots: 8, available: true },
                { id: "evt-2", title: "Sunset Electrónico", description: "DJ invitado", date: "2099-05-08", startTime: "19:30", imageUrl: "https://cdn.example/sunset.jpg", priceLabel: "$15.000", capacity: 50, remainingSpots: 20, available: true },
              ],
            },
          }),
        };
      }
      return { ok: true, json: async () => ({ success: true, data: {} }) };
    }));

    const eventsDef = BUILTIN_LANDING_MODULES.find((entry) => entry.moduleKey === "reservations-events")!;
    const pinnedBlock = createBlockFromBuiltinModule(eventsDef);
    pinnedBlock.values.targetEventId = "evt-2";
    const pinnedDoc = createDefaultLandingDocument("Prueba", "prueba");
    pinnedDoc.blocks = [pinnedBlock];
    document.body.innerHTML = compileLandingFromDocument(pinnedDoc, { restaurantName: "Prueba", restaurantSlug: "prueba" }).htmlContent;
    window.eval(compileLandingFromDocument(pinnedDoc, { restaurantName: "Prueba", restaurantSlug: "prueba" }).jsContent);

    await vi.waitFor(() => expect((document.querySelector("#evtCoverImg") as HTMLImageElement).src).toContain("sunset.jpg"));
    expect(document.querySelector("#evtCoverMainTitle")?.textContent).toBe("Sunset Electrónico");
    expect(document.querySelectorAll('#eventsListGrid [data-event-id]')).toHaveLength(1);

    document.body.replaceChildren();
    const multiDoc = createDefaultLandingDocument("Prueba", "prueba");
    multiDoc.blocks = [createBlockFromBuiltinModule(eventsDef)];
    const compiledMulti = compileLandingFromDocument(multiDoc, { restaurantName: "Prueba", restaurantSlug: "prueba" });
    document.body.innerHTML = compiledMulti.htmlContent;
    window.eval(compiledMulti.jsContent);
    await vi.waitFor(() => expect(document.querySelectorAll('#eventsListGrid [data-event-id]')).toHaveLength(2));
    expect(document.querySelector("#evtStepCounter")?.textContent).toBe("Paso 1 de 3");
    (document.querySelector('#eventsListGrid [data-event-id="evt-2"]') as HTMLButtonElement).click();
    expect((document.querySelector("#evtCoverImg") as HTMLImageElement).src).toContain("sunset.jpg");
    expect(document.querySelector("#evtStepCounter")?.textContent).toBe("Paso 2 de 3");

    document.body.replaceChildren();
    const bookingDef = BUILTIN_LANDING_MODULES.find((entry) => entry.moduleKey === "reservations-booking")!;
    const bookingDoc = createDefaultLandingDocument("Prueba", "prueba");
    bookingDoc.blocks = [createBlockFromBuiltinModule(bookingDef)];
    const compiledBooking = compileLandingFromDocument(bookingDoc, { restaurantName: "Prueba", restaurantSlug: "prueba" });
    document.body.innerHTML = compiledBooking.htmlContent;
    window.eval(compiledBooking.jsContent);

    await vi.waitFor(() => expect(document.querySelector('#resEventsCards [data-event-id="evt-2"]')).not.toBeNull());
    expect((document.querySelector('#resEventsCards .res-event-card-img') as HTMLImageElement).src).toContain("cata.jpg");
    (document.querySelector('#resEventsCards [data-event-id="evt-2"]') as HTMLButtonElement).click();
    expect((document.querySelector("#resSelectedEventCover") as HTMLImageElement).src).toContain("sunset.jpg");
  });
});
