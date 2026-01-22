import { Request, Response } from 'express';
import prisma from '../config/prismaClient';
import { Weekday } from '@prisma/client';
import { z } from 'zod';
import {getSlotsForVetDay, getClinicSlotsForDay} from '../services/availability';

//validation schema for manual availability enteries
const availabilitySchema = z.object({
  day: z.nativeEnum(Weekday),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid startTime format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid endTime format (HH:mm)")
});

/**
 * VET creates an availability window
 */
export const addAvailability = async (req: Request, res: Response) => {
  const {userId} = (req as any).user;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vetId: true },
    });

    if (!user?.vetId) {
      return res.status(400).json({ message: 'No vet profile linked to this account' });
    }

    const data = availabilitySchema.parse(req.body);

    const availability = await prisma.availability.create({
      data: {
        ...data,
        vetId: user.vetId
      }
    });

    res.status(201).json({ availability });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: 'Failed to add availability' });
  }
};

/**
 * Anyone can view raw availability entries for a vet
 */
export const getAvailabilityByVet = async (req: Request, res: Response) => {
  const { vetId } = req.params;

  const slots = await prisma.availability.findMany({
    where: { vetId },
    orderBy: { day: 'asc' }
  });

  res.json({ availability: slots });
};

/**
 * GET /api/availability/vets/:vetId/available-slots
 * Returns conflict-free appointment start times for the given vet on a specified date.
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { vetId } = req.params;
    const querySchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
    });
    const { date } = querySchema.parse(req.query);

    const slotMinutes = 30;

    const slots = await getSlotsForVetDay({ vetId, date, slotMinutes });
    if (slots === undefined) {
      return res.status(404).json({ message: `No vet found with id ${vetId}` });
    }

    return res.json({ date, vetId, slotDuration: slotMinutes, slots });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch available slots' });
  }
};

const clinicSlotsQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date, expected YYYY-MM-DD'),
  vetId: z.string().uuid().optional(),
});

export async function getClinicAvailableSlots(req: Request, res: Response) {
  try {
    const { clinicId } = req.params;
    const { date, vetId } = clinicSlotsQuery.parse(req.query);

    const slotMinutes = 30;

    const slotsByVet = await getClinicSlotsForDay({ clinicId, date, slotMinutes, vetId });
    if (slotsByVet === undefined) {
      return res.status(404).json({ message: `No clinic found with id ${clinicId}` });
    }

    return res.json({ date, clinicId, slotDuration: slotMinutes, slotsByVet });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch clinic-wide slots' });
  }
}