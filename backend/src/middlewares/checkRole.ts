import { Request, Response, NextFunction } from 'express';

export const checkRole = (roles: string | string[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !allowed.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};
