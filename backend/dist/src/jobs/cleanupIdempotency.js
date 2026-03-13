"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleIdempotencyCleanup = scheduleIdempotencyCleanup;
const node_cron_1 = __importDefault(require("node-cron"));
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const CRON_SCHEDULE = process.env.IDEMPOTENCY_CLEANUP_CRON || '15 3 * * *'; // daily 03:15
function scheduleIdempotencyCleanup() {
    node_cron_1.default.schedule(CRON_SCHEDULE, async () => {
        try {
            const deleted = await prismaClient_1.default.idempotencyRequest.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            });
            if (deleted.count > 0) {
                console.log(`[idempotency] cleaned ${deleted.count} expired keys`);
            }
        }
        catch (err) {
            console.error('[idempotency] cleanup failed', err);
        }
    });
}
