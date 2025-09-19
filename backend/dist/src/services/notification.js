"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendRemindersForWindow = sendRemindersForWindow;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const date_fns_tz_1 = require("date-fns-tz");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const templates_1 = require("./templates");
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
const TZ = process.env.TIMEZONE || 'Europe/Helsinki';
async function sendEmail(to, subject, html) {
    await mail_1.default.send({ to, from: process.env.NOTIFY_FROM_EMAIL, subject, html });
}
async function sendRemindersForWindow(start, end) {
    const appts = await prismaClient_1.default.appointment.findMany({
        where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: { gte: start, lt: end },
        },
        include: { owner: true, pet: true, clinic: true },
    });
    for (const a of appts) {
        const pref = await prismaClient_1.default.notificationPreference.findUnique({ where: { userId: a.ownerId } });
        if (!pref?.emailEnabled || !a.owner.email)
            continue;
        const dateStr = (0, date_fns_tz_1.format)(a.date, 'yyyy-MM-dd HH:mm', { timeZone: TZ });
        const html = (0, templates_1.appointmentReminderTemplate)({
            ownerName: a.owner.fullName,
            petName: a.pet.name,
            dateStr,
            clinicName: a.clinic.name,
        });
        let success = true, detail;
        try {
            await sendEmail(a.owner.email, 'VetLink appointment reminder', html);
        }
        catch (err) {
            success = false;
            detail = err?.message || 'sendgrid_error';
        }
        finally {
            await prismaClient_1.default.notificationLog.create({
                data: { appointmentId: a.id, sentVia: 'email', success, detail },
            });
        }
    }
}
