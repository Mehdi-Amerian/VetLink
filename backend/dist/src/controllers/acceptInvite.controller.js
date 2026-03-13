"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvite = void 0;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prismaClient_1 = require("../config/prismaClient");
const invite_1 = require("../services/invite");
const jwt_1 = require("../utils/jwt");
// Payload the frontend sends when user clicks "accept invite" and sets password
const acceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    fullName: zod_1.z.string().min(1).max(200),
    password: zod_1.z.string().min(8).max(200),
});
const acceptInvite = async (req, res) => {
    try {
        const { token, fullName, password } = acceptInviteSchema.parse(req.body);
        // Validate & consume invite
        const result = await (0, invite_1.consumeInvite)(token);
        if (!result.ok) {
            const message = result.code === 'INVALID'
                ? 'Invalid invite token'
                : result.code === 'USED'
                    ? 'Invite already used'
                    : 'Invite expired';
            return res.status(400).json({ message });
        }
        const invite = result.invite;
        if (!invite) {
            return res.status(400).json({ message: 'Invalid invite token' });
        }
        // Check if user already exists with that email
        const existing = await prismaClient_1.prisma.user.findUnique({
            where: { email: invite.email },
        });
        if (existing) {
            return res
                .status(409)
                .json({ message: 'User already exists with this email' });
        }
        // Hash password
        const hashed = await bcryptjs_1.default.hash(password, 12);
        // Create user based on invite role + linkage
        const user = await prismaClient_1.prisma.user.create({
            data: {
                email: invite.email,
                password: hashed,
                fullName,
                role: invite.role,
                clinicId: invite.clinicId ?? undefined,
                vetId: invite.vetId ?? undefined,
            },
        });
        // Issue JWT using shared helper
        const jwt = (0, jwt_1.signJwt)({
            userId: user.id,
            role: user.role,
            clinicId: user.clinicId,
            vetId: user.vetId,
        });
        return res.status(201).json({
            message: 'Account created from invite',
            token: jwt,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                clinicId: user.clinicId,
                vetId: user.vetId,
            },
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.flatten() });
        }
        console.error('[acceptInvite] error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.acceptInvite = acceptInvite;
