import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';
import { parseClientToUtc, toLocal } from '../utils/time';

function isFutureDayInClinicZone(value: string): boolean {
  const parsed = parseClientToUtc(value);
  const selectedDay = toLocal(parsed);
  selectedDay.setHours(0, 0, 0, 0);

  const today = toLocal(new Date());
  today.setHours(0, 0, 0, 0);

  return selectedDay.getTime() > today.getTime();
}

const birthDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid birthDate',
  })
  .refine((value) => !isFutureDayInClinicZone(value), {
    message: 'Birth date cannot be in the future',
  });

// Validation schema
const petSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().min(1).optional().nullable(),
  birthDate: birthDateSchema,
});

const updatePetSchema = z
  .object({
    name: z.string().min(1).optional(),
    species: z.string().min(1).optional(),
    breed: z.string().min(1).nullable().optional(),
    birthDate: birthDateSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields provided for update',
  });

export const createPet = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const data = petSchema.parse(req.body);

    const pet = await prisma.pet.create({
      data: {
        name: data.name,
        species: data.species,
        breed: data.breed,
        birthDate: parseClientToUtc(data.birthDate),
        ownerId: userId,
        isDeleted: false,
      },
    });

    res.status(201).json({ pet });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: 'Failed to create pet' });
  }
};

export const getMyPets = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const pets = await prisma.pet.findMany({
      where: { ownerId: userId, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ pets });
  } catch {
    res.status(500).json({ message: 'Failed to fetch pets' });
  }
};

export const updatePet = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const petId = req.params.id;

  try {
    const data = updatePetSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet || pet.ownerId !== userId) {
      return res.status(404).json({ message: 'Pet not found or access denied' });
    }

    const updateData: {
      name?: string;
      species?: string;
      breed?: string | null;
      birthDate?: Date;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.species !== undefined) updateData.species = data.species;
    if (data.breed !== undefined) updateData.breed = data.breed;
    if (data.birthDate !== undefined) updateData.birthDate = parseClientToUtc(data.birthDate);

    const updated = await prisma.pet.update({
      where: { id: petId },
      data: updateData,
    });

    res.json({ pet: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }

    res.status(500).json({ message: 'Failed to update pet' });
  }
};

export const deletePet = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const petId = req.params.id;

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.ownerId !== userId) {
    return res.status(404).json({ message: 'Pet not found or access denied' });
  }

  await prisma.pet.update({
    where: { id: petId },
    data: { isDeleted: true },
  });

  res.json({ message: 'Pet successfully deleted (soft delete)' });
};
