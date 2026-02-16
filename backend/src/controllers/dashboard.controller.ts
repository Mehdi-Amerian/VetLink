import { Request, Response } from 'express';
import {Role} from '@prisma/client';
import {Parser} from 'json2csv';
import { prisma } from '../config/prismaClient';

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
        }
      });
      const cancelled = await prisma.appointment.count({
        where: { ownerId: userId, date: dateFilter }
      });

      return res.json({
        role,
        totalPets,
        upcomingAppointments,
        cancelled
      });
    }

    if (role === 'VET') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select : { vetId: true }
      });

      if (!user?.vetId) {
        return res.status(400).json({ message: 'No vet profile linked' });
      }

      const vetId = user.vetId;

      const appointmentsToday = await prisma.appointment.count({
        where: {
          vetId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))},
        }
      });

      const pending = await prisma.appointment.count({
        where: { vetId, date: dateFilter }
      });

      const confirmed = await prisma.appointment.count({
        where: { vetId, date: dateFilter }
      });

      const appointmentsGrouped = await prisma.appointment.groupBy({
        by: ['date'],
        where: {
            vetId,
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select : { vetId: true }
    });
    if (!user?.vetId) return res.status(400).json({ message: 'No vet profile linked' });
    where.vetId = user.vetId;
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

// Utility to build date filter from query
const buildDateFilter = (from?: string, to?: string) => {
  const filter: any = {};
  if (from && !isNaN(Date.parse(from))) filter.gte = new Date(from);
  if (to   && !isNaN(Date.parse(to))) filter.lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
};

export const exportPetsCsv = async (req: Request, res: Response) => {
  const { role, userId } = (req as any).user;
  // optional filter by ownerId (only owners see their own pets)
  const ownerFilter = role === 'OWNER'
    ? { ownerId: userId }
    : req.query.ownerId
      ? { ownerId: String(req.query.ownerId) }
      : {};

  const pets = await prisma.pet.findMany({
    where: {
      ...ownerFilter,
      isDeleted: false,
      createdAt: buildDateFilter(String(req.query.from), String(req.query.to))
    },
    include: { owner: true }
  });

  const flat = pets.map(p => ({
    PetID: p.id,
    Name: p.name,
    Species: p.species,
    Breed: p.breed || '',
    BirthDate: p.birthDate.toISOString(),
    OwnerEmail: p.owner.email,
    CreatedAt: p.createdAt.toISOString()
  }));

  const csv = new Parser().parse(flat);
  res.header('Content-Type', 'text/csv');
  res.attachment('pets.csv');
  res.send(csv);
};

export const exportUsersCsv = async (req: Request, res: Response) => {
  const { userId, role: myRole } = (req as any).user;

  const from = String(req.query.from);
  const to   = String(req.query.to);
  const dateFilter = buildDateFilter(from, to);

  const visibilityFilter =
    myRole === 'OWNER'
      ? { id: userId }
      : {};

  const rawRole = req.query.role as string | undefined;
  const roleFilter = rawRole
    ? { role: rawRole as Role }
    : {};

  const users = await prisma.user.findMany({
    where: {
      ...visibilityFilter,
      ...roleFilter,
      createdAt: dateFilter
    },
    include: {
      clinic: true,
      vetProfile: true
    }
  });

  const flat = users.map(u => ({
    UserID: u.id,
    Email: u.email,
    FullName: u.fullName,
    Role: u.role,
    Clinic: u.clinic?.name || '',
    VetProfileID: u.vetProfile?.id || '',
    CreatedAt: u.createdAt.toISOString()
  }));

  const csv = new Parser().parse(flat);
  res.header('Content-Type', 'text/csv');
  res.attachment('users.csv');
  res.send(csv);
};


export const exportClinicsCsv = async (req: Request, res: Response) => {
  // optional city filter
  const cityFilter = req.query.city
    ? { city: String(req.query.city) }
    : {};

  const clinics = await prisma.clinic.findMany({
    where: {
      ...cityFilter,
      createdAt: buildDateFilter(String(req.query.from), String(req.query.to))
    }
  });

  const flat = clinics.map(c => ({
    ClinicID: c.id,
    Name: c.name,
    Email: c.email,
    Phone: c.phone,
    City: c.city,
    Emergency: c.emergency ? 'Yes' : 'No',
    CreatedAt: c.createdAt.toISOString()
  }));

  const csv = new Parser().parse(flat);
  res.header('Content-Type', 'text/csv');
  res.attachment('clinics.csv');
  res.send(csv);
};