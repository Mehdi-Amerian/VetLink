"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateClinic = exports.getClinicById = exports.getClinics = exports.createClinic = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prismaClient_1 = require("../config/prismaClient");
const clinicSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email("Invalid email address"),
    phone: zod_1.z
        .string()
        .min(7, "Phone number is required")
        .max(20, "Phone number is too long")
        .regex(/^[+0-9\s\-().]+$/, "Invalid phone number"),
    address: zod_1.z.string().min(1, "Address is required"),
    city: zod_1.z.string().min(1, "City is required"),
    zipCode: zod_1.z
        .string()
        .min(3, "ZIP code is required")
        .max(10, "ZIP code is too long")
        .regex(/^[A-Za-z0-9\- ]+$/, "Invalid ZIP code"),
    emergency: zod_1.z.boolean().optional().default(false),
});
const clinicUpdateSchema = clinicSchema.partial();
const createClinic = async (req, res) => {
    // This is the full user object set by verifyToken, not just the id
    const authUser = req.user;
    try {
        const data = clinicSchema.parse(req.body);
        const clinic = await prismaClient_1.prisma.clinic.create({ data });
        // Only bind a clinic to the user if they are a CLINIC_ADMIN.
        // SUPER_ADMIN should NOT have clinicId overwritten.
        if (authUser.role === "CLINIC_ADMIN") {
            await prismaClient_1.prisma.user.update({
                where: { id: authUser.userId },
                data: { clinicId: clinic.id },
            });
        }
        return res.status(201).json({ message: "Clinic registered", clinic });
    }
    catch (err) {
        // Zod validation error
        if (err instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ message: "Invalid clinic data", errors: err.errors });
        }
        // Prisma unique constraint error (duplicate email/phone)
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002") {
            const target = err.meta?.target ?? [];
            if (target.includes("Clinic_email_key")) {
                return res.status(409).json({ message: "Clinic email already in use" });
            }
            if (target.includes("Clinic_phone_key")) {
                return res.status(409).json({ message: "Clinic phone already in use" });
            }
            return res.status(409).json({ message: "Clinic already exists" });
        }
        console.error(err);
        return res.status(500).json({ message: "Failed to register clinic" });
    }
};
exports.createClinic = createClinic;
const getClinics = async (_, res) => {
    const clinics = await prismaClient_1.prisma.clinic.findMany({
        orderBy: { createdAt: "desc" },
    });
    res.json({ clinics });
};
exports.getClinics = getClinics;
const getClinicById = async (req, res) => {
    const { id } = req.params;
    const clinic = await prismaClient_1.prisma.clinic.findUnique({ where: { id } });
    if (!clinic)
        return res.status(404).json({ message: "Clinic not found" });
    res.json({ clinic });
};
exports.getClinicById = getClinicById;
/**
 * PATCH /api/clinics/:id
 * Roles: CLINIC_ADMIN (own clinic only), SUPER_ADMIN (any)
 */
const updateClinic = async (req, res) => {
    const { id: clinicId } = req.params;
    const user = req.user; // { userId, role, clinicId, ... }
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // CLINIC_ADMIN can only edit their own clinic
    if (user.role === 'CLINIC_ADMIN' && user.clinicId !== clinicId) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    try {
        const parsed = clinicUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Invalid clinic data',
                errors: parsed.error.flatten(),
            });
        }
        const data = parsed.data;
        const clinic = await prismaClient_1.prisma.clinic.update({
            where: { id: clinicId },
            data,
        });
        return res.json({ message: 'Clinic updated', clinic });
    }
    catch (err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {
                const target = err.meta?.target;
                if (target?.includes('email')) {
                    return res
                        .status(409)
                        .json({ message: 'Clinic email already in use' });
                }
                if (target?.includes('phone')) {
                    return res
                        .status(409)
                        .json({ message: 'Clinic phone already in use' });
                }
            }
            if (err.code === 'P2025') {
                // clinic not found on update
                return res.status(404).json({ message: 'Clinic not found' });
            }
        }
        console.error('updateClinic error', err);
        return res.status(500).json({ message: 'Failed to update clinic' });
    }
};
exports.updateClinic = updateClinic;
