'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import { useAuth } from '@/providers/auth-provider';
import {
  getVetById,
  updateMyVetProfile,
  getAvailabilityForVet,
  addAvailabilityBlock,
} from '@/lib/fetchers';
import type { Vet, Availability, Weekday } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

const WEEKDAYS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export default function VetProfilePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [vet, setVet] = useState<Vet | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [addingAvail, setAddingAvail] = useState(false);

  const [newDay, setNewDay] = useState<Weekday>('MONDAY');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const canAddAvailability = useMemo(() => {
    if (!newStart || !newEnd) return false;
    // simple validation: start < end
    return newStart < newEnd;
  }, [newStart, newEnd]);

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

  async function onAddAvailability() {
    if (!canAddAvailability) return;
    if (!user?.vetId) return;

    setAddingAvail(true);
    setMessage(null);
    setError(null);

    try {
      const created = await addAvailabilityBlock({
        day: newDay,
        startTime: newStart,
        endTime: newEnd,
      });

      setAvailabilities((prev) => [...prev, created]);
      setMessage('Availability added');
      setNewStart('');
      setNewEnd('');
    } catch (e: unknown) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string } | undefined)?.message ??
          'Failed to add availability';
        setError(msg);
      } else {
        setError('Failed to add availability');
      }
    } finally {
      setAddingAvail(false);
    }
  }

  if (!ready || !user || user.role !== 'VET') {
    return null;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">My vet profile</h1>
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

      {/* ---- Availability ---- */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Availability</h2>
        <p className="text-sm text-muted-foreground">
          Define which days and times you are available for appointments.
        </p>

        {/* Add new availability block */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Day</Label>
            <Select
              value={newDay}
              onValueChange={(value) => setNewDay(value as Weekday)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start">Start time</Label>
            <Input
              id="start"
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end">End time</Label>
            <Input
              id="end"
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>

          <div>
            <Button
              className="w-full"
              onClick={onAddAvailability}
              disabled={!canAddAvailability || addingAvail}
            >
              {addingAvail ? 'Adding…' : 'Add block'}
            </Button>
          </div>
        </div>

        {/* Existing availability list */}
        <div className="mt-4 space-y-2">
          {availabilities.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No availability defined yet.
            </p>
          )}

          {availabilities.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1 pr-2">Day</th>
                  <th className="py-1 pr-2">Start</th>
                  <th className="py-1 pr-2">End</th>
                </tr>
              </thead>
              <tbody>
                {availabilities.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-1 pr-2">
                      {a.day.charAt(0) + a.day.slice(1).toLowerCase()}
                    </td>
                    <td className="py-1 pr-2">{a.startTime}</td>
                    <td className="py-1 pr-2">{a.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
