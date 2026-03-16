import type { components } from '../../../backend/src/sdk/types';

export type Role = components['schemas']['Role'];

export type User = components['schemas']['User'];
export type Clinic = components['schemas']['Clinic'];
export type Vet = components['schemas']['Vet'];
export type Pet = components['schemas']['Pet'];
export type Appointment = components['schemas']['Appointment'];

export type LoginResponse = components['schemas']['AuthResponse'];

export type SlotsResponse = components['schemas']['SlotsResponse'];
export type ClinicSlotsResponse = components['schemas']['ClinicSlotsResponse'];

// UI-only slot representation
export interface Slot {
  time: string; // 'HH:mm' for the selected date in local time
}

// UI-friendly appointment including expansions.
export interface DashboardAppointment extends Appointment {
  cancelledAt?: string | null;
  pet?: Pet;
  vet?: Vet;
  owner?: User;
  clinic?: Clinic;
}

export type AppointmentView = 'upcoming' | 'history';

export interface AppointmentPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface AppointmentsPage<T = DashboardAppointment> {
  appointments: T[];
  pagination: AppointmentPagination;
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
