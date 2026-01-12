import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';
import { signJwt } from '../utils/jwt';


// Define the schema for user signup
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string(),
});

// User signup function
export const signup = async (req: Request, res: Response) => {
  try {
    const data = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
     return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        role: 'OWNER'
      }
    });

    const token = signJwt({ userId: user.id, role: user.role });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Define the schema for user login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// User login function
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signJwt({ 
      userId: user.id,
      role: user.role,
      clinicId: user.clinicId,
      vetId: user.vetId,
    });

    const authUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      clinicId: user.clinicId,
      vetId: user.vetId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      message: 'Login successful',
      token,
      user: authUser
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user profile function
export const getMe = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      clinicId: user.clinicId,
      vetId: user.vetId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({ authUser });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};