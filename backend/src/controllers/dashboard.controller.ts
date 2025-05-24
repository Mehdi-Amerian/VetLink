import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboard = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  try {
    if (role === 'OWNER') {
      const totalPets = await prisma.pet.count({ where: { ownerId: userId, isDeleted: false } });
      const upcomingAppointments = await prisma.appointment.count({
        where: {
          ownerId: userId,
          date: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });
      const cancelled = await prisma.appointment.count({
        where: { ownerId: userId, status: 'CANCELLED' }
      });

      return res.json({
        role,
        totalPets,
        upcomingAppointments,
        cancelled
      });
    }

    if (role === 'VET') {
      const vet = await prisma.user.findUnique({
        where: { id: userId },
        include: { vetProfile: true }
      });

      if (!vet?.vetProfile?.id) {
        return res.status(400).json({ message: 'No vet profile linked' });
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const appointmentsToday = await prisma.appointment.count({
        where: {
          vetId: vet.vetProfile.id,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      const pending = await prisma.appointment.count({
        where: { vetId: vet.vetProfile.id, status: 'PENDING' }
      });

      const confirmed = await prisma.appointment.count({
        where: { vetId: vet.vetProfile.id, status: 'CONFIRMED' }
      });

      return res.json({
        role,
        appointmentsToday,
        pending,
        confirmed
      });
    }

    if (role === 'CLINIC_ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user?.clinicId) {
        return res.status(400).json({ message: 'No clinic linked' });
      }

      const totalVets = await prisma.vet.count({
        where: { clinicId: user.clinicId }
      });

      const totalAppointments = await prisma.appointment.count({
        where: { clinicId: user.clinicId }
      });

      const emergenciesToday = await prisma.appointment.count({
        where: {
          clinicId: user.clinicId,
          emergency: true,
          date: { gte: new Date() }
        }
      });

      return res.json({
        role,
        totalVets,
        totalAppointments,
        emergenciesToday
      });
    }

    return res.status(403).json({ message: 'Unsupported role' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Dashboard query failed' });
  }
};