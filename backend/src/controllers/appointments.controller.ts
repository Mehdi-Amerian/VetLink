import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';
import { parseClientToUtc } from '../utils/time';

const OVERLAP_CONSTRAINT = 'Appointment_no_overlapping_active_vet_slots';

function isOverlapConstraintError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;

  if (err.code !== 'P2004' && err.code !== 'P2010') return false;

  const meta = (err.meta ?? {}) as Record<string, unknown>;
  const candidates: string[] = [];

  if (typeof meta.database_error === 'string') candidates.push(meta.database_error);
  if (typeof meta.constraint === 'string') candidates.push(meta.constraint);
  if (typeof meta.target === 'string') candidates.push(meta.target);
  if (Array.isArray(meta.target)) candidates.push(...meta.target.map((v) => String(v)));

  candidates.push(err.message);

  return candidates.some((v) => v.includes(OVERLAP_CONSTRAINT));
}

// 1) Validate input
const appointmentSchema = z.object({
  date: z.string().refine((str) => !isNaN(Date.parse(str)), {
    message: 'Invalid ISO date string',
  }),
  reason: z.string().min(1).max(500),
  emergency: z.boolean().optional().default(false),
  petId: z.string().uuid(),
  clinicId: z.string().uuid(),
  vetId: z.string().uuid(),
});

export const createAppointment = async (req: Request, res: Response) => {
  const user = (req as any).user as { userId: string; role: string };
  if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = appointmentSchema.parse(req.body);

    // Determine slot length (per clinic, default 30 mins)
    const clinic = await prisma.clinic.findUnique({
      where: { id: data.clinicId },
      select: { id: true, slotMinutes: true },
    });

    if (!clinic) {
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found.' });
    }

    const slotMinutes = clinic.slotMinutes ?? 30;

    const start = parseClientToUtc(data.date);
    const end = new Date(start.getTime() + slotMinutes * 60_000);

    // Owner can only book for their own pet
    const pet = await prisma.pet.findUnique({ where: { id: data.petId } });
    if (!pet || pet.isDeleted || pet.ownerId !== user.userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not own this pet.' });
    }

    // Vet must exist and belong to provided clinic
    const vet = await prisma.vet.findUnique({
      where: { id: data.vetId },
      select: { id: true, clinicId: true },
    });
    if (!vet) return res.status(404).json({ error: 'Not Found', message: 'Vet not found.' });
    if (vet.clinicId !== data.clinicId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Vet does not belong to provided clinic.' });
    }

    // Optimistic conflict check for a faster 409 before DB write.
    const conflict = await prisma.appointment.findFirst({
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

    const created = await prisma.appointment.create({
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
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
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

export const getMyAppointments = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const appointments = await prisma.appointment.findMany({
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

export const getAppointmentsForVet = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vetId: true },
  });

  if (!user?.vetId) {
    return res.status(403).json({ message: 'No vet profile linked to this user' });
  }

  const appointments = await prisma.appointment.findMany({
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

// soft-cancel appointment
export const cancelAppointment = async (req: Request, res: Response) => {
  const { userId, role, vetId: tokenVetId } = (req as any).user;
  const appointmentId = req.params.id;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, ownerId: true, vetId: true, cancelledAt: true },
  });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (appt.cancelledAt) return res.status(200).json({ message: 'Already cancelled' });

  const isOwner = role === 'OWNER' && appt.ownerId === userId;
  const isVet = role === 'VET' && appt.vetId === tokenVetId;
  const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN';

  if (!isOwner && !isVet && !isAdmin) {
    return res.status(403).json({ message: 'Not authorized to cancel' });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { cancelledAt: new Date() },
  });

  return res.json({ message: 'Cancelled', appointment: updated });
};

// reschedule appointment
export const updateAppointmentTime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bodySchema = z.object({
      date: z.string().refine((str) => !isNaN(Date.parse(str)), { message: 'Invalid ISO date string' }),
    });
    const { date } = bodySchema.parse(req.body);

    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, ownerId: true, clinicId: true, vetId: true, cancelledAt: true },
    });
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (appt.cancelledAt) return res.status(400).json({ message: 'Cannot reschedule a cancelled appointment' });

    if (appt.ownerId !== (req as any).user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: appt.clinicId },
      select: { slotMinutes: true },
    });
    const slotMinutes = clinic?.slotMinutes ?? 30;

    const newStart = parseClientToUtc(date);
    const newEnd = new Date(newStart.getTime() + slotMinutes * 60_000);

    const overlap = await prisma.appointment.findFirst({
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

    const updated = await prisma.appointment.update({
      where: { id },
      data: { date: newStart, endTime: newEnd },
    });

    return res.json({ appointment: updated });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.flatten() });
    }

    if (isOverlapConstraintError(err)) {
      return res.status(409).json({ message: 'Overlaps an existing booking' });
    }

    console.error('[appointments] update error', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
