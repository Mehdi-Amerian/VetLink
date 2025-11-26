import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prismaClient';
import { consumeInvite } from '../services/invite';
import { signJwt } from '../utils/jwt';

// Payload the frontend sends when user clicks "accept invite" and sets password
const acceptInviteSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, fullName, password } = acceptInviteSchema.parse(req.body);

    // Validate & consume invite
    const result = await consumeInvite(token);
  
    if (!result.ok) {
      const message =
        result.code === 'INVALID'
          ? 'Invalid invite token'
          : result.code === 'USED'
          ? 'Invite already used'
          : 'Invite expired';
  
      return res.status(400).json({ message });
    }
  
    const invite = result.invite;
  
    if (!invite) {
      return res.status(400).json({ message: 'Invalid invite token' });
    }
  
    // Check if user already exists with that email
    const existing = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 12);

    // Create user based on invite role + linkage
    const user = await prisma.user.create({
      data: {
        email: invite.email,
        password: hashed,
        fullName,
        role: invite.role,       
        clinicId: invite.clinicId ?? undefined,
        vetId: invite.vetId ?? undefined,
      },
    });

    // Issue JWT using shared helper
    const jwt = signJwt({
      userId: user.id,
      role: user.role,
      clinicId: user.clinicId,
      vetId: user.vetId,
    });

    return res.status(201).json({
      message: 'Account created from invite',
      token: jwt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clinicId: user.clinicId,
        vetId: user.vetId,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.flatten() });
    }
    console.error('[acceptInvite] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
