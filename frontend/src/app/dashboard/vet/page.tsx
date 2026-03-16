'use client';

import { useCallback } from 'react';
import Link from 'next/link';

import AuthGate from '@/components/auth/AuthGate';
import AppointmentsBoard from '@/components/appointments/AppointmentsBoard';
import { getMyVetAppointments } from '@/lib/fetchers';
import { Button } from '@/components/ui/button';

function VetView() {
  const loadAppointments = useCallback(
    (params: { view: 'upcoming' | 'history'; page: number; pageSize: number }) =>
      getMyVetAppointments(params),
    []
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Vet Appointments</h1>

        <Link href="/dashboard/vet/profile">
          <Button variant="outline" size="sm">
            Edit profile & availability
          </Button>
        </Link>
      </div>

      <AppointmentsBoard role="VET" loadAppointments={loadAppointments} />
    </div>
  );
}

export default function VetDashboard() {
  return (
    <AuthGate roles={['VET']}>
      <VetView />
    </AuthGate>
  );
}
