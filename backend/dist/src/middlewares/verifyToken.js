"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaClient_1 = require("../config/prismaClient");
const verifyToken = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing token', code: 'TOKEN_MISSING' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Confirm user still exists
        const user = await prismaClient_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { vetId: true, clinicId: true, role: true }
        });
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists', code: 'USER_NOT_FOUND' });
        }
        // Attach session-like object to req
        req.user = {
            userId: decoded.userId,
            role: user.role,
            vetId: user.vetId,
            clinicId: user.clinicId
        };
        return next();
    }
    catch (err) {
        // jwt.verify throws JsonWebTokenError / TokenExpiredError
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                message: "Token expired",
                code: "TOKEN_EXPIRED",
            });
        }
        return res.status(401).json({
            message: "Invalid token",
            code: "TOKEN_INVALID",
        });
    }
};
exports.verifyToken = verifyToken;
