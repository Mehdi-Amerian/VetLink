"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMe = void 0;
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const updateMeSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(200).optional(),
});
const updateMe = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId)
        return res.status(401).json({ message: "Unauthorized" });
    try {
        const patch = updateMeSchema.parse(req.body);
        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }
        const updated = await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: patch,
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                clinicId: true,
                vetId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.json({ user: updated });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        console.error("[users] updateMe error", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateMe = updateMe;
