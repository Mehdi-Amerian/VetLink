"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleReminderJob = scheduleReminderJob;
const node_cron_1 = __importDefault(require("node-cron"));
const notification_1 = require("../services/notification");
const TZ = process.env.TIMEZONE || 'Europe/Helsinki';
/** Schedule the daily reminder at 09:00 local time */
function scheduleReminderJob() {
    node_cron_1.default.schedule('0 9 * * *', async () => {
        const now = new Date();
        const start = now;
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await (0, notification_1.sendRemindersForWindow)(start, end);
    }, { timezone: TZ });
}
