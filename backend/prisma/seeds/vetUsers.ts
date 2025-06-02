export interface VetUserData {
  email: string;
  password: string;       // plaintext for seed (will be bcrypt‐hashed in code)
  fullName: string;
  specialization: string;
  clinicEmail: string;    // ties to clinics.ts → email
}

export const vetUsers: VetUserData[] = [
  {
    email: 'mika.nieminen@vetlink.fi',
    password: 'VetPass123!',
    fullName: 'Dr. Mika Nieminen',
    specialization: 'Surgery',
    clinicEmail: 'central.vet@vetlink.fi'
  },
  {
    email: 'emilia.korhonen@vetlink.fi',
    password: 'VetPass123!',
    fullName: 'Dr. Emilia Korhonen',
    specialization: 'Dermatology',
    clinicEmail: 'central.vet@vetlink.fi'
  },
  {
    email: 'jukka.virtanen@vetlink.fi',
    password: 'VetPass123!',
    fullName: 'Dr. Jukka Virtanen',
    specialization: 'General',
    clinicEmail: 'nordic.pc@vetlink.fi'
  }
];