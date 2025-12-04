// src/app/dashboard/super-admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { getClinics, inviteClinicAdmin } from '@/lib/fetchers';
import type { Clinic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

export default function SuperAdminDashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [emailByClinic, setEmailByClinic] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'SUPER_ADMIN') {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const data = await getClinics();
        setClinics(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError('Failed to load clinics');
      }
    })();
  }, [ready, user, router]);

  async function onInvite(clinicId: string) {
    const email = emailByClinic[clinicId]?.trim();
    if (!email) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await inviteClinicAdmin({ email, clinicId });
      setMessage(`Invite sent to ${email}`);
      setEmailByClinic((prev) => ({ ...prev, [clinicId]: '' }));
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          'Failed to send invite';
        setError(msg);
      } else {
        setError('Failed to send invite');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !user || user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Super admin dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Invite clinic admins for existing clinics.
      </p>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {clinics.map((clinic) => (
          <div
            key={clinic.id}
            className="border rounded-lg p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium">{clinic.name}</div>
              <div className="text-xs text-muted-foreground">
                {clinic.email} · {clinic.city}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
              <div>
                <Label className="text-xs">Admin email</Label>
                <Input
                  type="email"
                  value={emailByClinic[clinic.id] ?? ''}
                  onChange={(e) =>
                    setEmailByClinic((prev) => ({
                      ...prev,
                      [clinic.id]: e.target.value,
                    }))
                  }
                  placeholder="admin@example.com"
                  className="w-56"
                />
              </div>
              <Button
                size="sm"
                disabled={loading || !(emailByClinic[clinic.id] ?? '').trim()}
                onClick={() => onInvite(clinic.id)}
              >
                Send admin invite
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
