'use client';

import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthGate from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import VetAvailabilityCalendar from '@/components/ui/vetAvailabilityCalendar';
import { getAvailabilityForVet, getVetById, updateMyVetProfile } from '@/lib/fetchers';
import type { Availability, Vet } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

function VetProfileInner() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [vet, setVet] = useState<Vet | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadAvailability = useCallback(async () => {
    if (!user?.vetId) return;
    try {
      const availData = await getAvailabilityForVet(user.vetId);
      setAvailabilities(availData);
    } catch (reloadError) {
      console.error(reloadError);
      setError('Failed to refresh availability');
    }
  }, [user?.vetId]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const vetId = user.vetId;
    if (user.role !== 'VET' || !vetId) {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        setError(null);
        setMessage(null);

        const [vetData, availData] = await Promise.all([
          getVetById(vetId),
          getAvailabilityForVet(vetId),
        ]);

        setVet(vetData);
        setName(vetData.name ?? '');
        setSpecialization(vetData.specialization ?? '');
        setAvailabilities(availData);
      } catch (loadError) {
        console.error(loadError);
        setError('Failed to load vet profile or availability');
      }
    })();
  }, [ready, router, user]);

  const canSaveProfile = useMemo(() => name.trim().length > 0, [name]);

  async function onSaveProfile() {
    if (!canSaveProfile) return;
    setSavingProfile(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateMyVetProfile({
        name: name.trim(),
        specialization: specialization.trim() || null,
      });
      setVet(updated);
      setMessage('Profile updated');
    } catch (saveError: unknown) {
      console.error(saveError);
      if (axios.isAxiosError(saveError)) {
        const msg =
          (saveError.response?.data as { message?: string } | undefined)?.message ??
          'Failed to update profile';
        setError(msg);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setSavingProfile(false);
    }
  }

  if (!ready || !user || user.role !== 'VET') {
    return null;
  }

  return (
    <div className="app-wrap">
      <div className="app-page max-w-5xl space-y-6">
        <div className="app-header">
          <div>
            <h1 className="app-title">My Vet Profile</h1>
            <p className="app-subtitle">Keep your profile details and weekly availability up to date.</p>
          </div>
          <Link href="/dashboard/vet">
            <Button variant="outline" size="sm">
              Back to dashboard
            </Button>
          </Link>
        </div>

        {message && <div className="status-ok">{message}</div>}
        {error && <div className="status-error">{error}</div>}

        <section className="app-section space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#113a56]">Profile details</h2>
            {vet?.id && <p className="text-xs text-[#5d7b8e]">Vet ID: {vet.id}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="v-name">Name</Label>
              <Input
                id="v-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dr. Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-spec">Specialization</Label>
              <Input
                id="v-spec"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                placeholder="General practice, surgery, dermatology..."
              />
            </div>
          </div>

          <Button onClick={onSaveProfile} disabled={!canSaveProfile || savingProfile}>
            {savingProfile ? 'Saving...' : 'Save profile'}
          </Button>
        </section>

        <section className="app-section space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#113a56]">Availability</h2>
            <p className="text-sm text-[#5d7b8e]">
              Drag on the calendar to create slots. Drag or resize to adjust, and click a slot to delete.
            </p>
          </div>

          <VetAvailabilityCalendar availability={availabilities} onChanged={reloadAvailability} />
        </section>
      </div>
    </div>
  );
}

export default function VetProfilePage() {
  return (
    <AuthGate roles={['VET']}>
      <VetProfileInner />
    </AuthGate>
  );
}
