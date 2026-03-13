"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.buildReminderEmail = buildReminderEmail;
exports.sendRemindersForWindow = sendRemindersForWindow;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const date_fns_tz_1 = require("date-fns-tz");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const templates_1 = require("./templates");
const unsubscribe_1 = require("./unsubscribe");
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
const TZ = process.env.TIMEZONE || 'Europe/Helsinki';
const APP_URL = (process.env.APP_URL || 'http://localhost:4000').replace(/\/+$/, '');
async function sendEmail(to, subject, html) {
    await mail_1.default.send({ to, from: process.env.NOTIFY_FROM_EMAIL, subject, html });
}
async function buildReminderEmail(userId, toEmail, htmlBody) {
    const token = await (0, unsubscribe_1.createUnsubscribeToken)(userId, 30);
    const unsubscribeUrl = `${APP_URL}/api/notifications/unsubscribe/${token}`;
    const footer = `
    <p style="margin-top:16px;color:#666;font-size:12px">
      Don’t want email reminders? <a href="${unsubscribeUrl}">Unsubscribe</a>.
    </p>
  `;
    return {
        to: toEmail,
        subject: 'VetLink appointment reminder',
        html: htmlBody + footer,
    };
}
async function sendRemindersForWindow(start, end) {
    const appts = await prismaClient_1.default.appointment.findMany({
        where: {
            date: { gte: start, lt: end },
            cancelledAt: null,
        },
        include: { owner: true, pet: true, clinic: true },
    });
    for (const a of appts) {
        const owner = a.owner;
        if (!owner?.email)
            continue;
        // Check notification preferences (create default if missing)
        const pref = await prismaClient_1.default.notificationPreference.upsert({
            where: { userId: a.ownerId },
            update: {},
            create: { userId: a.ownerId, emailEnabled: true },
        });
        if (!pref.emailEnabled)
            continue;
        // Format appointment time in the clinic/user timezone (Helsinki for pilot)
        const dateStr = (0, date_fns_tz_1.formatInTimeZone)(a.date, TZ, 'yyyy-MM-dd HH:mm');
        // Build the core HTML from your template
        const baseHtml = (0, templates_1.appointmentReminderTemplate)({
            ownerName: owner.fullName,
            petName: a.pet.name,
            dateStr,
            clinicName: a.clinic.name,
        });
        // Append unsubscribe link
        const email = await buildReminderEmail(a.ownerId, owner.email, baseHtml);
        let success = true;
        let detail = undefined;
        try {
            await sendEmail(email.to, email.subject, email.html);
        }
        catch (err) {
            success = false;
            detail = err?.message || 'sendgrid_error';
            console.error('[sendReminders] send error', err);
        }
        finally {
            await prismaClient_1.default.notificationLog.create({
                data: { appointmentId: a.id, sentVia: 'email', success, detail },
            });
        }
    }
}
