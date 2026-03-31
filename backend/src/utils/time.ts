import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const ZONE = 'Europe/Helsinki';
export const SAME_DAY_BOOKING_LEAD_MINUTES = 30;

export function parseClientToUtc(input: string): Date {
  const hasTz = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(input);
  return hasTz ? new Date(input) : fromZonedTime(input, ZONE);
}

export const toUtc   = (localISO: string) => fromZonedTime(localISO, ZONE);
export const toLocal = (utcISO: string | Date) =>
  toZonedTime(typeof utcISO === 'string' ? new Date(utcISO) : utcISO, ZONE);

export function isSameClinicDay(aUtc: Date, bUtc: Date): boolean {
  const a = toLocal(aUtc);
  const b = toLocal(bUtc);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBeforeSameDayLeadTime(
  startUtc: Date,
  nowUtc: Date = new Date(),
  leadMinutes = SAME_DAY_BOOKING_LEAD_MINUTES
): boolean {
  if (!isSameClinicDay(startUtc, nowUtc)) {
    return false;
  }

  const earliestAllowed = nowUtc.getTime() + leadMinutes * 60_000;
  return startUtc.getTime() < earliestAllowed;
}

export const zone = ZONE;
