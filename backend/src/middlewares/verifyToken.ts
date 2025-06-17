import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    vetId?: string | null;
    clinicId?: string | null;
  };
}

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string; role: string };

    const userRecord = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { vetId: true, clinicId: true }
  });

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      vetId: userRecord?.vetId || null,
      clinicId: userRecord?.clinicId || null
    };

    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
