'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { getClinics, getPets, getVets, createAppointment } from '@/lib/fetchers';
import SlotPicker from './SlotPicker';
import { localDateTimeToUtcIso } from '@/lib/time';
import axios from 'axios';


export default function AppointmentForm() {
const [pets, setPets] = useState<{ id: string; name: string }[]>([]);
const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
const [vets, setVets] = useState<{ id: string; fullName: string }[]>([]);


const [clinicId, setClinicId] = useState<string>('');
const [vetId, setVetId] = useState<string>('');
const [petId, setPetId] = useState<string>('');
const [date, setDate] = useState<string>(''); // YYYY-MM-DD
const [time, setTime] = useState<string>(''); // HH:mm
const [duration, setDuration] = useState<number>(30);
const [reason, setReason] = useState<string>('');
const [emergency, setEmergency] = useState<boolean>(false);
const [submitting, setSubmitting] = useState(false);
const canSubmit = useMemo(() => clinicId && vetId && petId && date && time && duration > 0 && reason.length > 0, [clinicId, vetId, petId, date, time, duration, reason]);


useEffect(() => {
(async () => {
const [pets, clinics] = await Promise.all([getPets(), getClinics()]);
setPets(pets);
setClinics(clinics);
})();
}, []);


useEffect(() => {
if (!clinicId) { setVets([]); setVetId(''); return; }
(async () => setVets(await getVets(clinicId)))();
}, [clinicId]);


async function onSubmit() {
if (!canSubmit) return;
setSubmitting(true);
try {
const dateUtcIso = localDateTimeToUtcIso(date, time);
await createAppointment({ dateUtcIso, duration, reason, emergency, petId, clinicId, vetId });
alert('Appointment created!');
} catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      const message =
        (e.response?.data as { message?: string } | undefined)?.message ??
        'Failed to create appointment';
      alert(message);
    } else {
      alert('Failed to create appointment');
    }
  } finally {
    setSubmitting(false);
  }
}


return (
  <div className="space-y-4">
    <div>
      <Label>Clinic</Label>
      <Select value={clinicId} onValueChange={setClinicId}>
        <SelectTrigger>
          <SelectValue placeholder="Select clinic" />
        </SelectTrigger>
        <SelectContent>
          {clinics.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Vet</Label>
      <Select value={vetId} onValueChange={setVetId}>
        <SelectTrigger>
          <SelectValue placeholder="Select vet" />
        </SelectTrigger>
        <SelectContent>
          {vets.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Pet</Label>
      <Select value={petId} onValueChange={setPetId}>
        <SelectTrigger>
          <SelectValue placeholder="Select pet" />
        </SelectTrigger>
        <SelectContent>
          {pets.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <Label>Duration (min)</Label>
        <Input
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) =>
            setDuration(parseInt(e.target.value || "0", 10))
          }
        />
      </div>
    </div>

    {clinicId && date && (
      <div className="space-y-2">
        <Label>Available times</Label>
        <SlotPicker
          clinicId={clinicId}
          vetId={vetId || undefined}
          date={date}
          duration={duration}
          onPick={setTime}
        />
        {time && (
          <div className="text-sm">
            Selected: {date} {time}
          </div>
        )}
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Reason</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Vaccination"
        />
      </div>
      <div className="flex items-end gap-2">
        <input
          id="emg"
          type="checkbox"
          checked={emergency}
          onChange={(e) => setEmergency(e.target.checked)}
        />
        <Label htmlFor="emg">Emergency</Label>
      </div>
    </div>

    <Button disabled={!canSubmit || submitting} onClick={onSubmit}>
      Book appointment
    </Button>
  </div>
);
}