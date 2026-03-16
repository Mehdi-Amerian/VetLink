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
    <div className="app-wrap">
      <div className="app-page space-y-4">
        <div className="app-header">
          <div>
            <h1 className="app-title">Vet Appointments</h1>
            <p className="app-subtitle">Stay on top of today&apos;s schedule and revisit past consultations.</p>
          </div>

          <Link href="/dashboard/vet/profile">
            <Button variant="outline" size="sm">
              Edit profile and availability
            </Button>
          </Link>
        </div>

        <AppointmentsBoard role="VET" loadAppointments={loadAppointments} />
      </div>
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
