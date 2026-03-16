'use client';

import { useCallback } from 'react';
import Link from 'next/link';

import AuthGate from '@/components/auth/AuthGate';
import AppointmentsBoard from '@/components/appointments/AppointmentsBoard';
import { getMyAppointments } from '@/lib/fetchers';
import { Button } from '@/components/ui/button';

function OwnerView() {
  const loadAppointments = useCallback(
    (params: { view: 'upcoming' | 'history'; page: number; pageSize: number }) =>
      getMyAppointments(params),
    []
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">My Appointments</h1>

        <div className="flex items-center gap-2">
          <Link href="/appointments/book">
            <Button>Book new</Button>
          </Link>
          <Link href="/dashboard/owner/profile">
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </Link>
        </div>
      </div>

      <AppointmentsBoard role="OWNER" loadAppointments={loadAppointments} />
    </div>
  );
}

export default function OwnerDashboard() {
  return (
    <AuthGate roles={['OWNER']}>
      <OwnerView />
    </AuthGate>
  );
}
