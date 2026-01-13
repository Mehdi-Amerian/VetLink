'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthGate from '@/components/auth/AuthGate';
import type { Appointment } from '@/lib/types';
import { getMyVetAppointments, updateAppointmentStatus } from '@/lib/fetchers';
import { serverUtcToLocalLabel } from '@/lib/time';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import Link from 'next/link';

function VetView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyVetAppointments();
      setAppointments(data);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        // eslint-disable-next-line no-console
        console.error('Failed to load vet appointments', e.response?.data ?? e.message);
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to load vet appointments', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = useCallback(
    async (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
      try {
        await updateAppointmentStatus(id, status);
        await load();
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          alert(
            (e.response?.data as { message?: string } | undefined)?.message ??
              'Failed to update status'
          );
        } else {
          alert('Failed to update status');
        }
      }
    },
    [load]
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <Link href="/dashboard/vet/profile">
        <Button variant="outline" size="sm">
          Edit profile & availability
       </Button>
      </Link>
      <h1 className="text-xl font-semibold">Vet Appointments</h1>

      {loading && appointments.length === 0 && (
        <p className="text-sm text-gray-500">Loading appointments…</p>
      )}

      {appointments.length === 0 && !loading && (
        <p className="text-sm text-gray-500">No appointments found.</p>
      )}

      {appointments.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">
                {serverUtcToLocalLabel(a.date)} → {serverUtcToLocalLabel(a.endTime)}
              </div>
              <div className="text-sm text-gray-500">
                {a.reason} • {a.status}
                {a.pet?.name ? ` • ${a.pet.name}` : null}
                {a.ownerId ? ` • Owner: ${a.ownerId.slice(0, 8)}…` : null}
              </div>
            </div>
            <div className="flex gap-2">
              {a.status === 'PENDING' && (
                <Button
                  size="sm"
                  onClick={() => updateStatus(a.id, 'CONFIRMED')}
                >
                  Confirm
                </Button>
              )}
              {a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(a.id, 'COMPLETED')}
                  >
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus(a.id, 'CANCELLED')}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function VetDashboard() {
  return (
    <AuthGate roles={['VET', 'CLINIC_ADMIN']}>
      <VetView />
    </AuthGate>
  );
}
