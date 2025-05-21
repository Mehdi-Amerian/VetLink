import { Request, Response } from 'express';
import { PrismaClient, Weekday } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const availabilitySchema = z.object({
  day: z.nativeEnum(Weekday),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid startTime format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid endTime format (HH:mm)")
});

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

export const getAvailabilityByVet = async (req: Request, res: Response) => {
  const { vetId } = req.params;

  const slots = await prisma.availability.findMany({
    where: { vetId },
    orderBy: { day: 'asc' }
  });

  res.json({ availability: slots });
};