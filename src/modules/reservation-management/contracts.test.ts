import { describe, expect, it } from "vitest";
import { addBlockedDateSchema, publicAvailabilityQuerySchema, publicCreateTableReservationSchema, upsertRestaurantEventSchema } from "./contracts";

describe("reservation calendar contracts", () => {
  it.each(["2026-02-29", "2026-02-31", "2026-04-31", "2026-00-01", "2026-13-01", "0000-01-01"])("rejects a nonexistent civil date: %s", (date) => {
    expect(addBlockedDateSchema.safeParse({ date }).success).toBe(false);
    expect(publicAvailabilityQuerySchema.safeParse({ from: date }).success).toBe(false);
    expect(publicCreateTableReservationSchema.safeParse({ customerName: "Test", customerPhone: "12345678", date, time: "20:00" }).success).toBe(false);
  });

  it.each(["2024-02-29", "2000-02-29", "2026-12-31"])("accepts a valid civil date: %s", (date) => {
    expect(addBlockedDateSchema.safeParse({ date }).success).toBe(true);
  });

  it("accepts an omitted end time and validates a supplied end time", () => {
    const event = { title: "Cena", date: "2026-11-01", startTime: "20:00" };
    expect(upsertRestaurantEventSchema.parse(event).endTime).toBe("");
    expect(upsertRestaurantEventSchema.safeParse({ ...event, endTime: "23:30" }).success).toBe(true);
    expect(upsertRestaurantEventSchema.safeParse({ ...event, endTime: "99:99" }).success).toBe(false);
  });
});
