"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// src/config/prismaClient.ts
const client_1 = require("@prisma/client");
exports.prisma = global.prisma ??
    new client_1.PrismaClient({
    // Optional: enable query logging in non-production
    // log: process.env.NODE_ENV === 'production' ? [] : ['query', 'info', 'warn', 'error'],
    });
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
exports.default = exports.prisma;
