import prisma from '../config/prismaClient';
import { format } from 'date-fns-tz';
import sendgrid from '@sendgrid/mail';
import { appointmentReminderTemplate } from './templates';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);
const TZ = process.env.TIMEZONE || 'Europe/Helsinki';

export async function sendEmail(to: string, subject: string, html: string) {
  await sendgrid.send({ to, from: process.env.NOTIFY_FROM_EMAIL!, subject, html });
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
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: a.ownerId } });
    if (!pref?.emailEnabled || !a.owner.email) continue;

    const dateStr = format(a.date, 'yyyy-MM-dd HH:mm', { timeZone: TZ });
    const html = appointmentReminderTemplate({
      ownerName: a.owner.fullName,
      petName: a.pet.name,
      dateStr,
      clinicName: a.clinic.name,
    });

    let success = true, detail: string | undefined;
    try {
      await sendEmail(a.owner.email, 'VetLink appointment reminder', html);
    } catch (err: any) {
      success = false; detail = err?.message || 'sendgrid_error';
    } finally {
      await prisma.notificationLog.create({
        data: { appointmentId: a.id, sentVia: 'email', success, detail },
      });
    }
  }
}