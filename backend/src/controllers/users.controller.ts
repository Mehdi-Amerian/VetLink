import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prismaClient";

const updateMeSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
});

export const updateMe = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const patch = updateMeSchema.parse(req.body);

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: patch,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        clinicId: true,
        vetId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ user: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    console.error("[users] updateMe error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
