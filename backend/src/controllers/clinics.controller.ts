import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';


const clinicSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  zipCode: z.string(),
  emergency: z.boolean()
});

export const createClinic = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const data = clinicSchema.parse(req.body);

    const clinic = await prisma.clinic.create({ data });

    await prisma.user.update({
      where: { id: userId },
      data: { clinicId: clinic.id }
    });

    res.status(201).json({ message: 'Clinic registered', clinic });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: 'Failed to register clinic' });
  }
};

export const getClinics = async (_: Request, res: Response) => {
  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json({ clinics });
};

export const getClinicById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clinic = await prisma.clinic.findUnique({ where: { id } });

  if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

  res.json({ clinic });
};