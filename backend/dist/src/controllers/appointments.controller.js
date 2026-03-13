"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointmentTime = exports.cancelAppointment = exports.getAppointmentsForVet = exports.getMyAppointments = exports.createAppointment = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const time_1 = require("../utils/time");
const OVERLAP_CONSTRAINT = 'Appointment_no_overlapping_active_vet_slots';
function isOverlapConstraintError(err) {
    if (!(err instanceof client_1.Prisma.PrismaClientKnownRequestError))
        return false;
    if (err.code !== 'P2004' && err.code !== 'P2010')
        return false;
    const meta = (err.meta ?? {});
    const candidates = [];
    if (typeof meta.database_error === 'string')
        candidates.push(meta.database_error);
    if (typeof meta.constraint === 'string')
        candidates.push(meta.constraint);
    if (typeof meta.target === 'string')
        candidates.push(meta.target);
    if (Array.isArray(meta.target))
        candidates.push(...meta.target.map((v) => String(v)));
    candidates.push(err.message);
    return candidates.some((v) => v.includes(OVERLAP_CONSTRAINT));
}
function isPastDayInClinicZone(value) {
    const selectedDay = (0, time_1.toLocal)(value);
    selectedDay.setHours(0, 0, 0, 0);
    const today = (0, time_1.toLocal)(new Date());
    today.setHours(0, 0, 0, 0);
    return selectedDay.getTime() < today.getTime();
}
// 1) Validate input
const appointmentSchema = zod_1.z.object({
    date: zod_1.z.string().refine((str) => !isNaN(Date.parse(str)), {
        message: 'Invalid ISO date string',
    }),
    reason: zod_1.z.string().min(1).max(500),
    emergency: zod_1.z.boolean().optional().default(false),
    petId: zod_1.z.string().uuid(),
    clinicId: zod_1.z.string().uuid(),
    vetId: zod_1.z.string().uuid(),
});
const createAppointment = async (req, res) => {
    const user = req.user;
    if (!user?.userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const data = appointmentSchema.parse(req.body);
        // Determine slot length (per clinic, default 30 mins)
        const clinic = await prismaClient_1.prisma.clinic.findUnique({
            where: { id: data.clinicId },
            select: { id: true, slotMinutes: true },
        });
        if (!clinic) {
            return res.status(404).json({ error: 'Not Found', message: 'Clinic not found.' });
        }
        const slotMinutes = clinic.slotMinutes ?? 30;
        const start = (0, time_1.parseClientToUtc)(data.date);
        if (isPastDayInClinicZone(start)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Appointment date cannot be in the past.',
            });
        }
        const end = new Date(start.getTime() + slotMinutes * 60000);
        // Owner can only book for their own pet
        const pet = await prismaClient_1.prisma.pet.findUnique({ where: { id: data.petId } });
        if (!pet || pet.isDeleted || pet.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You do not own this pet.' });
        }
        // Vet must exist and belong to provided clinic
        const vet = await prismaClient_1.prisma.vet.findUnique({
            where: { id: data.vetId },
            select: { id: true, clinicId: true },
        });
        if (!vet)
            return res.status(404).json({ error: 'Not Found', message: 'Vet not found.' });
        if (vet.clinicId !== data.clinicId) {
            return res.status(400).json({ error: 'Bad Request', message: 'Vet does not belong to provided clinic.' });
        }
        // Optimistic conflict check for a faster 409 before DB write.
        const conflict = await prismaClient_1.prisma.appointment.findFirst({
            where: {
                vetId: data.vetId,
                cancelledAt: null,
                date: { lt: end },
                endTime: { gt: start },
            },
            select: { id: true, date: true, endTime: true },
        });
        if (conflict) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Time slot overlaps an existing appointment.',
                existing: conflict,
            });
        }
        const created = await prismaClient_1.prisma.appointment.create({
            data: {
                date: start,
                endTime: end,
                reason: data.reason,
                emergency: !!data.emergency,
                petId: data.petId,
                clinicId: data.clinicId,
                vetId: data.vetId,
                ownerId: user.userId,
                cancelledAt: null,
            },
            include: {
                pet: { select: { id: true, name: true, species: true } },
                vet: { select: { id: true, name: true } },
                clinic: { select: { id: true, name: true } },
            },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Bad Request', details: err.flatten() });
        }
        if (isOverlapConstraintError(err)) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Time slot overlaps an existing appointment.',
            });
        }
        console.error('[appointments] create error', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createAppointment = createAppointment;
const getMyAppointments = async (req, res) => {
    const userId = req.user.userId;
    const appointments = await prismaClient_1.prisma.appointment.findMany({
        where: { ownerId: userId },
        include: {
            pet: true,
            vet: true,
            clinic: true,
        },
        orderBy: { date: 'asc' },
    });
    res.json({ appointments });
};
exports.getMyAppointments = getMyAppointments;
const getAppointmentsForVet = async (req, res) => {
    const userId = req.user.userId;
    const user = await prismaClient_1.prisma.user.findUnique({
        where: { id: userId },
        select: { vetId: true },
    });
    if (!user?.vetId) {
        return res.status(403).json({ message: 'No vet profile linked to this user' });
    }
    const appointments = await prismaClient_1.prisma.appointment.findMany({
        where: { vetId: user.vetId },
        include: {
            pet: true,
            owner: true,
            clinic: true,
        },
        orderBy: { date: 'asc' },
    });
    res.json({ appointments });
};
exports.getAppointmentsForVet = getAppointmentsForVet;
// soft-cancel appointment
const cancelAppointment = async (req, res) => {
    const { userId, role, vetId: tokenVetId } = req.user;
    const appointmentId = req.params.id;
    const appt = await prismaClient_1.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, ownerId: true, vetId: true, cancelledAt: true },
    });
    if (!appt)
        return res.status(404).json({ message: 'Appointment not found' });
    if (appt.cancelledAt)
        return res.status(200).json({ message: 'Already cancelled' });
    const isOwner = role === 'OWNER' && appt.ownerId === userId;
    const isVet = role === 'VET' && appt.vetId === tokenVetId;
    const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';
    if (!isOwner && !isVet && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to cancel' });
    }
    const updated = await prismaClient_1.prisma.appointment.update({
        where: { id: appointmentId },
        data: { cancelledAt: new Date() },
    });
    return res.json({ message: 'Cancelled', appointment: updated });
};
exports.cancelAppointment = cancelAppointment;
// reschedule appointment
const updateAppointmentTime = async (req, res) => {
    try {
        const { id } = req.params;
        const bodySchema = zod_1.z.object({
            date: zod_1.z.string().refine((str) => !isNaN(Date.parse(str)), { message: 'Invalid ISO date string' }),
        });
        const { date } = bodySchema.parse(req.body);
        const appt = await prismaClient_1.prisma.appointment.findUnique({
            where: { id },
            select: { id: true, ownerId: true, clinicId: true, vetId: true, cancelledAt: true },
        });
        if (!appt)
            return res.status(404).json({ message: 'Not found' });
        if (appt.cancelledAt)
            return res.status(400).json({ message: 'Cannot reschedule a cancelled appointment' });
        if (appt.ownerId !== req.user.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const clinic = await prismaClient_1.prisma.clinic.findUnique({
            where: { id: appt.clinicId },
            select: { slotMinutes: true },
        });
        const slotMinutes = clinic?.slotMinutes ?? 30;
        const newStart = (0, time_1.parseClientToUtc)(date);
        if (isPastDayInClinicZone(newStart)) {
            return res.status(400).json({ message: 'Appointment date cannot be in the past' });
        }
        const newEnd = new Date(newStart.getTime() + slotMinutes * 60000);
        const overlap = await prismaClient_1.prisma.appointment.findFirst({
            where: {
                vetId: appt.vetId,
                id: { not: id },
                cancelledAt: null,
                AND: [{ date: { lt: newEnd } }, { endTime: { gt: newStart } }],
            },
            select: { id: true },
        });
        if (overlap) {
            return res.status(409).json({ message: 'Overlaps an existing booking' });
        }
        const updated = await prismaClient_1.prisma.appointment.update({
            where: { id },
            data: { date: newStart, endTime: newEnd },
        });
        return res.json({ appointment: updated });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.flatten() });
        }
        if (isOverlapConstraintError(err)) {
            return res.status(409).json({ message: 'Overlaps an existing booking' });
        }
        console.error('[appointments] update error', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updateAppointmentTime = updateAppointmentTime;
