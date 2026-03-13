"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnsubscribeToken = createUnsubscribeToken;
exports.consumeUnsubscribeToken = consumeUnsubscribeToken;
const crypto_1 = __importDefault(require("crypto"));
const date_fns_1 = require("date-fns");
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
async function createUnsubscribeToken(userId, days = 30) {
    const token = crypto_1.default.randomBytes(32).toString('hex'); // 64-char opaque
    const expiresAt = (0, date_fns_1.addDays)(new Date(), days);
    const row = await prismaClient_1.default.unsubscribeToken.create({
        data: { token, userId, expiresAt }
    });
    return row.token;
}
async function consumeUnsubscribeToken(token) {
    const row = await prismaClient_1.default.unsubscribeToken.findUnique({ where: { token } });
    if (!row)
        return { ok: false, code: 'INVALID' };
    if (row.usedAt)
        return { ok: true, code: 'ALREADY_USED', userId: row.userId }; // idempotent
    if (row.expiresAt < new Date())
        return { ok: false, code: 'EXPIRED' };
    // mark used
    await prismaClient_1.default.unsubscribeToken.update({
        where: { token },
        data: { usedAt: new Date() }
    });
    return { ok: true, code: 'OK', userId: row.userId };
}
