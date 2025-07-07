import { Request, Response } from 'express';
import prisma from '../config/prismaClient';
import { Weekday } from '@prisma/client';
import { z } from 'zod';
import {getSlotsForVetDay} from '../services/availability';

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
  const vetUser = (req as any).user;

  try {
    const vet = await prisma.user.findUnique({
      where: { id: vetUser.userId },
      include: { vetProfile: true }
    });

    if (!vet?.vetProfile?.id) {
      return res.status(400).json({ message: 'No vet profile linked to this account' });
    }

    const data = availabilitySchema.parse(req.body);

    const availability = await prisma.availability.create({
      data: {
        ...data,
        vetId: vet.vetProfile.id
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
      duration: z.preprocess(val => val ? Number(val) : undefined, z.number().int().default(30))
        .refine(d => [15, 30, 45, 60].includes(d), 'duration must be one of 15, 30, 45, 60'),
    });
    const { date, duration } = querySchema.parse(req.query);

    const slots = await getSlotsForVetDay({ vetId, date, duration });
    if (slots === undefined) {
      return res.status(404).json({ message: `No vet found with id ${vetId}` });
    }

    return res.json({ date, vetId, slotDuration: duration, slots });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch available slots' });
  }
};