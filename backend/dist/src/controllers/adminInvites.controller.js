"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteClinicAdmin = inviteClinicAdmin;
exports.inviteVet = inviteVet;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const invite_1 = require("../services/invite");
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const createClinicAdminInviteSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    clinicId: zod_1.z.string().uuid(),
});
async function inviteClinicAdmin(req, res) {
    try {
        const { role } = req.user;
        if (role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Only SUPER_ADMIN can invite clinic admins' });
        }
        const { email, clinicId } = createClinicAdminInviteSchema.parse(req.body);
        // ensure clinic exists
        const clinic = await prismaClient_1.default.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic)
            return res.status(404).json({ message: 'Clinic not found' });
        const invite = await (0, invite_1.createInvite)({
            email,
            role: client_1.Role.CLINIC_ADMIN,
            clinicId,
            expiresInDays: 7,
        });
        return res.status(201).json({ invite });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.flatten() });
        }
        console.error('[inviteClinicAdmin] error', err);
        return res.status(502).json({ message: 'Failed to create and send invite' });
    }
}
const createVetInviteSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    vetId: zod_1.z.string().uuid(),
});
async function inviteVet(req, res) {
    try {
        const { role, clinicId } = req.user;
        if (role !== 'CLINIC_ADMIN') {
            return res.status(403).json({ message: 'Only CLINIC_ADMIN can invite vets' });
        }
        const { email, vetId } = createVetInviteSchema.parse(req.body);
        const vet = await prismaClient_1.default.vet.findUnique({ where: { id: vetId } });
        if (!vet)
            return res.status(404).json({ message: 'Vet not found' });
        // clinic admin can only invite vets in their clinic
        if (vet.clinicId !== clinicId) {
            return res.status(403).json({ message: 'Vet does not belong to your clinic' });
        }
        const invite = await (0, invite_1.createInvite)({
            email,
            role: client_1.Role.VET,
            vetId,
            clinicId: vet.clinicId,
            expiresInDays: 7,
        });
        return res.status(201).json({ invite });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.flatten() });
        }
        console.error('[inviteVet] error', err);
        return res.status(502).json({ message: 'Failed to create and send invite' });
    }
}
