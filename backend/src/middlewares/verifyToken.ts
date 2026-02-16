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
    return res.status(401).json({ message: 'Missing token', code: 'TOKEN_MISSING' });
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
      return res.status(401).json({ message: 'User no longer exists', code: 'USER_NOT_FOUND' });
    }

    // Attach session-like object to req
    req.user = {
      userId: decoded.userId,
      role: user.role,
      vetId: user.vetId,
      clinicId: user.clinicId
    };

      return next();
  } catch (err: unknown) {
    // jwt.verify throws JsonWebTokenError / TokenExpiredError
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
      code: "TOKEN_INVALID",
    });
  }
};
