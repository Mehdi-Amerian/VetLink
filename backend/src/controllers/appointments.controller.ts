import { Request, Response } from 'express';
import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prismaClient';


// 1) Validate input: date (ISO string) + duration (minutes) + other required fields
const appointmentSchema = z.object({
  date: z.string().refine(str => !isNaN(Date.parse(str)), {
    message: 'Invalid ISO date string'
  }),
  duration: z.number().int().min(5).max(500),
  reason: z.string().min(1).max(500),
  emergency: z.boolean().optional().default(false),
  petId: z.string().uuid(),
  clinicId: z.string().uuid(),
  vetId: z.string().uuid()
});

export const createAppointment = async (req: Request, res: Response) => {
  const user = (req as any).user as { userId: string; role: string };
  if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = appointmentSchema.parse(req.body);

    const start = new Date(data.date);
    const end = new Date(start.getTime() + data.duration * 60_000);

    //Owner can only book for their own pet
    const pet = await prisma.pet.findUnique({ where: { id: data.petId } });
    if (!pet || pet.isDeleted || pet.ownerId !== user.userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not own this pet.' });
    }

    //Vet must exist and belong to provided clinic
    const vet = await prisma.vet.findUnique({
      where: { id: data.vetId },
      select: { id: true, clinicId: true },
    });
    if (!vet) return res.status(404).json({ error: 'Not Found', message: 'Vet not found.' });
    if (vet.clinicId !== data.clinicId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Vet does not belong to provided clinic.' });
    }

    //Conflict check (any non-cancelled appt that overlaps)
    const conflict = await prisma.appointment.findFirst({
      where: {
        vetId: data.vetId,
        status: { not: AppointmentStatus.CANCELLED },
        date: { lt: end },      // existing starts before new end
        endTime: { gt: start }, // existing ends after new start
      },
      select: { id: true, date: true, endTime: true, status: true },
    });

    if (conflict) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Time slot overlaps an existing appointment.',
        existing: conflict,
      });
    }

    //Create appointment (PENDING by default)
    const created = await prisma.appointment.create({
      data: {
        date: start,
        endTime: end,
        duration: data.duration,
        reason: data.reason,
        emergency: !!data.emergency,
        petId: data.petId,
        clinicId: data.clinicId,
        vetId: data.vetId,
        ownerId: user.userId,
        status: AppointmentStatus.PENDING,
      },
      include: {
        pet: { select: { id: true, name: true, species: true } },
        vet: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad Request', details: err.flatten() });
    }
    console.error('[appointments] create error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
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
  const { userId, role, vetId: tokenVetId } = (req as any).user;
  const appointmentId = req.params.id;
  const { status } = req.body as { status: AppointmentStatus };

  //Validate incoming status
  if (![ 'CONFIRMED', 'CANCELLED', 'COMPLETED' ].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // Fetch appointment with ownerId, vetId, date, endTime
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      petId: true,
      ownerId: true,
      vetId: true,
      date: true,
      endTime: true
    }
  });
  if (!appt) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

// Final state lockout
const finalStates: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.COMPLETED
];

if (finalStates.includes(appt.status)) {
  return res.status(400).json({
    message: `Cannot change a ${appt.status.toLowerCase()} appointment`
  });
}

  //Transition rules
  //PENDING → COMPLETED disallowed
  if (appt.status === AppointmentStatus.PENDING && status === AppointmentStatus.COMPLETED) {
    return res.status(400).json({
      message: 'Pending appointments must be confirmed before completion.'
    });
  }

  //Cannot complete before it ends
  if (status === AppointmentStatus.COMPLETED) {
    const now = new Date();
    if (now < appt.endTime) {
      return res.status(400).json({
        message: 'Cannot complete before appointment end time.'
      });
    }
  }

  //Permission checks
  const isOwner = role === 'OWNER' && appt.ownerId === userId;
  const isVet   = role === 'VET'   && appt.vetId === tokenVetId;
  const isAdmin = role === 'CLINIC_ADMIN'; // Admins can update any appointment

  let allowed = false;
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      allowed = isVet || isAdmin;
      break;
    case AppointmentStatus.CANCELLED:
      //allow owner or any clinic‐level admin/vet
      allowed = isOwner || isVet || isAdmin;
      break;
    case AppointmentStatus.COMPLETED:
      allowed = isVet || isAdmin;
      break;
  }
  if (!allowed) {
    return res.status(403).json({ message: 'Not authorized to update status' });
  }

  // Perform update
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status }
  });

  return res.json({ message: 'Status updated', appointment: updated });
};

export const updateAppointmentTime = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, duration } = req.body; // same validation as above

  const newStart = new Date(date);
  const newEnd   = new Date(newStart.getTime() + duration * 60_000);

  //Fetch existing appointment + verify permissions
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return res.status(404).json({ message: 'Not found' });
  if (appt.ownerId !== (req as any).user.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  //Check for conflicts excluding this appointment itself
  const overlap = await prisma.appointment.findFirst({
    where: {
      vetId: appt.vetId,
      id:    { not: id },
      status: { in: ['PENDING','CONFIRMED'] },
      AND: [
        { date:    { lt: newEnd } },
        { endTime: { gt: newStart } }
      ]
    }
  });
  if (overlap) {
    return res.status(409).json({ message: 'Overlaps an existing booking' });
  }

  //Update both date & endTime & duration
  const updated = await prisma.appointment.update({
    where: { id },
    data: { date: newStart, endTime: newEnd, duration }
  });
  return res.json({ appointment: updated });
};