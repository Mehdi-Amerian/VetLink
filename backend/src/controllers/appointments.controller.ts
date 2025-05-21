import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const appointmentSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  reason: z.string(),
  emergency: z.boolean(),
  petId: z.string(),
  clinicId: z.string(),
  vetId: z.string()
});

export const createAppointment = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const data = appointmentSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({
      where: { id: data.petId }
    });

    if (!pet || pet.ownerId !== userId) {
      return res.status(403).json({ message: "Access denied to this pet" });
    }

    // Conflict check
    const conflict = await prisma.appointment.findFirst({
        where: {
            vetId: data.vetId,
            date: new Date(data.date)
        }
    });

    if (conflict) {
        return res.status(409).json({
         message: "This time slot is already booked with the selected vet"
     });
    }


    const appointment = await prisma.appointment.create({
      data: {
        date: new Date(data.date),
        reason: data.reason,
        emergency: data.emergency,
        petId: data.petId,
        clinicId: data.clinicId,
        vetId: data.vetId,
        ownerId: userId
      }
    });

    res.status(201).json({ appointment });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    res.status(500).json({ message: "Failed to create appointment" });
  }
};

export const getMyAppointments = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const appointments = await prisma.appointment.findMany({
    where: { ownerId: userId },
    include: {
      pet: true,
      vet: true,
      clinic: true
    },
    orderBy: { date: 'asc' }
  });

  res.json({ appointments });
};

export const getAppointmentsForVet = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vetProfile: true }
  });

  if (!user?.vetProfile?.id) {
    return res.status(403).json({ message: 'No vet profile linked to this user' });
  }

  const appointments = await prisma.appointment.findMany({
    where: { vetId: user.vetProfile.id },
    include: {
      pet: true,
      owner: true,
      clinic: true
    },
    orderBy: { date: 'asc' }
  });

  res.json({ appointments });
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const appointmentId = req.params.id;

  const { status } = req.body;

  if (!['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { vet: true, owner: true }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Final state check 
  if (['CANCELLED', 'COMPLETED'].includes(appointment.status)) {
  return res.status(400).json({
    message: `Cannot change status of a ${appointment.status.toLowerCase()} appointment`
  });
}

// PENDING to COMPLETED check
if (
  appointment.status === 'PENDING' &&
  status === 'COMPLETED'
) {
  return res.status(400).json({
    message: 'Cannot mark a PENDING appointment as COMPLETED. Please confirm it first.'
  });
}


  // Access control
  const isOwner = appointment.ownerId === user.userId && user.role === 'OWNER';
  const isVet = user.role === 'VET' && (await prisma.user.findUnique({
    where: { id: user.userId },
    include: { vetProfile: true }
  }))?.vetProfile?.id === appointment.vetId;

  // Determine permissions
  const canUpdate =
    (status === 'CANCELLED' && (isVet || isOwner)) ||
    (status === 'CONFIRMED' && isVet) ||
    (status === 'COMPLETED' && isVet);

  if (!canUpdate) {
    return res.status(403).json({ message: 'You are not allowed to update this appointment' });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status }
  });

  res.json({ message: 'Status updated', appointment: updated });
};