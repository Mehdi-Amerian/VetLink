"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVetById = exports.getVets = exports.createVet = exports.updateMyVetProfile = void 0;
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const vetProfileUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').optional(),
    specialization: zod_1.z.string().max(200).optional().nullable(),
});
const updateMyVetProfile = async (req, res) => {
    const { userId, role } = req.user;
    if (role !== 'VET') {
        return res.status(403).json({ message: 'Only vets can update their profile' });
    }
    const user = await prismaClient_1.prisma.user.findUnique({
        where: { id: userId },
        select: { vetId: true },
    });
    if (!user?.vetId) {
        return res.status(400).json({ message: 'No vet profile linked to this user' });
    }
    try {
        const data = vetProfileUpdateSchema.parse(req.body);
        const vet = await prismaClient_1.prisma.vet.update({
            where: { id: user.vetId },
            data: {
                ...(data.name ? { name: data.name } : {}),
                ...(data.specialization !== undefined
                    ? { specialization: data.specialization }
                    : {}),
            },
        });
        // keep user.fullName roughly in sync with vet.name
        if (data.name) {
            await prismaClient_1.prisma.user.update({
                where: { id: userId },
                data: { fullName: data.name },
            });
        }
        return res.json({ vet });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        console.error('[updateMyVetProfile] error', err);
        return res.status(500).json({ message: 'Failed to update vet profile' });
    }
};
exports.updateMyVetProfile = updateMyVetProfile;
const vetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    specialization: zod_1.z.string().optional(),
});
const createVet = async (req, res) => {
    const userId = req.user.userId;
    try {
        const clinicAdmin = await prismaClient_1.prisma.user.findUnique({
            where: { id: userId },
            select: { clinicId: true }
        });
        if (!clinicAdmin?.clinicId) {
            return res.status(400).json({ message: 'You are not linked to any clinic' });
        }
        const data = vetSchema.parse(req.body);
        const vet = await prismaClient_1.prisma.vet.create({
            data: {
                name: data.name,
                specialization: data.specialization,
                clinicId: clinicAdmin.clinicId
            }
        });
        res.status(201).json({ vet });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Failed to create vet' });
    }
};
exports.createVet = createVet;
const getVets = async (req, res) => {
    const { clinicId } = req.query;
    const vets = await prismaClient_1.prisma.vet.findMany({
        where: clinicId ? { clinicId: String(clinicId) } : {},
        orderBy: { createdAt: 'desc' }
    });
    res.json({ vets });
};
exports.getVets = getVets;
const getVetById = async (req, res) => {
    const vet = await prismaClient_1.prisma.vet.findUnique({
        where: { id: req.params.id }
    });
    if (!vet) {
        return res.status(404).json({ message: 'Vet not found' });
    }
    res.json({ vet });
};
exports.getVetById = getVetById;
