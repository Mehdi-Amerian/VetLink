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
    <div className="app-wrap">
      <div className="app-page space-y-4">
        <div className="app-header">
          <div>
            <h1 className="app-title">My Appointments</h1>
            <p className="app-subtitle">Track upcoming visits and review your pet appointment history.</p>
          </div>

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
