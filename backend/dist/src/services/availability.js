"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAvailabilityService = createAvailabilityService;
exports.listAvailabilityService = listAvailabilityService;
exports.updateAvailabilityService = updateAvailabilityService;
exports.deleteAvailabilityService = deleteAvailabilityService;
exports.getSlotsForVetDay = getSlotsForVetDay;
exports.getClinicSlotsForDay = getClinicSlotsForDay;
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const prismaClient_1 = require("../config/prismaClient");
const time_1 = require("../utils/time");
async function createAvailabilityService(input) {
    return prismaClient_1.prisma.availability.create({ data: input });
}
async function listAvailabilityService(vetId) {
    return prismaClient_1.prisma.availability.findMany({
        where: { vetId },
        orderBy: { day: 'asc' },
    });
}
async function updateAvailabilityService(id, data) {
    return prismaClient_1.prisma.availability.update({
        where: { id },
        data,
    });
}
async function deleteAvailabilityService(id) {
    return prismaClient_1.prisma.availability.delete({ where: { id } });
}
/**
 * Generate conflict-free appointment start times for a vet on a given date.
 * Returns `undefined` if the vet does not exist, otherwise an array of `HH:mm` slots.
 */
async function getSlotsForVetDay({ vetId, date, slotMinutes, }) {
    const parsedDay = (0, date_fns_1.parseISO)(date);
    if (Number.isNaN(parsedDay.getTime())) {
        throw new Error('Invalid date');
    }
    const isoDay = (0, date_fns_1.getISODay)(parsedDay);
    const weekdayMap = {
        1: client_1.Weekday.MONDAY,
        2: client_1.Weekday.TUESDAY,
        3: client_1.Weekday.WEDNESDAY,
        4: client_1.Weekday.THURSDAY,
        5: client_1.Weekday.FRIDAY,
        6: client_1.Weekday.SATURDAY,
        7: client_1.Weekday.SUNDAY,
    };
    const targetDay = weekdayMap[isoDay];
    const vet = await prismaClient_1.prisma.vet.findUnique({
        where: { id: vetId },
        select: {
            availability: {
                where: { day: targetDay },
                select: { startTime: true, endTime: true },
            },
        },
    });
    if (!vet)
        return undefined;
    const candidates = [];
    for (const { startTime, endTime } of vet.availability) {
        const startLocal = `${date}T${startTime}:00`;
        const endLocal = `${date}T${endTime}:00`;
        let cursor = (0, time_1.parseClientToUtc)(startLocal);
        const windowEnd = (0, time_1.parseClientToUtc)(endLocal);
        while ((0, date_fns_1.addMinutes)(cursor, slotMinutes) <= windowEnd) {
            candidates.push(cursor);
            cursor = (0, date_fns_1.addMinutes)(cursor, slotMinutes);
        }
    }
    if (candidates.length === 0)
        return [];
    const dayStart = (0, time_1.parseClientToUtc)(`${date}T00:00:00`);
    const dayEnd = (0, date_fns_1.addDays)(dayStart, 1);
    const appointments = await prismaClient_1.prisma.appointment.findMany({
        where: {
            vetId,
            cancelledAt: null,
            date: { gte: dayStart, lt: dayEnd },
        },
        select: { date: true, endTime: true },
    });
    const free = candidates.filter((start) => {
        const end = (0, date_fns_1.addMinutes)(start, slotMinutes);
        const overlaps = appointments.some((appointment) => appointment.date < end && appointment.endTime > start);
        if (overlaps)
            return false;
        if ((0, time_1.isBeforeSameDayLeadTime)(start))
            return false;
        return true;
    });
    return Array.from(new Set(free
        .map((dateValue) => (0, date_fns_tz_1.formatInTimeZone)(dateValue, time_1.zone, 'HH:mm'))
        .sort((a, b) => a.localeCompare(b))));
}
/**
 * Returns vetId -> free `HH:mm` slots for every vet in a clinic.
 * Returns undefined if the clinic does not exist.
 */
async function getClinicSlotsForDay({ clinicId, date, slotMinutes, vetId, }) {
    const clinic = await prismaClient_1.prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
    if (!clinic)
        return undefined;
    const vets = await prismaClient_1.prisma.vet.findMany({
        where: { clinicId, ...(vetId ? { id: vetId } : {}) },
        select: { id: true },
    });
    if (vets.length === 0) {
        return {};
    }
    const result = {};
    await Promise.all(vets.map(async (vet) => {
        const slots = await getSlotsForVetDay({
            vetId: vet.id,
            date,
            slotMinutes,
        });
        result[vet.id] = slots ?? [];
    }));
    return result;
}
