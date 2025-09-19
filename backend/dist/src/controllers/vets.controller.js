"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVetById = exports.getVets = exports.createVet = void 0;
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const vetSchema = zod_1.z.object({
    name: zod_1.z.string(),
    specialization: zod_1.z.string().optional(),
    email: zod_1.z.string().email()
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
        await prismaClient_1.prisma.user.update({
            where: { email: data.email },
            data: { vetId: vet.id }
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
