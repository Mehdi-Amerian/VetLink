import crypto from 'crypto';
import { addDays } from 'date-fns';
import prisma from '../config/prismaClient';
import { Role } from '@prisma/client';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const inviteFromEmail = process.env.INVITE_FROM_EMAIL;
const inviteAppUrl = process.env.INVITE_APP_URL?.replace(/\/+$/, '');

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function roleLabel(role: Role): string {
  if (role === Role.CLINIC_ADMIN) return 'clinic admin';
  if (role === Role.VET) return 'vet';
  return role.toLowerCase();
}

function buildInviteEmail(params: { role: Role; acceptUrl: string; expiresAt: Date }) {
  const roleText = roleLabel(params.role);
  const expiresAtIso = params.expiresAt.toISOString();

  return {
    subject: 'You are invited to VetLink',
    text: [
      `You have been invited to join VetLink as a ${roleText}.`,
      `Use this link to activate your account: ${params.acceptUrl}`,
      `This invite expires at ${expiresAtIso}.`,
    ].join('\n'),
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5">
        <h2 style="margin:0 0 12px">You are invited to VetLink</h2>
        <p style="margin:0 0 12px">You have been invited to join VetLink as a <strong>${roleText}</strong>.</p>
        <p style="margin:0 0 16px">
          <a href="${params.acceptUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
            Accept invite
          </a>
        </p>
        <p style="margin:0 0 8px">Or open this URL:</p>
        <p style="margin:0 0 16px;word-break:break-all"><a href="${params.acceptUrl}">${params.acceptUrl}</a></p>
        <p style="margin:0;color:#666;font-size:12px">This invite expires at ${expiresAtIso}.</p>
      </div>
    `,
  };
}

async function sendInviteEmail(params: {
  email: string;
  role: Role;
  token: string;
  expiresAt: Date;
}) {
  if (!resend) {
    throw new Error('Missing RESEND_API_KEY for invite emails');
  }
  if (!inviteFromEmail) {
    throw new Error('Missing INVITE_FROM_EMAIL for invite emails');
  }
  if (!inviteAppUrl) {
    throw new Error('Missing INVITE_APP_URL for invite emails');
  }

  const acceptUrl = `${inviteAppUrl}/accept-invite?token=${encodeURIComponent(params.token)}`;
  const emailPayload = buildInviteEmail({
    role: params.role,
    acceptUrl,
    expiresAt: params.expiresAt,
  });

  const { error } = await resend.emails.send({
    from: inviteFromEmail,
    to: params.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
  });

  if (error) {
    throw new Error(`Resend invite email failed: ${error.message}`);
  }
}

export async function createInvite(params: {
  email: string;
  role: Role;
  clinicId?: string;
  vetId?: string;
  expiresInDays?: number;
}) {
  const token = crypto.randomBytes(32).toString('hex'); // opaque 64 chars
  const expiresAt = addDays(new Date(), params.expiresInDays ?? 7);

  const invite = await prisma.invite.create({
    data: {
      token,
      email: params.email.toLowerCase(),
      role: params.role,
      clinicId: params.clinicId,
      vetId: params.vetId,
      expiresAt,
    },
  });

  try {
    await sendInviteEmail({
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    // Keep DB and email state aligned: delete unsent invite so caller can retry.
    await prisma.invite.delete({ where: { id: invite.id } }).catch((cleanupErr) => {
      console.error('[invite] failed to cleanup unsent invite', cleanupErr);
    });
    throw err;
  }

  return invite;
}

export async function consumeInvite(token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) return { ok: false, code: 'INVALID' as const };
  if (invite.usedAt) return { ok: false, code: 'USED' as const };
  if (invite.expiresAt < new Date()) return { ok: false, code: 'EXPIRED' as const };

  await prisma.invite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return { ok: true, invite } as const;
}
