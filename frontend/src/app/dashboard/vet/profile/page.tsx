'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

import { useAuth } from '@/providers/auth-provider';
import {
  getVetById,
  updateMyVetProfile,
  getAvailabilityForVet,
} from '@/lib/fetchers';
import type { Vet, Availability} from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import VetAvailabilityCalendar from "@/components/ui/vetAvailabilityCalendar";

export default function VetProfilePage() {
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
    const availData = await getAvailabilityForVet(user.vetId);
    setAvailabilities(availData);
  }, [user?.vetId]);

  // redirect guards
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'VET' || !user.vetId) {
      router.replace('/');
      return;
    }

    (async () => {
      try {
        setError(null);
        setMessage(null);

        const [vetData, availData] = await Promise.all([
          getVetById(user.vetId!),
          getAvailabilityForVet(user.vetId!),
        ]);

        setVet(vetData);
        setName(vetData.name);
        setSpecialization(vetData.specialization ?? '');
        setAvailabilities(availData);
      } catch (e) {
        console.error(e);
        setError('Failed to load vet profile or availability');
      }
    })();
  }, [ready, user, router]);

  const canSaveProfile = useMemo(() => {
    if (!name.trim()) return false;
    return true;
  }, [name]);

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
    } catch (e: unknown) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
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
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My vet profile</h1>
        <Link href="/dashboard/vet">
          <Button variant="outline" size="sm">
            Back to dashboard
          </Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Update your professional details and manage your working hours.
      </p>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ---- Profile form ---- */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="v-name">Name</Label>
            <Input
              id="v-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="v-spec">Specialization</Label>
            <Input
              id="v-spec"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="General practice, surgery, ..."
            />
          </div>
        </div>

        <Button onClick={onSaveProfile} disabled={!canSaveProfile || savingProfile}>
          {savingProfile ? 'Saving…' : 'Save profile'}
        </Button>
      </section>

       {/* ---- Availability (FullCalendar) ---- */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Availability</h2>
        <p className="text-sm text-muted-foreground">
          Drag to create availability. Drag/resize to edit. Click a block to delete.
        </p>

        <VetAvailabilityCalendar
          availability={availabilities}
          onChanged={reloadAvailability}
        />
      </section>
    </div>
  );
}
