import { Router } from 'express';
import prisma from '../config/prismaClient';

const router = Router();

router.get('/healthz', (_req, res) => res.status(200).send('ok'));

router.get('/readyz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ error: 'not-ready' });
  }
});

export default router;
