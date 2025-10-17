import { Request, Response } from 'express';
import prisma from '../config/prismaClient';
import { z } from 'zod';
import { consumeUnsubscribeToken } from '../services/unsubscribe';

export async function getPreferences(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId }, // defaults emailEnabled: true
    update: {},
  });
  res.json(pref);
}

const PrefSchema = z.object({ emailEnabled: z.boolean() });

export async function updatePreferences(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { emailEnabled } = PrefSchema.parse(req.body);
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    update: { emailEnabled },
    create: { userId, emailEnabled },
  });
  res.json(pref);
}

export async function unsubscribeEmailHandler(req: Request, res: Response) {
  const { token } = req.params;
  try {
    const result = await consumeUnsubscribeToken(token);

    if (!result.ok && result.code === 'INVALID') {
      return res.status(400).type('html').send(renderPage('Invalid link', 'This unsubscribe link is not valid.'));
    }
    if (!result.ok && result.code === 'EXPIRED') {
      return res.status(400).type('html').send(renderPage('Link expired', 'Please use a newer email.'));
    }

    if (result.userId) {
      await prisma.notificationPreference.upsert({
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
  } catch (e) {
    console.error('[unsubscribe] error', e);
    return res.status(500).type('html').send(renderPage('Error', 'An error occurred. Please try again later.'));
  }
}

function renderPage(title: string, message: string) {
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
