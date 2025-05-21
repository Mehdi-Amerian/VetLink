import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const vetSchema = z.object({
  name: z.string(),
  specialization: z.string().optional()
});

export const createVet = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const clinicAdmin = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true }
    });

    if (!clinicAdmin?.clinicId) {
      return res.status(400).json({ message: 'You are not linked to any clinic' });
    }

    const data = vetSchema.parse(req.body);

    const vet = await prisma.vet.create({
      data: {
        name: data.name,
        specialization: data.specialization,
        clinicId: clinicAdmin.clinicId
      }
    });

    res.status(201).json({ vet });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: 'Failed to create vet' });
  }
};

export const getVets = async (req: Request, res: Response) => {
  const { clinicId } = req.query;

  const vets = await prisma.vet.findMany({
    where: clinicId ? { clinicId: String(clinicId) } : {},
    orderBy: { createdAt: 'desc' }
  });

  res.json({ vets });
};

export const getVetById = async (req: Request, res: Response) => {
  const vet = await prisma.vet.findUnique({
    where: { id: req.params.id }
  });

  if (!vet) {
    return res.status(404).json({ message: 'Vet not found' });
  }

  res.json({ vet });
};
