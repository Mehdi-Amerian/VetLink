// src/config/prismaClient.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations for the Prisma client in development
  // to avoid instantiating the client multiple times
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prisma ??
  new PrismaClient({
    // Optional: enable query logging in non-production
    // log: process.env.NODE_ENV === 'production' ? [] : ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;