"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportClinicsCsv = exports.exportUsersCsv = exports.exportPetsCsv = exports.exportAppointmentsCsv = exports.getDashboard = void 0;
const json2csv_1 = require("json2csv");
const prismaClient_1 = require("../config/prismaClient");
const getDashboard = async (req, res) => {
    const { userId, role } = req.user;
    const range = req.query.range || 'all';
    const getDateRange = () => {
        const now = new Date();
        if (range === '1d')
            return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        if (range === '7d')
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (range === '30d')
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return null; // no filter
    };
    const dateFrom = getDateRange();
    const dateFilter = dateFrom ? { gte: dateFrom } : undefined;
    try {
        if (role === 'OWNER') {
            const totalPets = await prismaClient_1.prisma.pet.count({ where: { ownerId: userId, isDeleted: false } });
            const upcomingAppointments = await prismaClient_1.prisma.appointment.count({
                where: {
                    ownerId: userId,
                    date: dateFilter,
                    status: { in: ['PENDING', 'CONFIRMED'] }
                }
            });
            const cancelled = await prismaClient_1.prisma.appointment.count({
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
            const vet = await prismaClient_1.prisma.user.findUnique({
                where: { id: userId },
                include: { vetProfile: true }
            });
            if (!vet?.vetProfile?.id) {
                return res.status(400).json({ message: 'No vet profile linked' });
            }
            const appointmentsToday = await prismaClient_1.prisma.appointment.count({
                where: {
                    vetId: vet.vetProfile.id,
                    date: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    },
                    status: { in: ['PENDING', 'CONFIRMED'] }
                }
            });
            const pending = await prismaClient_1.prisma.appointment.count({
                where: { vetId: vet.vetProfile.id, status: 'PENDING', date: dateFilter }
            });
            const confirmed = await prismaClient_1.prisma.appointment.count({
                where: { vetId: vet.vetProfile.id, status: 'CONFIRMED', date: dateFilter }
            });
            const appointmentsGrouped = await prismaClient_1.prisma.appointment.groupBy({
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
            const user = await prismaClient_1.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user?.clinicId) {
                return res.status(400).json({ message: 'No clinic linked' });
            }
            const totalVets = await prismaClient_1.prisma.vet.count({
                where: { clinicId: user.clinicId }
            });
            const totalAppointments = await prismaClient_1.prisma.appointment.count({
                where: { clinicId: user.clinicId, date: dateFilter }
            });
            const emergenciesToday = await prismaClient_1.prisma.appointment.count({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Dashboard query failed' });
    }
};
exports.getDashboard = getDashboard;
const exportAppointmentsCsv = async (req, res) => {
    const { userId, role } = req.user;
    let where = {};
    if (role === 'OWNER')
        where.ownerId = userId;
    else if (role === 'VET') {
        const vet = await prismaClient_1.prisma.user.findUnique({
            where: { id: userId },
            include: { vetProfile: true }
        });
        if (!vet?.vetProfile?.id)
            return res.status(400).json({ message: 'No vet profile linked' });
        where.vetId = vet.vetProfile.id;
    }
    else if (role === 'CLINIC_ADMIN') {
        const admin = await prismaClient_1.prisma.user.findUnique({ where: { id: userId } });
        if (!admin?.clinicId)
            return res.status(400).json({ message: 'No clinic linked' });
        where.clinicId = admin.clinicId;
    }
    const appointments = await prismaClient_1.prisma.appointment.findMany({
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
    const parser = new json2csv_1.Parser();
    const csv = parser.parse(flatData);
    res.header('Content-Type', 'text/csv');
    res.attachment('appointments.csv');
    res.send(csv);
};
exports.exportAppointmentsCsv = exportAppointmentsCsv;
// Utility to build date filter from query
const buildDateFilter = (from, to) => {
    const filter = {};
    if (from && !isNaN(Date.parse(from)))
        filter.gte = new Date(from);
    if (to && !isNaN(Date.parse(to)))
        filter.lte = new Date(to);
    return Object.keys(filter).length ? filter : undefined;
};
const exportPetsCsv = async (req, res) => {
    const { role, userId } = req.user;
    // optional filter by ownerId (only owners see their own pets)
    const ownerFilter = role === 'OWNER'
        ? { ownerId: userId }
        : req.query.ownerId
            ? { ownerId: String(req.query.ownerId) }
            : {};
    const pets = await prismaClient_1.prisma.pet.findMany({
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
    const csv = new json2csv_1.Parser().parse(flat);
    res.header('Content-Type', 'text/csv');
    res.attachment('pets.csv');
    res.send(csv);
};
exports.exportPetsCsv = exportPetsCsv;
const exportUsersCsv = async (req, res) => {
    const { userId, role: myRole } = req.user;
    const from = String(req.query.from);
    const to = String(req.query.to);
    const dateFilter = buildDateFilter(from, to);
    const visibilityFilter = myRole === 'OWNER'
        ? { id: userId }
        : {};
    const rawRole = req.query.role;
    const roleFilter = rawRole
        ? { role: rawRole }
        : {};
    const users = await prismaClient_1.prisma.user.findMany({
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
    const csv = new json2csv_1.Parser().parse(flat);
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
};
exports.exportUsersCsv = exportUsersCsv;
const exportClinicsCsv = async (req, res) => {
    // optional city filter
    const cityFilter = req.query.city
        ? { city: String(req.query.city) }
        : {};
    const clinics = await prismaClient_1.prisma.clinic.findMany({
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
    const csv = new json2csv_1.Parser().parse(flat);
    res.header('Content-Type', 'text/csv');
    res.attachment('clinics.csv');
    res.send(csv);
};
exports.exportClinicsCsv = exportClinicsCsv;
