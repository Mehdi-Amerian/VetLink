import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {Parser} from 'json2csv';

const prisma = new PrismaClient();

export const getDashboard = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const range = req.query.range as string || 'all';

const getDateRange = () => {
  const now = new Date();

  if (range === '1d') return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return null; // no filter
};

const dateFrom = getDateRange();
const dateFilter = dateFrom ? { gte: dateFrom } : undefined;


  try {
    if (role === 'OWNER') {
      const totalPets = await prisma.pet.count({ where: { ownerId: userId, isDeleted: false } });
      const upcomingAppointments = await prisma.appointment.count({
        where: {
          ownerId: userId,
          date: dateFilter,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });
      const cancelled = await prisma.appointment.count({
        where: { ownerId: userId, status: 'CANCELLED', date: dateFilter }
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

      const appointmentsToday = await prisma.appointment.count({
        where: {
          vetId: vet.vetProfile.id,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))},
            status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      const pending = await prisma.appointment.count({
        where: { vetId: vet.vetProfile.id, status: 'PENDING', date: dateFilter }
      });

      const confirmed = await prisma.appointment.count({
        where: { vetId: vet.vetProfile.id, status: 'CONFIRMED', date: dateFilter }
      });

      const appointmentsGrouped = await prisma.appointment.groupBy({
        by: ['date'],
        where: {
            vetId: vet.vetProfile.id,
            date: dateFilter
        },
        _count: true,
        orderBy: { date: 'asc' }
      });

      const dailyAppointments = appointmentsGrouped.map((entry) => ({
        date: entry.date.toISOString().split('T')[0],
        count: entry._count
     }));

      return res.json({
        role,
        appointmentsToday,
        pending,
        confirmed,
        dailyAppointments
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
        where: { clinicId: user.clinicId, date: dateFilter }
      });

      const emergenciesToday = await prisma.appointment.count({
        where: {
          clinicId: user.clinicId,
          emergency: true,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
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

export const exportAppointmentsCsv = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  let where: any = {};
  if (role === 'OWNER') where.ownerId = userId;
  else if (role === 'VET') {
    const vet = await prisma.user.findUnique({
      where: { id: userId },
      include: { vetProfile: true }
    });
    if (!vet?.vetProfile?.id) return res.status(400).json({ message: 'No vet profile linked' });
    where.vetId = vet.vetProfile.id;
  } else if (role === 'CLINIC_ADMIN') {
    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin?.clinicId) return res.status(400).json({ message: 'No clinic linked' });
    where.clinicId = admin.clinicId;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      pet: true,
      clinic: true,
      vet: true
    }
  });

  const flatData = appointments.map((a) => ({
    AppointmentID: a.id,
    Date: a.date.toISOString(),
    Reason: a.reason,
    Status: a.status,
    Emergency: a.emergency ? 'Yes' : 'No',
    Pet: a.pet.name,
    Clinic: a.clinic.name,
    Vet: a.vet.name
  }));

  const parser = new Parser();
  const csv = parser.parse(flatData);

  res.header('Content-Type', 'text/csv');
  res.attachment('appointments.csv');
  res.send(csv);
};