'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import SlotPicker from './SlotPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  createAppointment,
  getClinics,
  getPets,
  getVets,
} from '@/lib/fetchers';
import { localDateTimeToUtcIso } from '@/lib/time';
import type { Clinic, Pet, Vet } from '@/lib/types';

export default function AppointmentForm() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);

  const [clinicId, setClinicId] = useState('');
  const [vetId, setVetId] = useState('');
  const [petId, setPetId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [emergency, setEmergency] = useState(false);

  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingVets, setLoadingVets] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);

  const reasonTrimmed = reason.trim();

  const canSubmit = useMemo(
    () =>
      Boolean(clinicId) &&
      Boolean(vetId) &&
      Boolean(petId) &&
      Boolean(date) &&
      Boolean(time) &&
      reasonTrimmed.length > 0,
    [clinicId, vetId, petId, date, time, reasonTrimmed.length]
  );

  useEffect(() => {
    (async () => {
      setLoadingBase(true);
      try {
        const [petsData, clinicsData] = await Promise.all([getPets(), getClinics()]);
        setPets(petsData);
        setClinics(clinicsData);
      } catch (loadError) {
        console.error(loadError);
        setError('Failed to load pets or clinics');
      } finally {
        setLoadingBase(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!clinicId) {
      setVets([]);
      setVetId('');
      setTime('');
      return;
    }

    (async () => {
      setLoadingVets(true);
      try {
        const vetsData = await getVets(clinicId);
        setVets(vetsData);

        if (vetsData.length === 0) {
          setVetId('');
        } else if (!vetsData.some((vet) => vet.id === vetId)) {
          setVetId(vetsData[0].id);
        }
      } catch (loadError) {
        console.error(loadError);
        setError('Failed to load vets for selected clinic');
      } finally {
        setLoadingVets(false);
      }
    })();
  }, [clinicId, vetId]);

  useEffect(() => {
    setTime('');
  }, [clinicId, vetId, date]);

  async function onSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const dateUtcIso = localDateTimeToUtcIso(date, time);
      await createAppointment({
        dateUtcIso,
        reason: reasonTrimmed,
        emergency,
        petId,
        clinicId,
        vetId,
      });

      setMessage('Appointment booked successfully');
      setTime('');
      setReason('');
      setEmergency(false);
    } catch (submitError: unknown) {
      if (axios.isAxiosError(submitError)) {
        const apiMessage =
          (submitError.response?.data as { message?: string } | undefined)?.message ??
          'Failed to create appointment';
        setError(apiMessage);
      } else {
        setError('Failed to create appointment');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingBase) {
    return <p className="text-sm text-[#5d7b8e]">Loading booking form...</p>;
  }

  return (
    <div className="space-y-5">
      {message && <div className="status-ok">{message}</div>}
      {error && <div className="status-error">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <Label>Clinic</Label>
          <Select
            value={clinicId}
            onValueChange={(value) => {
              setClinicId(value);
              setMessage(null);
              setError(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select clinic" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label>Vet</Label>
          <Select
            value={vetId}
            onValueChange={setVetId}
            disabled={!clinicId || loadingVets || vets.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  loadingVets
                    ? 'Loading vets...'
                    : clinicId
                      ? 'Select vet'
                      : 'Choose clinic first'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {vets.map((vet) => (
                <SelectItem key={vet.id} value={vet.id}>
                  {vet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label>Pet</Label>
          <Select value={petId} onValueChange={setPetId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select pet" />
            </SelectTrigger>
            <SelectContent>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  {pet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} min={today} onChange={(event) => setDate(event.target.value)} />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[#d6e4eb] bg-[#f8fbfc] px-3 py-2 md:self-end">
          <Switch checked={emergency} onCheckedChange={setEmergency} />
          <span className="text-sm font-medium text-[#1f485f]">Emergency appointment</span>
        </label>
      </div>

      {clinicId && date && (
        <div className="space-y-2 rounded-xl border border-[#d6e4ec] bg-[#f8fbfc] p-4">
          <Label>Available times</Label>
          <SlotPicker
            clinicId={clinicId}
            vetId={vetId || undefined}
            date={date}
            selectedTime={time}
            onPick={setTime}
          />
          {time && (
            <p className="text-sm text-[#23516b]">
              Selected time: <span className="font-semibold">{date} {time}</span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Reason</Label>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Vaccination, check-up, skin issue..."
        />
      </div>

      <Button disabled={!canSubmit || submitting} onClick={onSubmit}>
        {submitting ? 'Booking...' : 'Book appointment'}
      </Button>
    </div>
  );
}
