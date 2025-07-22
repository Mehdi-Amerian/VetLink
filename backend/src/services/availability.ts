import { prisma } from '../config/prismaClient';
import { parseISO, getISODay, setHours, setMinutes, addMinutes, format, addDays } from 'date-fns';
import { Weekday } from '@prisma/client';

type AvailabilityInput = {
  vetId: string;
  day: Weekday;
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
};

export async function createAvailabilityService(input: AvailabilityInput) {
  return prisma.availability.create({ data: input });
}

export async function listAvailabilityService(vetId: string) {
  return prisma.availability.findMany({
    where: { vetId },
    orderBy: { day: 'asc' }
  });
}

export async function updateAvailabilityService(id: string, data: Partial<AvailabilityInput>) {
  return prisma.availability.update({
    where: { id },
    data
  });
}

export async function deleteAvailabilityService(id: string) {
  return prisma.availability.delete({ where: { id } });
}

interface GetSlotsParams {
  vetId: string;
  date: string;       // "YYYY-MM-DD"
  duration: number;   // minutes
}

/**
 * Generate conflict-free appointment start times for a vet on a given date.
 * Returns `undefined` if the vet doesn’t exist, or an array of "HH:mm" slots.
 */
export async function getSlotsForVetDay({
  vetId,
  date,
  duration
}: GetSlotsParams): Promise<string[]|undefined> {
  const baseDate = parseISO(date);
  if (isNaN(baseDate.getTime())) throw new Error('Invalid date');

  // Map JS ISO day (1–7) to our Weekday enum
  const isoDay = getISODay(baseDate);
  const weekdayMap: Record<number, Weekday> = {
    1: Weekday.MONDAY,
    2: Weekday.TUESDAY,
    3: Weekday.WEDNESDAY,
    4: Weekday.THURSDAY,
    5: Weekday.FRIDAY,
    6: Weekday.SATURDAY,
    7: Weekday.SUNDAY,
  };
  const targetDay = weekdayMap[isoDay];

  // 1) fetch that vet’s availability for the day
  const vet = await prisma.vet.findUnique({
    where: { id: vetId },
    select: {
      availability: {
        where: { day: targetDay },
        select: { startTime: true, endTime: true }
      }
    }
  });
  if (!vet) return undefined;

  // 2) carve out candidate slots in each availability window
  const candidates: Date[] = [];
  for (const { startTime, endTime } of vet.availability) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    let cursor = setMinutes(setHours(baseDate, sh), sm);
    const windowEnd = setMinutes(setHours(baseDate, eh), em);

    while (addMinutes(cursor, duration) <= windowEnd) {
      candidates.push(cursor);
      cursor = addMinutes(cursor, duration);
    }
  }
  if (candidates.length === 0) return [];

  // 3) fetch all non-cancelled appointments that day
  const dayStart = baseDate;
  const dayEnd = addDays(baseDate, 1);
  const appointments = await prisma.appointment.findMany({
    where: {
      vetId,
      status: { not: 'CANCELLED' },
      date: { gte: dayStart, lt: dayEnd }
    },
    select: { date: true, endTime: true }
  });

  // 4) filter out any candidate that overlaps an existing appt
  const free = candidates.filter(start => {
    const end = addMinutes(start, duration);
    return !appointments.some(a =>
      a.date < end && a.endTime > start
    );
  });

  // 5) format, dedupe, sort
  return Array.from(new Set(
    free.map(d => format(d, 'HH:mm'))
  )).sort();
}

interface ClinicSlotsParams {
  clinicId: string;
  date: string;
  duration: number;
  vetId?: string;
}

/**
 * Returns a map of vetId → free HH:mm slots for every vet in a clinic (optionally filtered to one vet).
 * Returns undefined if the clinic doesn’t exist.
 */
export async function getClinicSlotsForDay({
  clinicId, date, duration, vetId
}: ClinicSlotsParams): Promise<Record<string, string[]> | undefined> {
  // 1) Verify clinic exists
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
  if (!clinic) return undefined;

  // 2) Fetch all vets in that clinic (optionally filter by vetId)
  const vets = await prisma.vet.findMany({
    where: { clinicId, ...(vetId ? { id: vetId } : {}) },
    select: { id: true }
  });
  if (vets.length === 0) {
    // No vets → empty result
    return {};
  }

  // 3) For each vet, get their slots
  const result: Record<string, string[]> = {};
  await Promise.all(vets.map(async v => {
    const slots = await getSlotsForVetDay({ vetId: v.id, date, duration });
    // getSlotsForVetDay returning [] means “no availability”, 
    // undefined only if vetId invalid—but here vets came from DB
    result[v.id] = slots || [];
  }));

  return result;
}