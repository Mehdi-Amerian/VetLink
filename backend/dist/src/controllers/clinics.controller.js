"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClinicById = exports.getClinics = exports.createClinic = void 0;
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const clinicSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string(),
    address: zod_1.z.string(),
    city: zod_1.z.string(),
    zipCode: zod_1.z.string(),
    emergency: zod_1.z.boolean()
});
const createClinic = async (req, res) => {
    const userId = req.user.userId;
    try {
        const data = clinicSchema.parse(req.body);
        const clinic = await prismaClient_1.prisma.clinic.create({ data });
        await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { clinicId: clinic.id }
        });
        res.status(201).json({ message: 'Clinic registered', clinic });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Failed to register clinic' });
    }
};
exports.createClinic = createClinic;
const getClinics = async (_, res) => {
    const clinics = await prismaClient_1.prisma.clinic.findMany({
        orderBy: { createdAt: 'desc' }
    });
    res.json({ clinics });
};
exports.getClinics = getClinics;
const getClinicById = async (req, res) => {
    const { id } = req.params;
    const clinic = await prismaClient_1.prisma.clinic.findUnique({ where: { id } });
    if (!clinic)
        return res.status(404).json({ message: 'Clinic not found' });
    res.json({ clinic });
};
exports.getClinicById = getClinicById;
