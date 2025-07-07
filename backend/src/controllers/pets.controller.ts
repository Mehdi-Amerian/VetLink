import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';


// Validation schema
const petSchema = z.object({
  name: z.string(),
  species: z.string(),
  breed: z.string().optional(),
  birthDate: z.string()
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
        birthDate: new Date(data.birthDate),
        ownerId: userId,
        isDeleted: false
      }
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
    const pet = await prisma.pet.findUnique({
      where: { id: petId }
    });

    if (!pet || pet.ownerId !== userId) {
      return res.status(404).json({ message: 'Pet not found or access denied' });
    }

    const updated = await prisma.pet.update({
      where: { id: petId },
      data: req.body
    });

    res.json({ pet: updated });
  } catch {
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
    data: { isDeleted: true }
  });

  res.json({ message: 'Pet successfully deleted (soft delete)' });
};