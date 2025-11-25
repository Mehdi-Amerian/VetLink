import { Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { createInvite } from '../services/invite';
import prisma from '../config/prismaClient';

const createClinicAdminInviteSchema = z.object({
  email: z.string().email(),
  clinicId: z.string().uuid(),
});

export async function inviteClinicAdmin(req: Request, res: Response) {
  const { role } = (req as any).user;

  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Only SUPER_ADMIN can invite clinic admins' });
  }

  const { email, clinicId } = createClinicAdminInviteSchema.parse(req.body);

  // ensure clinic exists
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

  const invite = await createInvite({
    email,
    role: Role.CLINIC_ADMIN,
    clinicId,
    expiresInDays: 7,
  });

  return res.status(201).json({ invite });
}

const createVetInviteSchema = z.object({
  email: z.string().email(),
  vetId: z.string().uuid(),
});

export async function inviteVet(req: Request, res: Response) {
  const { role, clinicId } = (req as any).user;

  if (role !== 'CLINIC_ADMIN') {
    return res.status(403).json({ message: 'Only CLINIC_ADMIN can invite vets' });
  }

  const { email, vetId } = createVetInviteSchema.parse(req.body);

  const vet = await prisma.vet.findUnique({ where: { id: vetId } });
  if (!vet) return res.status(404).json({ message: 'Vet not found' });

  // clinic admin can only invite vets in their clinic
  if (vet.clinicId !== clinicId) {
    return res.status(403).json({ message: 'Vet does not belong to your clinic' });
  }

  const invite = await createInvite({
    email,
    role: Role.VET,
    vetId,
    clinicId: vet.clinicId,
    expiresInDays: 7,
  });

  return res.status(201).json({ invite });
}
