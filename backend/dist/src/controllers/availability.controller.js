"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableSlots = exports.getAvailabilityByVet = exports.deleteAvailability = exports.updateAvailability = exports.addAvailability = void 0;
exports.getClinicAvailableSlots = getClinicAvailableSlots;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const availability_1 = require("../services/availability");
//validation schema for manual availability enteries
const availabilitySchema = zod_1.z.object({
    day: zod_1.z.nativeEnum(client_1.Weekday),
    startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid startTime format (HH:mm)"),
    endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid endTime format (HH:mm)")
});
/**
 * VET creates an availability window
 */
const addAvailability = async (req, res) => {
    const { userId } = req.user;
    try {
        const user = await prismaClient_1.default.user.findUnique({
            where: { id: userId },
            select: { vetId: true },
        });
        if (!user?.vetId) {
            return res.status(400).json({ message: 'No vet profile linked to this account' });
        }
        const data = availabilitySchema.parse(req.body);
        const availability = await prismaClient_1.default.availability.create({
            data: {
                ...data,
                vetId: user.vetId
            }
        });
        res.status(201).json({ availability });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Failed to add availability' });
    }
};
exports.addAvailability = addAvailability;
const updateAvailability = async (req, res) => {
    const { userId } = req.user;
    const { availabilityId } = req.params;
    try {
        const user = await prismaClient_1.default.user.findUnique({
            where: { id: userId },
            select: { vetId: true },
        });
        if (!user?.vetId) {
            return res.status(400).json({ message: 'No vet profile linked to this account' });
        }
        const data = availabilitySchema.parse(req.body);
        const current = await prismaClient_1.default.availability.findUnique({
            where: { id: availabilityId },
            select: { id: true, vetId: true },
        });
        if (!current)
            return res.status(404).json({ message: 'Availability block not found' });
        if (current.vetId !== user.vetId)
            return res.status(403).json({ message: 'Not allowed' });
        const updated = await prismaClient_1.default.availability.update({
            where: { id: availabilityId },
            data: { ...data },
        });
        res.json({ availability: updated });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Failed to update availability' });
    }
};
exports.updateAvailability = updateAvailability;
const deleteAvailability = async (req, res) => {
    const { userId } = req.user;
    const { availabilityId } = req.params;
    const user = await prismaClient_1.default.user.findUnique({
        where: { id: userId },
        select: { vetId: true },
    });
    if (!user?.vetId) {
        return res.status(400).json({ message: 'No vet profile linked to this account' });
    }
    const current = await prismaClient_1.default.availability.findUnique({
        where: { id: availabilityId },
        select: { id: true, vetId: true },
    });
    if (!current)
        return res.status(404).json({ message: 'Availability block not found' });
    if (current.vetId !== user.vetId)
        return res.status(403).json({ message: 'Not allowed' });
    await prismaClient_1.default.availability.delete({ where: { id: availabilityId } });
    return res.status(204).send();
};
exports.deleteAvailability = deleteAvailability;
/**
 * Anyone can view raw availability entries for a vet
 */
const getAvailabilityByVet = async (req, res) => {
    const { vetId } = req.params;
    const slots = await prismaClient_1.default.availability.findMany({
        where: { vetId },
        orderBy: { day: 'asc' }
    });
    res.json({ availability: slots });
};
exports.getAvailabilityByVet = getAvailabilityByVet;
/**
 * GET /api/availability/vets/:vetId/available-slots
 * Returns conflict-free appointment start times for the given vet on a specified date.
 */
const getAvailableSlots = async (req, res) => {
    try {
        const { vetId } = req.params;
        const querySchema = zod_1.z.object({
            date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
        });
        const { date } = querySchema.parse(req.query);
        // Slot length is configured per clinic.
        const vet = await prismaClient_1.default.vet.findUnique({
            where: { id: vetId },
            select: { clinic: { select: { slotMinutes: true } } },
        });
        if (!vet) {
            return res.status(404).json({ message: `No vet found with id ${vetId}` });
        }
        const slotMinutes = vet.clinic.slotMinutes;
        const slots = await (0, availability_1.getSlotsForVetDay)({ vetId, date, slotMinutes });
        if (slots === undefined) {
            return res.status(404).json({ message: `No vet found with id ${vetId}` });
        }
        return res.json({ date, vetId, slotMinutes, slots });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch available slots' });
    }
};
exports.getAvailableSlots = getAvailableSlots;
const clinicSlotsQuery = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date, expected YYYY-MM-DD'),
    vetId: zod_1.z.string().uuid().optional(),
});
async function getClinicAvailableSlots(req, res) {
    try {
        const { clinicId } = req.params;
        const { date, vetId } = clinicSlotsQuery.parse(req.query);
        const clinic = await prismaClient_1.default.clinic.findUnique({
            where: { id: clinicId },
            select: { slotMinutes: true },
        });
        if (!clinic) {
            return res.status(404).json({ message: `No clinic found with id ${clinicId}` });
        }
        const slotMinutes = clinic.slotMinutes;
        const slotsByVet = await (0, availability_1.getClinicSlotsForDay)({ clinicId, date, slotMinutes, vetId });
        if (slotsByVet === undefined) {
            return res.status(404).json({ message: `No clinic found with id ${clinicId}` });
        }
        return res.json({ date, clinicId, slotMinutes, slotsByVet });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch clinic-wide slots' });
    }
}
