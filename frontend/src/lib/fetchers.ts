// src/lib/fetchers.ts
import { api, withIdempotency } from "./api";
import { v4 as uuidv4 } from "uuid";
import type {
  Appointment,
  OwnerAppointment,
  Pet,
  Slot,
  Clinic,
  Vet,
  SlotsResponse,
  ClinicSlotsResponse,
} from './types';

function unwrapArray<T>(data: unknown, field?: string): T[] {
  // If the whole payload is an array → use it
  if (Array.isArray(data)) {
    return data as T[];
  }

  // If it's an object with a field that is an array → use that
  if (
    field &&
    data &&
    typeof data === 'object' &&
    Array.isArray((data as any)[field])
  ) {
    return (data as any)[field] as T[];
  }

  // Fallback: nothing usable
  return [];
}


// ----- basic list fetchers -----

export async function getPets(): Promise<Pet[]> {
  const { data } = await api.get('/pets');
  return unwrapArray<Pet>(data, 'pets');
}


export async function getClinics(): Promise<Clinic[]> {
  const { data } = await api.get('/clinics');
  return unwrapArray<Clinic>(data, 'clinics');
}

export async function getVets(clinicId?: string): Promise<Vet[]> {
  const { data } = await api.get('/vets', {
    params: clinicId ? { clinicId } : {},
  });

  // supports both `Vet[]` and `{ vets: Vet[] }`
  const vets = unwrapArray<Vet>(data, 'vets');

  return clinicId ? vets.filter((v) => v.clinicId === clinicId) : vets;
}

// ----- create pets -----

export async function createPetForOwner(params: {
  name: string;
  species: string;
  breed?: string;
  birthDateYYYYMMDD: string;
}): Promise<Pet> {
  const { name, species, breed, birthDateYYYYMMDD } = params;

  // Convert YYYY-MM-DD to full ISO datetime at midnight
  const birthDateIso = new Date(`${birthDateYYYYMMDD}T00:00:00`).toISOString();

  const { data } = await api.post<Pet>('/pets', {
    name,
    species,
    breed: breed ?? null,
    birthDate: birthDateIso,
  });

  return data;
}

// ----- slots -----

export async function getVetSlots(
  vetId: string,
  date: string,
  duration = 30
): Promise<Slot[]> {
  const { data } = await api.get<SlotsResponse>(
    `/availability/vets/${vetId}/available-slots`,
    { params: { date, duration } }
  );

  // SlotsResponse: { vetId, date, duration, slots: string[] }
  return (data.slots ?? []).map((time) => ({ time }));
}

export async function getClinicSlots(
  clinicId: string,
  date: string,
  duration = 30,
  vetId?: string
): Promise<Slot[]> {
  const { data } = await api.get<ClinicSlotsResponse>(
    `/availability/clinics/${clinicId}/available-slots`,
    { params: { date, duration, ...(vetId ? { vetId } : {}) } }
  );

  const byVet = data.slotsByVet ?? {};

  if (vetId) {
    const raw = byVet[vetId] ?? [];
    return raw.map((time) => ({ time }));
  }

  const all: Slot[] = [];
  Object.values(byVet).forEach((arr) => {
    arr.forEach((time) => all.push({ time }));
  });
  return all;
}

// ----- appointments (owner + vet views) -----

export async function getMyAppointments(): Promise<OwnerAppointment[]> {
  const { data } = await api.get<{ appointments: OwnerAppointment[] }>(
    '/appointments'
  );
  return data.appointments;
}

export async function getMyVetAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<{ appointments: Appointment[] }>(
    '/appointments/vet'
  );
  return data.appointments;
}

// ----- create/update appointments -----

export async function createAppointment(payload: {
  dateUtcIso: string;
  duration: number;
  reason: string;
  emergency: boolean;
  petId: string;
  clinicId: string;
  vetId: string;
}): Promise<Appointment> {
  const idem = uuidv4();

  const body = {
    date: payload.dateUtcIso,
    duration: payload.duration,
    reason: payload.reason,
    emergency: payload.emergency,
    petId: payload.petId,
    clinicId: payload.clinicId,
    vetId: payload.vetId,
  };

  const { data } = await api.post<Appointment>(
    '/appointments',
    body,
    withIdempotency({}, idem)
  );
  return data;
}

export async function updateAppointmentStatus(
  id: string,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
): Promise<Appointment> {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/status`, {
    status,
  });
  return data;
}

export async function rescheduleAppointment(
  id: string,
  dateUtcIso: string,
  duration: number
): Promise<Appointment> {
  const { data } = await api.patch<Appointment>(`/appointments/${id}`, {
    date: dateUtcIso,
    duration,
  });
  return data;
}

// ----- notifications -----

export async function getNotificationPref(): Promise<{
  emailEnabled: boolean;
}> {
  const { data } = await api.get('/notifications/preferences');
  return { emailEnabled: data.emailEnabled };
}

export async function setNotificationPref(
  emailEnabled: boolean
): Promise<{ emailEnabled: boolean }> {
  const { data } = await api.patch('/notifications/preferences', {
    emailEnabled,
  });
  return { emailEnabled: data.emailEnabled };
}

// --- admin invite helpers ---

interface InviteClinicAdminPayload {
  email: string;
  clinicId: string;
}

export async function inviteClinicAdmin(payload: InviteClinicAdminPayload) {
  const { data } = await api.post('/admin/clinics/invite-admin', payload);
  return data;
}

interface InviteVetPayload {
  email: string;
  vetId: string;
}

export async function inviteVet(payload: InviteVetPayload) {
  const { data } = await api.post('/admin/vets/invite', payload);
  return data;
}
