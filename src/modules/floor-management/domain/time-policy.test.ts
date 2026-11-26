import { describe, expect, it } from "vitest";
import { calculateFloorInterval, restaurantLocalDateTime, restaurantToday, validateTimeZone } from "./time-policy";

const zone = "America/Argentina/Buenos_Aires";

describe("restaurant floor time intervals", () => {
  it("converts local service time to UTC and reserves preparation buffer before service", () => {
    expect(calculateFloorInterval({ date: "2026-12-01", time: "20:00", timeZone: zone })).toEqual({
      serviceStartAt: "2026-12-01T23:00:00Z", serviceEndAt: "2026-12-02T01:00:00Z",
      blockedFrom: "2026-12-01T22:45:00Z", blockedUntil: "2026-12-02T01:00:00Z", timeZone: zone,
    });
    expect(calculateFloorInterval({ date: "2026-12-01", time: "20:00", timeZone: zone, preparationMinutes: 120 })).toEqual({
      serviceStartAt: "2026-12-01T23:00:00Z", serviceEndAt: "2026-12-02T01:00:00Z",
      blockedFrom: "2026-12-01T21:00:00Z", blockedUntil: "2026-12-02T01:00:00Z", timeZone: zone,
    });
  });

  it("keeps the service date while its preparation interval crosses local midnight", () => {
    const interval = calculateFloorInterval({ date: "2026-12-02", time: "00:30", timeZone: zone, preparationMinutes: 120 });
    expect(interval.serviceStartAt).toBe("2026-12-02T03:30:00Z");
    expect(interval.blockedFrom).toBe("2026-12-02T01:30:00Z");
  });

  it("uses the event's authoritative start and allows an overnight end", () => {
    const interval = calculateFloorInterval({ date: "2026-12-01", time: "18:00", timeZone: zone,
      event: { date: "2026-12-03", startTime: "23:30", endTime: "01:00" } });
    expect(interval.serviceStartAt).toBe("2026-12-04T02:30:00Z");
    expect(interval.serviceEndAt).toBe("2026-12-04T04:00:00Z");
    expect(interval.blockedFrom).toBe("2026-12-04T00:30:00Z");
  });

  it("uses the normal duration for an event without an explicit end", () => {
    const interval = calculateFloorInterval({ date: "2026-12-01", time: "18:00", timeZone: zone,
      event: { date: "2026-12-03", startTime: "20:00", endTime: "" } });
    expect(Date.parse(interval.serviceEndAt) - Date.parse(interval.serviceStartAt)).toBe(2 * 60 * 60 * 1000);
  });

  it.each([
    { date: "2026-03-08", time: "02:30" },
    { date: "2026-11-01", time: "01:30" },
  ])("rejects a nonexistent or ambiguous DST start: $date $time", (local) => {
    expect(() => calculateFloorInterval({ ...local, timeZone: "America/New_York" })).toThrow("no existe o es ambigua");
  });

  it("rejects an ambiguous DST event end", () => {
    expect(() => calculateFloorInterval({ date: "2026-11-01", time: "00:30", timeZone: "America/New_York",
      event: { date: "2026-11-01", startTime: "00:30", endTime: "01:30" } })).toThrow("no existe o es ambigua");
  });

  it("measures the default duration in elapsed hours across a DST transition", () => {
    const interval = calculateFloorInterval({ date: "2026-03-08", time: "01:30", timeZone: "America/New_York" });
    expect(interval.serviceStartAt).toBe("2026-03-08T06:30:00Z");
    expect(interval.serviceEndAt).toBe("2026-03-08T08:30:00Z");
  });

  it("rejects impossible dates and events whose end equals their start", () => {
    expect(() => calculateFloorInterval({ date: "2026-02-30", time: "20:00", timeZone: zone })).toThrow();
    expect(() => calculateFloorInterval({ date: "2026-12-01", time: "20:00", timeZone: zone,
      event: { date: "2026-12-01", startTime: "20:00", endTime: "20:00" } })).toThrow("terminar después");
  });

  it.each(["", "+03:00", "Mars/Olympus"])("rejects invalid or fixed offset zone %j", (timeZone) => {
    expect(() => validateTimeZone(timeZone)).toThrow("zona horaria");
  });

  it("computes today and current time in the restaurant's zone", () => {
    const now = new Date("2026-12-02T01:30:00Z");
    expect(restaurantToday(zone, now)).toBe("2026-12-01");
    expect(restaurantLocalDateTime(zone, now)).toEqual({ date: "2026-12-01", time: "22:30" });
    expect(validateTimeZone(` ${zone} `)).toBe(zone);
  });
});
