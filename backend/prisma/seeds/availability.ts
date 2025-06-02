export interface AvailabilityData {
  vetEmail: string;        // ties to vetUsers.ts → email
  day: string;             // one of MONDAY, TUESDAY, etc.
  startTime: string;       // "HH:mm"
  endTime: string;         // "HH:mm"
}

export const availability: AvailabilityData[] = [
  // Dr. Mika Nieminen (Central Vet) – Monday to Friday 09:00–17:00
  { vetEmail: 'mika.nieminen@vetlink.fi', day: 'MONDAY',    startTime: '09:00', endTime: '17:00' },
  { vetEmail: 'mika.nieminen@vetlink.fi', day: 'TUESDAY',   startTime: '09:00', endTime: '17:00' },
  { vetEmail: 'mika.nieminen@vetlink.fi', day: 'WEDNESDAY', startTime: '09:00', endTime: '17:00' },
  { vetEmail: 'mika.nieminen@vetlink.fi', day: 'THURSDAY',  startTime: '09:00', endTime: '17:00' },
  { vetEmail: 'mika.nieminen@vetlink.fi', day: 'FRIDAY',    startTime: '09:00', endTime: '17:00' },

  // Dr. Emilia Korhonen (Central Vet) – Tuesday & Thursday 10:00–16:00
  { vetEmail: 'emilia.korhonen@vetlink.fi', day: 'TUESDAY',   startTime: '10:00', endTime: '16:00' },
  { vetEmail: 'emilia.korhonen@vetlink.fi', day: 'THURSDAY',  startTime: '10:00', endTime: '16:00' },

  // Dr. Jukka Virtanen (Nordic Pet Care) – Monday, Wednesday, Friday 08:00–12:00
  { vetEmail: 'jukka.virtanen@vetlink.fi', day: 'MONDAY',    startTime: '08:00', endTime: '12:00' },
  { vetEmail: 'jukka.virtanen@vetlink.fi', day: 'WEDNESDAY', startTime: '08:00', endTime: '12:00' },
  { vetEmail: 'jukka.virtanen@vetlink.fi', day: 'FRIDAY',    startTime: '08:00', endTime: '12:00' }
];