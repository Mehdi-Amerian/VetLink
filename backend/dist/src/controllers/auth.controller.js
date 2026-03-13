"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const jwt_1 = require("../utils/jwt");
// Define the schema for user signup
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    fullName: zod_1.z.string(),
});
// User signup function
const signup = async (req, res) => {
    try {
        const data = signupSchema.parse(req.body);
        const existingUser = await prismaClient_1.prisma.user.findUnique({
            where: { email: data.email }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const user = await prismaClient_1.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                fullName: data.fullName,
                role: 'OWNER'
            }
        });
        const token = (0, jwt_1.signJwt)({ userId: user.id, role: user.role });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.signup = signup;
// Define the schema for user login
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
// User login function
const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prismaClient_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = (0, jwt_1.signJwt)({
            userId: user.id,
            role: user.role,
            clinicId: user.clinicId,
            vetId: user.vetId,
        });
        const authUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            clinicId: user.clinicId,
            vetId: user.vetId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        res.json({
            message: 'Login successful',
            token,
            user: authUser
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
// Get user profile function
const getMe = async (req, res) => {
    const userId = req.user?.userId;
    try {
        const user = await prismaClient_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const authUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            clinicId: user.clinicId,
            vetId: user.vetId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        res.json(authUser);
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMe = getMe;
