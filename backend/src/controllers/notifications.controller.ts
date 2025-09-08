import { Request, Response } from 'express';
import prisma from '../config/prismaClient';
import { z } from 'zod';

export async function getPreferences(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId }, // defaults emailEnabled: true
    update: {},
  });
  res.json(pref);
}

const PrefSchema = z.object({ emailEnabled: z.boolean() });

export async function updatePreferences(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { emailEnabled } = PrefSchema.parse(req.body);
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    update: { emailEnabled },
    create: { userId, emailEnabled },
  });
  res.json(pref);
}