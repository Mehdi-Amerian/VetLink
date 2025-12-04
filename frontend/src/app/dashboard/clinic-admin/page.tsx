'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { getVets, inviteVet } from '@/lib/fetchers';
import type { Vet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

export default function ClinicAdminDashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [vets, setVets] = useState<Vet[]>([]);
  const [emailByVet, setEmailByVet] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'CLINIC_ADMIN' || !user.clinicId) {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const data = await getVets(user.clinicId ?? '');
        setVets(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError('Failed to load vets');
      }
    })();
  }, [ready, user, router]);

  async function onInvite(vetId: string) {
    const email = emailByVet[vetId]?.trim();
    if (!email) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await inviteVet({ email, vetId });
      setMessage(`Invite sent to ${email}`);
      setEmailByVet((prev) => ({ ...prev, [vetId]: '' }));
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

  if (!ready || !user || user.role !== 'CLINIC_ADMIN') {
    return null;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Clinic admin dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Invite vets to activate their accounts for this clinic.
      </p>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {vets.map((vet) => (
          <div
            key={vet.id}
            className="border rounded-lg p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium">{vet.name}</div>
              {vet.specialization && (
                <div className="text-xs text-muted-foreground">
                  {vet.specialization}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
              <div>
                <Label className="text-xs">Vet email</Label>
                <Input
                  type="email"
                  value={emailByVet[vet.id] ?? ''}
                  onChange={(e) =>
                    setEmailByVet((prev) => ({
                      ...prev,
                      [vet.id]: e.target.value,
                    }))
                  }
                  placeholder="vet@example.com"
                  className="w-56"
                />
              </div>
              <Button
                size="sm"
                disabled={loading || !(emailByVet[vet.id] ?? '').trim()}
                onClick={() => onInvite(vet.id)}
              >
                Send vet invite
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
