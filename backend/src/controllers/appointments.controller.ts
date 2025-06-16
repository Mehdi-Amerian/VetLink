import { Request, Response } from 'express';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// 1) Validate input: date (ISO string) + duration (minutes) + other required fields
const appointmentSchema = z.object({
  date: z.string().refine(str => !isNaN(Date.parse(str)), {
    message: 'Invalid ISO date string'
  }),
  duration: z.number().int().positive(),     // e.g. 30, 45, 60
  reason: z.string(),
  emergency: z.boolean(),
  petId: z.string(),
  clinicId: z.string(),
  vetId: z.string()
});

export const createAppointment = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId; 

  try {
    //Parse + validate body
    const data = appointmentSchema.parse(req.body);
    const start = new Date(data.date);
    const end = new Date(start.getTime() + data.duration * 60_000);

    //Verify pet belongs to this owner
    const pet = await prisma.pet.findUnique({ where: { id: data.petId } });
    if (!pet || pet.ownerId !== userId) {
      return res.status(403).json({ message: 'Access denied to this pet' });
    }

    //Check for ANY overlapping appointment for the same vet
    //Overlap occurs if: existing.start < newEnd  AND existing.endTime > newStart
    const conflict = await prisma.appointment.findFirst({
      where: {
        vetId: data.vetId,
        status: { in: ['PENDING', 'CONFIRMED'] }, 
        AND: [
          { date:    { lt: end      } }, 
          { endTime: { gt: start    } }
        ]
      }
    });

    if (conflict) {
      return res.status(409).json({
        message: 'overlaps an existing appointment for the selected vet'
      });
    }

    //Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        date: start,
        endTime: end,
        duration: data.duration,
        reason: data.reason,
        emergency: data.emergency,
        petId: data.petId,
        clinicId: data.clinicId,
        vetId: data.vetId,
        ownerId: userId
      }
    });

    return res.status(201).json({ appointment });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: 'Failed to create appointment' });
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