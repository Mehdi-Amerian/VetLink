import crypto from 'crypto';
import { addDays } from 'date-fns';
import prisma from '../config/prismaClient';

export async function createUnsubscribeToken(userId: string, days = 30) {
  const token = crypto.randomBytes(32).toString('hex'); // 64-char opaque
  const expiresAt = addDays(new Date(), days);
  const row = await prisma.unsubscribeToken.create({
    data: { token, userId, expiresAt }
  });
  return row.token;
}

export async function consumeUnsubscribeToken(token: string) {
  const row = await prisma.unsubscribeToken.findUnique({ where: { token } });
  if (!row) return { ok: false, code: 'INVALID' };
  if (row.usedAt) return { ok: true, code: 'ALREADY_USED', userId: row.userId }; // idempotent
  if (row.expiresAt < new Date()) return { ok: false, code: 'EXPIRED' };

  // mark used
  await prisma.unsubscribeToken.update({
    where: { token },
    data: { usedAt: new Date() }
  });
  return { ok: true, code: 'OK', userId: row.userId };
}
