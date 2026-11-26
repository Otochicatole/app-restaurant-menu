import { Temporal } from "@js-temporal/polyfill";
import { BadRequestError } from "@/platform/application/errors";

export function validateTimeZone(value: string): string {
  try {
    const zone = value.trim();
    if (!zone || /^[+-]/.test(zone)) throw new Error();
    new Intl.DateTimeFormat("es", { timeZone: zone }).format();
    return zone;
  } catch { throw new BadRequestError("La zona horaria no es válida."); }
}

export function restaurantLocalDateTime(timeZone: string, now = new Date()): { date: string; time: string } {
  const local = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(validateTimeZone(timeZone));
  return { date: local.toPlainDate().toString(), time: local.toPlainTime().toString().slice(0, 5) };
}

export function restaurantToday(timeZone: string, now = new Date()): string {
  return restaurantLocalDateTime(timeZone, now).date;
}

export function calculateFloorInterval(input: {
  date: string; time: string; timeZone: string;
  event?: { date: string; startTime: string; endTime: string } | null;
  preparationMinutes?: number;
  durationMinutes?: number;
}) {
  const timeZone = validateTimeZone(input.timeZone);
  try {
    const date = input.event?.date ?? input.date;
    const time = input.event?.startTime ?? input.time;
    const startLocal = Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: "reject" });
    const start = startLocal.toZonedDateTime(timeZone, { disambiguation: "reject" }).toInstant();
    const duration = input.durationMinutes ?? 120;
    const prepMinutes = input.preparationMinutes ?? 15;
    let end = input.event ? start.add({ hours: 2 }) : start.add({ minutes: duration });
    if (input.event?.endTime) {
      if (input.event.endTime === time) throw new BadRequestError("El evento debe terminar después de comenzar.");
      let endLocal = Temporal.PlainDateTime.from(`${date}T${input.event.endTime}`, { overflow: "reject" });
      if (Temporal.PlainDateTime.compare(endLocal, startLocal) < 0) endLocal = endLocal.add({ days: 1 });
      end = endLocal.toZonedDateTime(timeZone, { disambiguation: "reject" }).toInstant();
    }
    const blockedFrom = input.event ? start.subtract({ hours: 2 }) : start.subtract({ minutes: prepMinutes });
    return {
      serviceStartAt: start.toString(), serviceEndAt: end.toString(),
      blockedFrom: blockedFrom.toString(), blockedUntil: end.toString(), timeZone,
    };
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("La fecha u hora no existe o es ambigua en la zona horaria del restaurante.");
  }
}
