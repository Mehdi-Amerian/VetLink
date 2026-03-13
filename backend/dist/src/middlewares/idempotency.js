"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
const date_fns_1 = require("date-fns");
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const hash_1 = require("../utils/hash");
const IDEMPOTENCY_HEADER = 'idempotency-key';
const DEFAULT_TTL_HOURS = Number(process.env.IDEMPOTENCY_TTL_HOURS || 24);
async function idempotencyMiddleware(req, res, next) {
    if (req.method !== 'POST')
        return next();
    const key = req.header(IDEMPOTENCY_HEADER);
    if (!key) {
        return res.status(400).json({
            error: 'Bad Request',
            message: `Missing ${IDEMPOTENCY_HEADER} header`,
        });
    }
    const path = req.baseUrl + (req.route?.path ?? '');
    const method = req.method.toUpperCase();
    const bodyHash = (0, hash_1.hashJsonStable)(req.body ?? {});
    const userId = req.user?.userId ?? null;
    try {
        const existing = await prismaClient_1.default.idempotencyRequest.findUnique({ where: { key } });
        if (existing) {
            if (existing.method !== method || existing.path !== path) {
                return res.status(409).json({
                    error: 'Conflict',
                    message: 'Idempotency-Key reused across different endpoint',
                });
            }
            if (existing.bodyHash !== bodyHash) {
                return res.status(409).json({
                    error: 'Conflict',
                    message: 'Idempotency-Key reused with different request body',
                });
            }
            return res.status(existing.statusCode).json(existing.responseBody);
        }
        // Not seen -> capture outgoing response once
        const expiresAt = (0, date_fns_1.addHours)(new Date(), DEFAULT_TTL_HOURS);
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            try {
                await prismaClient_1.default.idempotencyRequest.create({
                    data: {
                        key,
                        userId,
                        method,
                        path,
                        bodyHash,
                        statusCode: res.statusCode || 200,
                        responseBody: body,
                        createdAt: new Date(),
                        expiresAt,
                    },
                });
            }
            catch (e) {
                // Race: another handler stored it first — replay winner
                const winner = await prismaClient_1.default.idempotencyRequest.findUnique({ where: { key } });
                if (winner) {
                    res.status(winner.statusCode);
                    return originalJson(winner.responseBody);
                }
                throw e;
            }
            return originalJson(body);
        };
        next();
    }
    catch (err) {
        console.error('[idempotency] middleware error', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Idempotency failure' });
    }
}
