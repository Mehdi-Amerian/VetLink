import type { components } from '../../../backend/src/sdk/types';

export type Role = components['schemas']['Role'];

export type User = components['schemas']['User'];
export type Clinic = components['schemas']['Clinic'];
export type Vet = components['schemas']['Vet'];
export type Pet = components['schemas']['Pet'];
export type Appointment = components['schemas']['Appointment'];
export type AppointmentStatus = components['schemas']['AppointmentStatus'];

export type LoginResponse = components['schemas']['AuthResponse'];

export type SlotsResponse = components['schemas']['SlotsResponse'];
export type ClinicSlotsResponse = components['schemas']['ClinicSlotsResponse'];

// UI-only slot representation
export interface Slot {
  time: string; // 'HH:mm' for the selected date in local time
}

//UI-friendly appointment including expansions
export interface OwnerAppointment extends Appointment {
  pet?: Pet;
  vet?: Vet;
  clinic?: Clinic;
}

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface Availability {
  id: string;
  day: Weekday;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  vetId: string;
}
