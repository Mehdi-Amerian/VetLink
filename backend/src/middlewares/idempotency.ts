import { NextFunction, Request, Response } from 'express';
import { addHours } from 'date-fns';
import prisma from '../config/prismaClient';
import { hashJsonStable } from '../utils/hash';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const DEFAULT_TTL_HOURS = Number(process.env.IDEMPOTENCY_TTL_HOURS || 24);

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();

  const key = req.header(IDEMPOTENCY_HEADER);
  if (!key) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Missing ${IDEMPOTENCY_HEADER} header`,
    });
  }

  const path = req.baseUrl + (req.route?.path ?? '');
  const method = req.method.toUpperCase();
  const bodyHash = hashJsonStable(req.body ?? {});
  const userId = (req as any).user?.userId ?? null;

  try {
    const existing = await prisma.idempotencyRequest.findUnique({ where: { key } });

    if (existing) {
      if (existing.method !== method || existing.path !== path) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Idempotency-Key reused across different endpoint',
        });
      }
      if (existing.bodyHash !== bodyHash) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Idempotency-Key reused with different request body',
        });
      }
      return res.status(existing.statusCode).json(existing.responseBody);
    }

    // Not seen -> capture outgoing response once
    const expiresAt = addHours(new Date(), DEFAULT_TTL_HOURS);

    const originalJson = res.json.bind(res);
    (res as any).json = async (body: any) => {
      try {
        await prisma.idempotencyRequest.create({
          data: {
            key,
            userId,
            method,
            path,
            bodyHash,
            statusCode: res.statusCode || 200,
            responseBody: body,
            createdAt: new Date(),
            expiresAt,
          },
        });
      } catch (e) {
        // Race: another handler stored it first — replay winner
        const winner = await prisma.idempotencyRequest.findUnique({ where: { key } });
        if (winner) {
          return res.status(winner.statusCode).json(winner.responseBody);
        }
        throw e;
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('[idempotency] middleware error', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Idempotency failure' });
  }
}
