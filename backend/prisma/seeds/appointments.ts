export interface AppointmentData {
  ownerEmail: string;    // links to ownerUsers.ts
  petName: string;       // name of the pet (unique per owner)
  clinicEmail: string;   // links to clinics.ts
  vetEmail: string;      // links to vetUsers.ts
  date: string;          // full ISO date/time (e.g. "2025-06-01T10:30:00")
  duration: number;      // duration in minutes
  endTime: string;       // full ISO date/time for end (e.g. "2025-06-01T11:00:00")
  reason: string;
  emergency: boolean;
  status: string;        // one of 'PENDING','CONFIRMED','COMPLETED','CANCELLED'
}

export const appointments: AppointmentData[] = [
  {
    ownerEmail: 'alice@owner.fi',
    petName: 'Luna',
    clinicEmail: 'central.vet@vetlink.fi',
    vetEmail: 'mika.nieminen@vetlink.fi',
    date: '2025-06-01T09:00:00',
    duration: 30,
    endTime: '2025-06-01T09:30:00',
    reason: 'Vaccination',
    emergency: false,
    status: 'PENDING'
  },
  {
    ownerEmail: 'alice@owner.fi',
    petName: 'Milo',
    clinicEmail: 'central.vet@vetlink.fi',
    vetEmail: 'emilia.korhonen@vetlink.fi',
    date: '2025-06-02T11:00:00',
    duration: 45,
    endTime: '2025-06-02T11:45:00',
    reason: 'Skin rash',
    emergency: false,
    status: 'PENDING'
  },
  {
    ownerEmail: 'bob@owner.fi',
    petName: 'Bella',
    clinicEmail: 'nordic.pc@vetlink.fi',
    vetEmail: 'jukka.virtanen@vetlink.fi',
    date: '2025-06-03T10:00:00',
    duration: 60,
    endTime: '2025-06-03T11:00:00',
    reason: 'Annual checkup',
    emergency: false,
    status: 'PENDING'
  }
];