import { Weekday } from '@prisma/client';
import { addDays, addMinutes, getISODay, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import { prisma } from '../config/prismaClient';
import { isBeforeSameDayLeadTime, parseClientToUtc, zone } from '../utils/time';

type AvailabilityInput = {
  vetId: string;
  day: Weekday;
  startTime: string;
  endTime: string;
};

export async function createAvailabilityService(input: AvailabilityInput) {
  return prisma.availability.create({ data: input });
}

export async function listAvailabilityService(vetId: string) {
  return prisma.availability.findMany({
    where: { vetId },
    orderBy: { day: 'asc' },
  });
}

export async function updateAvailabilityService(id: string, data: Partial<AvailabilityInput>) {
  return prisma.availability.update({
    where: { id },
    data,
  });
}

export async function deleteAvailabilityService(id: string) {
  return prisma.availability.delete({ where: { id } });
}

interface GetSlotsParams {
  vetId: string;
  date: string;
  slotMinutes: number;
}

/**
 * Generate conflict-free appointment start times for a vet on a given date.
 * Returns `undefined` if the vet does not exist, otherwise an array of `HH:mm` slots.
 */
export async function getSlotsForVetDay({
  vetId,
  date,
  slotMinutes,
}: GetSlotsParams): Promise<string[] | undefined> {
  const parsedDay = parseISO(date);
  if (Number.isNaN(parsedDay.getTime())) {
    throw new Error('Invalid date');
  }

  const isoDay = getISODay(parsedDay);
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

  const vet = await prisma.vet.findUnique({
    where: { id: vetId },
    select: {
      availability: {
        where: { day: targetDay },
        select: { startTime: true, endTime: true },
      },
    },
  });

  if (!vet) return undefined;

  const candidates: Date[] = [];
  for (const { startTime, endTime } of vet.availability) {
    const startLocal = `${date}T${startTime}:00`;
    const endLocal = `${date}T${endTime}:00`;

    let cursor = parseClientToUtc(startLocal);
    const windowEnd = parseClientToUtc(endLocal);

    while (addMinutes(cursor, slotMinutes) <= windowEnd) {
      candidates.push(cursor);
      cursor = addMinutes(cursor, slotMinutes);
    }
  }

  if (candidates.length === 0) return [];

  const dayStart = parseClientToUtc(`${date}T00:00:00`);
  const dayEnd = addDays(dayStart, 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      vetId,
      cancelledAt: null,
      date: { gte: dayStart, lt: dayEnd },
    },
    select: { date: true, endTime: true },
  });

  const free = candidates.filter((start) => {
    const end = addMinutes(start, slotMinutes);

    const overlaps = appointments.some((appointment) => appointment.date < end && appointment.endTime > start);
    if (overlaps) return false;

    if (isBeforeSameDayLeadTime(start)) return false;

    return true;
  });

  return Array.from(
    new Set(
      free
        .map((dateValue) => formatInTimeZone(dateValue, zone, 'HH:mm'))
        .sort((a, b) => a.localeCompare(b))
    )
  );
}

interface ClinicSlotsParams {
  clinicId: string;
  date: string;
  slotMinutes: number;
  vetId?: string;
}

/**
 * Returns vetId -> free `HH:mm` slots for every vet in a clinic.
 * Returns undefined if the clinic does not exist.
 */
export async function getClinicSlotsForDay({
  clinicId,
  date,
  slotMinutes,
  vetId,
}: ClinicSlotsParams): Promise<Record<string, string[]> | undefined> {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
  if (!clinic) return undefined;

  const vets = await prisma.vet.findMany({
    where: { clinicId, ...(vetId ? { id: vetId } : {}) },
    select: { id: true },
  });

  if (vets.length === 0) {
    return {};
  }

  const result: Record<string, string[]> = {};

  await Promise.all(
    vets.map(async (vet) => {
      const slots = await getSlotsForVetDay({
        vetId: vet.id,
        date,
        slotMinutes,
      });
      result[vet.id] = slots ?? [];
    })
  );

  return result;
}
