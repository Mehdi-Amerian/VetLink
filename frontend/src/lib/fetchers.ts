import { api, withIdempotency } from './api';
import type { Appointment, Pet, Slot, Clinic, Vet } from './types';
import { v4 as uuidv4 } from 'uuid';

// Generic helper to extract an array either from the root or from a named field
function unwrapArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

// Slots helper: backend returns { ..., slots: ["09:00", "09:30"] }
function unwrapSlots(data: unknown): Slot[] {
  if (Array.isArray(data)) {
    return data as Slot[];
  }

  if (data && typeof data === 'object') {
    const rawSlots = (data as Record<string, unknown>)['slots'];
    if (Array.isArray(rawSlots)) {
      // Map "09:00" -> { time: "09:00" }
      return rawSlots.map((s) => ({ time: String(s) })) as Slot[];
    }
  }

  return [];
}

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
  return unwrapArray<Vet>(data, 'vets');
}

export async function getVetSlots(
  vetId: string,
  date: string,
  duration = 30
): Promise<Slot[]> {
  const { data } = await api.get(`/availability/vets/${vetId}/available-slots`, {
    params: { date, duration },
  });
  return unwrapSlots(data);
}

export async function getClinicSlots(
  clinicId: string,
  date: string,
  duration = 30,
  vetId?: string
): Promise<Slot[]> {
  const { data } = await api.get(`/availability/clinics/${clinicId}/available-slots`, {
    params: { date, duration, ...(vetId ? { vetId } : {}) },
  });
  return unwrapSlots(data);
}

export async function getMyAppointments(): Promise<Appointment[]> {
  const { data } = await api.get('/appointments');
  return unwrapArray<Appointment>(data, 'appointments');
}

export async function getMyVetAppointments(): Promise<Appointment[]> {
  const { data } = await api.get('/appointments/vet');
  return unwrapArray<Appointment>(data, 'appointments');
}

export async function createAppointment(payload: {
  dateUtcIso: string; // server expects local ISO; we send explicit UTC or local HH:mm converted
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

  const { data } = await api.post('/appointments', body, withIdempotency({}, idem));
  return data as Appointment;
}

export async function updateAppointmentStatus(
  id: string,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}/status`, { status });
  return data as Appointment;
}

export async function rescheduleAppointment(
  id: string,
  dateUtcIso: string,
  duration: number
): Promise<Appointment> {
  const { data } = await api.patch(`/appointments/${id}`, {
    date: dateUtcIso,
    duration,
  });
  return data as Appointment;
}

export async function getNotificationPref(): Promise<{ emailEnabled: boolean }> {
  const { data } = await api.get('/notifications/preferences');
  return data;
}

export async function setNotificationPref(
  emailEnabled: boolean
): Promise<{ emailEnabled: boolean }> {
  const { data } = await api.patch('/notifications/preferences', { emailEnabled });
  return data;
}
