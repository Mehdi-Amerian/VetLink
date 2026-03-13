"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = getPreferences;
exports.updatePreferences = updatePreferences;
exports.unsubscribeEmailHandler = unsubscribeEmailHandler;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const zod_1 = require("zod");
const unsubscribe_1 = require("../services/unsubscribe");
async function getPreferences(req, res) {
    const userId = req.user.userId;
    const pref = await prismaClient_1.default.notificationPreference.upsert({
        where: { userId },
        create: { userId }, // defaults emailEnabled: true
        update: {},
    });
    res.json(pref);
}
const PrefSchema = zod_1.z.object({ emailEnabled: zod_1.z.boolean() });
async function updatePreferences(req, res) {
    const userId = req.user.userId;
    const { emailEnabled } = PrefSchema.parse(req.body);
    const pref = await prismaClient_1.default.notificationPreference.upsert({
        where: { userId },
        update: { emailEnabled },
        create: { userId, emailEnabled },
    });
    res.json(pref);
}
async function unsubscribeEmailHandler(req, res) {
    const { token } = req.params;
    try {
        const result = await (0, unsubscribe_1.consumeUnsubscribeToken)(token);
        if (!result.ok && result.code === 'INVALID') {
            return res.status(400).type('html').send(renderPage('Invalid link', 'This unsubscribe link is not valid.'));
        }
        if (!result.ok && result.code === 'EXPIRED') {
            return res.status(400).type('html').send(renderPage('Link expired', 'Please use a newer email.'));
        }
        if (result.userId) {
            await prismaClient_1.default.notificationPreference.upsert({
                where: { userId: result.userId },
                update: { emailEnabled: false },
                create: { userId: result.userId, emailEnabled: false },
            });
        }
        const title = result.code === 'ALREADY_USED' ? 'Already unsubscribed' : 'Unsubscribed';
        const msg = result.code === 'ALREADY_USED'
            ? 'Email reminders are already turned off for your account.'
            : 'You have been unsubscribed from email reminders.';
        return res.status(200).type('html').send(renderPage(title, msg));
    }
    catch (e) {
        console.error('[unsubscribe] error', e);
        return res.status(500).type('html').send(renderPage('Error', 'An error occurred. Please try again later.'));
    }
}
function renderPage(title, message) {
    return `
  <!doctype html>
  <html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;color:#111}
      .card{max-width:560px;margin:10vh auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
      h1{font-size:20px;margin:0 0 12px}
      p{margin:0}
    </style>
  </head>
  <body><div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </div></body></html>`;
}
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
