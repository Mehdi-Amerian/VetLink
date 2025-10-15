import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const ZONE = 'Europe/Helsinki';

export function parseClientToUtc(input: string): Date {
  const hasTz = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(input);
  return hasTz ? new Date(input) : fromZonedTime(input, ZONE);
}

export const toUtc   = (localISO: string) => fromZonedTime(localISO, ZONE);
export const toLocal = (utcISO: string | Date) =>
  toZonedTime(typeof utcISO === 'string' ? new Date(utcISO) : utcISO, ZONE);

export const zone = ZONE;
