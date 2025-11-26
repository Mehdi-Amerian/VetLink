import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient';
import { JwtPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
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
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    // Confirm user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { vetId: true, clinicId: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // Attach session-like object to req
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      vetId: user.vetId,
      clinicId: user.clinicId
    };

    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
