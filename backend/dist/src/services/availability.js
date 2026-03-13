"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAvailabilityService = createAvailabilityService;
exports.listAvailabilityService = listAvailabilityService;
exports.updateAvailabilityService = updateAvailabilityService;
exports.deleteAvailabilityService = deleteAvailabilityService;
exports.getSlotsForVetDay = getSlotsForVetDay;
exports.getClinicSlotsForDay = getClinicSlotsForDay;
const prismaClient_1 = require("../config/prismaClient");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
async function createAvailabilityService(input) {
    return prismaClient_1.prisma.availability.create({ data: input });
}
async function listAvailabilityService(vetId) {
    return prismaClient_1.prisma.availability.findMany({
        where: { vetId },
        orderBy: { day: 'asc' }
    });
}
async function updateAvailabilityService(id, data) {
    return prismaClient_1.prisma.availability.update({
        where: { id },
        data
    });
}
async function deleteAvailabilityService(id) {
    return prismaClient_1.prisma.availability.delete({ where: { id } });
}
/**
 * Generate conflict-free appointment start times for a vet on a given date.
 * Returns `undefined` if the vet doesn’t exist, or an array of "HH:mm" slots.
 */
async function getSlotsForVetDay({ vetId, date, slotMinutes, }) {
    const baseDate = (0, date_fns_1.parseISO)(date);
    if (isNaN(baseDate.getTime()))
        throw new Error('Invalid date');
    // Map JS ISO day (1–7) to our Weekday enum
    const isoDay = (0, date_fns_1.getISODay)(baseDate);
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
    // 1) fetch that vet’s availability for the day
    const vet = await prismaClient_1.prisma.vet.findUnique({
        where: { id: vetId },
        select: {
            availability: {
                where: { day: targetDay },
                select: { startTime: true, endTime: true }
            }
        }
    });
    if (!vet)
        return undefined;
    // 2) carve out candidate slots in each availability window
    const candidates = [];
    for (const { startTime, endTime } of vet.availability) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        let cursor = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(baseDate, sh), sm);
        const windowEnd = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(baseDate, eh), em);
        while ((0, date_fns_1.addMinutes)(cursor, slotMinutes) <= windowEnd) {
            candidates.push(cursor);
            cursor = (0, date_fns_1.addMinutes)(cursor, slotMinutes);
        }
    }
    if (candidates.length === 0)
        return [];
    // 3) fetch all non-cancelled appointments that day
    const dayStart = baseDate;
    const dayEnd = (0, date_fns_1.addDays)(baseDate, 1);
    const appointments = await prismaClient_1.prisma.appointment.findMany({
        where: {
            vetId,
            date: { gte: dayStart, lt: dayEnd }
        },
        select: { date: true, endTime: true }
    });
    // 4) filter out any candidate that overlaps an existing appt
    const free = candidates.filter(start => {
        const end = (0, date_fns_1.addMinutes)(start, slotMinutes);
        return !appointments.some(a => a.date < end && a.endTime > start);
    });
    // 5) format, dedupe, sort
    return Array.from(new Set(free.map(d => (0, date_fns_1.format)(d, 'HH:mm')))).sort();
}
/**
 * Returns a map of vetId → free HH:mm slots for every vet in a clinic (optionally filtered to one vet).
 * Returns undefined if the clinic doesn’t exist.
 */
async function getClinicSlotsForDay({ clinicId, date, slotMinutes, vetId }) {
    // 1) Verify clinic exists
    const clinic = await prismaClient_1.prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
    if (!clinic)
        return undefined;
    // 2) Fetch all vets in that clinic (optionally filter by vetId)
    const vets = await prismaClient_1.prisma.vet.findMany({
        where: { clinicId, ...(vetId ? { id: vetId } : {}) },
        select: { id: true }
    });
    if (vets.length === 0) {
        // No vets → empty result
        return {};
    }
    // 3) For each vet, get their slots
    const result = {};
    await Promise.all(vets.map(async (v) => {
        const slots = await getSlotsForVetDay({ vetId: v.id, date, slotMinutes });
        // getSlotsForVetDay returning [] means “no availability”, 
        // undefined only if vetId invalid—but here vets came from DB
        result[v.id] = slots || [];
    }));
    return result;
}
