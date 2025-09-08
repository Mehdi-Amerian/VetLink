import sendgrid from '@sendgrid/mail';
import { prisma } from '../config/prismaClient';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await sendgrid.send({ to, from: process.env.NOTIFY_FROM_EMAIL!, subject, html });
    return { success: true as const, detail: undefined };
  } catch (err: any) {
    return { success: false as const, detail: err?.message || 'sendgrid_error' };
  }
}

export async function logNotification(appointmentId: string, success: boolean, detail?: string) {
  await prisma.notificationLog.create({
    data: { appointmentId, sentVia: 'email', success, detail },
  });
}