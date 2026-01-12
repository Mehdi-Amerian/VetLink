import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prismaClient";

const clinicSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(7, "Phone number is required")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9\s\-().]+$/, "Invalid phone number"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  zipCode: z
    .string()
    .min(3, "ZIP code is required")
    .max(10, "ZIP code is too long")
    .regex(/^[A-Za-z0-9\- ]+$/, "Invalid ZIP code"),
  emergency: z.boolean().optional().default(false),
});

const clinicUpdateSchema = clinicSchema.partial();

export const createClinic = async (req: Request, res: Response) => {
  // This is the full user object set by verifyToken, not just the id
  const authUser = (req as any).user as {
    userId: string;
    role: 'CLINIC_ADMIN' | 'SUPER_ADMIN';
  };

  try {
    const data = clinicSchema.parse(req.body);

    const clinic = await prisma.clinic.create({ data });

    // Only bind a clinic to the user if they are a CLINIC_ADMIN.
    // SUPER_ADMIN should NOT have clinicId overwritten.
    if (authUser.role === "CLINIC_ADMIN") {
      await prisma.user.update({
        where: { id: authUser.userId },
        data: { clinicId: clinic.id },
      });
    }

    return res.status(201).json({ message: "Clinic registered", clinic });
  } catch (err: unknown) {
    // Zod validation error
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid clinic data", errors: err.errors });
    }

    // Prisma unique constraint error (duplicate email/phone)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = (err.meta?.target as string[]) ?? [];
      if (target.includes("Clinic_email_key")) {
        return res.status(409).json({ message: "Clinic email already in use" });
      }
      if (target.includes("Clinic_phone_key")) {
        return res.status(409).json({ message: "Clinic phone already in use" });
      }
      return res.status(409).json({ message: "Clinic already exists" });
    }

    console.error(err);
    return res.status(500).json({ message: "Failed to register clinic" });
  }
};

export const getClinics = async (_: Request, res: Response) => {
  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ clinics });
};

export const getClinicById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clinic = await prisma.clinic.findUnique({ where: { id } });

  if (!clinic) return res.status(404).json({ message: "Clinic not found" });

  res.json({ clinic });
};

/**
 * PATCH /api/clinics/:id
 * Roles: CLINIC_ADMIN (own clinic only), SUPER_ADMIN (any)
 */
export const updateClinic = async (req: Request, res: Response) => {
  const { id: clinicId } = req.params;
  const user = (req as any).user; // { userId, role, clinicId, ... }

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // CLINIC_ADMIN can only edit their own clinic
  if (user.role === 'CLINIC_ADMIN' && user.clinicId !== clinicId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const parsed = clinicUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid clinic data',
        errors: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data,
    });

    return res.json({ message: 'Clinic updated', clinic });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        const target = err.meta?.target as string[] | undefined;
        if (target?.includes('email')) {
          return res
            .status(409)
            .json({ message: 'Clinic email already in use' });
        }
        if (target?.includes('phone')) {
          return res
            .status(409)
            .json({ message: 'Clinic phone already in use' });
        }
      }
      if (err.code === 'P2025') {
        // clinic not found on update
        return res.status(404).json({ message: 'Clinic not found' });
      }
    }

    console.error('updateClinic error', err);
    return res.status(500).json({ message: 'Failed to update clinic' });
  }
};