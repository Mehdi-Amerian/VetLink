import { api, withIdempotency } from './api';
import type { Appointment, Pet, Slot, Clinic, Vet } from './types';
import { v4 as uuidv4 } from 'uuid';

export async function getPets(): Promise<Pet[]> {
const { data } = await api.get('/pets');
return data;
}

export async function getClinics(): Promise<Clinic[]> {
  const { data } = await api.get('/clinics');
  return data;
}

export async function getVets(clinicId?: string): Promise<Vet[]> {
  const { data } = await api.get('/vets', {
    params: clinicId ? { clinicId } : {},
  });
  return data;
}

export async function getVetSlots(vetId: string, date: string, duration = 30): Promise<Slot[]> {
const { data } = await api.get(`/availability/vets/${vetId}/available-slots`, { params: { date, duration } });
return data;
}


export async function getClinicSlots(clinicId: string, date: string, duration = 30, vetId?: string): Promise<Slot[]> {
const { data } = await api.get(`/availability/clinics/${clinicId}/available-slots`, {
params: { date, duration, ...(vetId ? { vetId } : {}) },
});
return data;
}


export async function getMyAppointments(): Promise<Appointment[]> {
const { data } = await api.get('/appointments');
return data;
}


export async function getMyVetAppointments(): Promise<Appointment[]> {
const { data } = await api.get('/appointments/vet');
return data;
}


export async function createAppointment(payload: {
dateUtcIso: string; // server expects UTC or naive -> we send UTC to be explicit
duration: number;
reason: string;
emergency: boolean;
petId: string;
clinicId: string;
vetId: string;
}) {
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


export async function updateAppointmentStatus(id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') {
const { data } = await api.patch(`/appointments/${id}/status`, { status });
return data as Appointment;
}


export async function rescheduleAppointment(id: string, dateUtcIso: string, duration: number) {
const { data } = await api.patch(`/appointments/${id}`, { date: dateUtcIso, duration });
return data as Appointment;
}


export async function getNotificationPref(): Promise<{ emailEnabled: boolean }> {
const { data } = await api.get('/notifications/preferences');
return data;
}


export async function setNotificationPref(emailEnabled: boolean): Promise<{ emailEnabled: boolean }> {
const { data } = await api.patch('/notifications/preferences', { emailEnabled });
return data;
}