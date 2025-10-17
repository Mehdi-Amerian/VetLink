import prisma from '../config/prismaClient';
import { formatInTimeZone } from 'date-fns-tz';
import sendgrid from '@sendgrid/mail';
import { appointmentReminderTemplate } from './templates';
import { createUnsubscribeToken } from './unsubscribe';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

const TZ = process.env.TIMEZONE || 'Europe/Helsinki';
const APP_URL = (process.env.APP_URL || 'http://localhost:4000').replace(/\/+$/, '');

export async function sendEmail(to: string, subject: string, html: string) {
  await sendgrid.send({ to, from: process.env.NOTIFY_FROM_EMAIL!, subject, html });
}

export async function buildReminderEmail(userId: string, toEmail: string, htmlBody: string) {
  const token = await createUnsubscribeToken(userId, 30);
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

export async function sendRemindersForWindow(start: Date, end: Date) {
  const appts = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      date:   { gte: start, lt: end },
    },
    include: { owner: true, pet: true, clinic: true },
  });

  for (const a of appts) {
    const owner = a.owner;
    if (!owner?.email) continue;

    // Check notification preferences (create default if missing)
    const pref = await prisma.notificationPreference.upsert({
      where: { userId: a.ownerId },
      update: {},
      create: { userId: a.ownerId, emailEnabled: true },
    });
    if (!pref.emailEnabled) continue;

    // Format appointment time in the clinic/user timezone (Helsinki for pilot)
    const dateStr = formatInTimeZone(a.date, TZ, 'yyyy-MM-dd HH:mm');

    // Build the core HTML from your template
    const baseHtml = appointmentReminderTemplate({
      ownerName: owner.fullName,
      petName: a.pet.name,
      dateStr,
      clinicName: a.clinic.name,
    });

    // Append unsubscribe link
    const email = await buildReminderEmail(a.ownerId, owner.email, baseHtml);

    let success = true;
    let detail: string | undefined = undefined;

    try {
      await sendEmail(email.to, email.subject, email.html);
    } catch (err: any) {
      success = false;
      detail = err?.message || 'sendgrid_error';
      console.error('[sendReminders] send error', err);
    } finally {
      await prisma.notificationLog.create({
        data: { appointmentId: a.id, sentVia: 'email', success, detail },
      });
    }
  }
}
