import crypto from 'crypto';
import { addDays } from 'date-fns';
import prisma from '../config/prismaClient';
import { Role } from '@prisma/client';

export async function createInvite(params: {
  email: string;
  role: Role;
  clinicId?: string;
  vetId?: string;
  expiresInDays?: number;
}) {
  const token = crypto.randomBytes(32).toString('hex'); // opaque 64 chars
  const expiresAt = addDays(new Date(), params.expiresInDays ?? 7);

  const invite = await prisma.invite.create({
    data: {
      token,
      email: params.email.toLowerCase(),
      role: params.role,
      clinicId: params.clinicId,
      vetId: params.vetId,
      expiresAt,
    },
  });

  return invite;
}

export async function consumeInvite(token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) return { ok: false, code: 'INVALID' as const };
  if (invite.usedAt) return { ok: false, code: 'USED' as const };
  if (invite.expiresAt < new Date()) return { ok: false, code: 'EXPIRED' as const };

  await prisma.invite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return { ok: true, invite } as const;
}
