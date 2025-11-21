import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';


const ZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'Europe/Helsinki';


export function serverUtcToLocalLabel(utcIso: string, pattern = "yyyy-MM-dd HH:mm") {
const zoned = toZonedTime(parseISO(utcIso), ZONE);
return format(zoned, pattern);
}


// For booking: convert a local date (selected by user on a day) + HH:mm to UTC ISO
export function localDateTimeToUtcIso(dateYYYYMMDD: string, hhmm: string): string {
const local = new Date(`${dateYYYYMMDD}T${hhmm}:00`);
const utc = fromZonedTime(local, ZONE);
return utc.toISOString();
}