import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';

const vetProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  specialization: z.string().max(200).optional().nullable(),
});

export const updateMyVetProfile = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  if (role !== 'VET') {
    return res.status(403).json({ message: 'Only vets can update their profile' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vetId: true },
  });

  if (!user?.vetId) {
    return res.status(400).json({ message: 'No vet profile linked to this user' });
  }

  try {
    const data = vetProfileUpdateSchema.parse(req.body);

    const vet = await prisma.vet.update({
      where: { id: user.vetId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.specialization !== undefined
          ? { specialization: data.specialization }
          : {}),
      },
    });

    // keep user.fullName roughly in sync with vet.name
    if (data.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { fullName: data.name },
      });
    }

    return res.json({ vet });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    console.error('[updateMyVetProfile] error', err);
    return res.status(500).json({ message: 'Failed to update vet profile' });
  }
};

const vetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  specialization: z.string().optional(),
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
