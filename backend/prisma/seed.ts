// prisma/seed.ts
import { PrismaClient, Role, Weekday, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { clinics } from './seeds/clinics';
import { vetUsers } from './seeds/vetUsers';
import { ownerUsers } from './seeds/ownerUsers';
import { pets } from './seeds/pets';
import { availability } from './seeds/availability';
import { appointments } from './seeds/appointments';

const prisma = new PrismaClient();

async function main() {
  // 0. Skip if not in dev
  if (process.env.NODE_ENV !== 'development') {
    console.log('Seed script skipped: not in development mode.');
    process.exit(0);
  }

  // ----- 1. Upsert Clinics -----
  for (const c of clinics) {
    await prisma.clinic.upsert({
      where: { email: c.email },
      update: {},
      create: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        zipCode: c.zipCode,
        emergency: c.emergency
      }
    });
  }

  // Re‐fetch clinics into memory
  const allClinics = await prisma.clinic.findMany({ select: { id: true, email: true } });

  // Helper to map clinicEmail → clinic.id
  const clinicIdMap: Record<string, string> = {};
  for (const c of allClinics) {
    clinicIdMap[c.email] = c.id;
  }

  // ----- 2. Upsert VET Users & Their Vet Profiles -----
  for (const v of vetUsers) {
    const hashed = await bcrypt.hash(v.password, 12);
    const clinicId = clinicIdMap[v.clinicEmail];
    if (!clinicId) {
      console.warn(`  → Clinic email not found for vet ${v.email}: ${v.clinicEmail}`);
      continue;
    }

    // 2a. Upsert the User (role = VET)
    const user = await prisma.user.upsert({
      where: { email: v.email },
      update: {
        fullName: v.fullName,
        clinicId: clinicId
      },
      create: {
        email: v.email,
        password: hashed,
        fullName: v.fullName,
        role: Role.VET,
        clinicId: clinicId
      }
    });

    // 2b. Upsert Vet profile by unique userId
    const vet = await prisma.vet.upsert({
      where: { userId: user.id },
      update: {
        name: v.fullName,
        specialization: v.specialization,
        clinicId: clinicId
      },
      create: {
        name: v.fullName,
        specialization: v.specialization,
        clinicId: clinicId,
        userId: user.id
      }
    });

    // 2c. Ensure reverse FK: user.vetId → vet.id
    if (user.vetId !== vet.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { vetId: vet.id }
      });
    }
  }

  // Re‐fetch all vets (for availability & appointments)
  const allVets = await prisma.vet.findMany({ select: { id: true, userId: true } });

  // Helper to map vetEmail → vet.id
  const vetEmailToId: Record<string, string> = {};
 
  for(const v of vetUsers) {
    //Find the user by email
    const userRecord = await prisma.user.findUnique({
      where: { email: v.email },
      select: { id: true }
    });
    if (!userRecord) {
      console.warn(`  → User not found for vet email: ${v.email}`);
      continue;
    }

    //Find the vet in allVets by userId
    const vetRec = allVets.find(x => x.userId === userRecord.id);
    if (!vetRec) {
      console.warn(`  → Vet not found for user: "${v.email}" (userId=${userRecord.id})`);
      continue;
    }
    vetEmailToId[v.email] = vetRec.id;
  }

  // ----- 3. Upsert OWNER Users -----
  for (const o of ownerUsers) {
    const hashed = await bcrypt.hash(o.password, 12);

    await prisma.user.upsert({
      where: { email: o.email },
      update: { fullName: o.fullName },
      create: {
        email: o.email,
        password: hashed,
        fullName: o.fullName,
        role: Role.OWNER
      }
    });
  }

  // Re‐fetch all owners
  const allOwners = await prisma.user.findMany({
    where: { role: Role.OWNER },
    select: { id: true, email: true }
  });

  // Helper to map ownerEmail → owner.id
  const ownerEmailToId: Record<string, string> = {};
  for (const o of allOwners) {
    ownerEmailToId[o.email] = o.id;
  }

  // ----- 4. Upsert Pets -----
  for (const p of pets) {
    const ownerId = ownerEmailToId[p.ownerEmail];
    if (!ownerId) {
      console.warn(`  → Owner email not found for pet ${p.name}: ${p.ownerEmail}`);
      continue;
    }

    // Generate a deterministic ID so upsert can match
    const petId = `${ownerId}-${p.name.replace(/\s+/g, '').toLowerCase()}`;

    await prisma.pet.upsert({
      where: { id: petId },
      update: {
        species: p.species,
        breed: p.breed,
        birthDate: new Date(p.birthDate)
      },
      create: {
        id: petId,
        ownerId: ownerId,
        name: p.name,
        species: p.species,
        breed: p.breed,
        birthDate: new Date(p.birthDate)
      }
    });
  }

  // Re‐fetch all pets
  const allPets = await prisma.pet.findMany({
    select: { id: true, ownerId: true, name: true }
  });

  // Helper: ownerId+petName → pet.id
  const petKeyToId: Record<string, string> = {};
  for (const p of allPets) {
    const key = `${p.ownerId}-${p.name.replace(/\s+/g, '').toLowerCase()}`;
    petKeyToId[key] = p.id;
  }

  // ----- 5. Upsert Availability -----
  for (const a of availability) {
    const vetId = vetEmailToId[a.vetEmail];
    if (!vetId) {
      console.warn(`  → Vet email not found for availability: ${a.vetEmail}`);
      continue;
    }

    const dayEnum = (Weekday as any)[a.day];
    if (dayEnum === undefined) {
      console.warn(`  → Invalid weekday "${a.day}"`);
      continue;
    }

    // Create a deterministic ID: `${vetId}-${day}`
    const availId = `${vetId}-${a.day}`;

    await prisma.availability.upsert({
      where: { id: availId },
      update: {
        startTime: a.startTime,
        endTime: a.endTime
      },
      create: {
        id: availId,
        vetId: vetId,
        day: dayEnum,
        startTime: a.startTime,
        endTime: a.endTime
      }
    });
  }

  // ----- 6. Upsert Appointments -----
  for (const ap of appointments) {
    const ownerId = ownerEmailToId[ap.ownerEmail];
    if (!ownerId) {
      console.warn(`  → Owner email not found for appointment: ${ap.ownerEmail}`);
      continue;
    }

    const petKey = `${ownerId}-${ap.petName.replace(/\s+/g, '').toLowerCase()}`;
    const petId = petKeyToId[petKey];
    if (!petId) {
      console.warn(`  → Pet not found for appointment: ${ap.petName} (owner ${ap.ownerEmail})`);
      continue;
    }

    const clinicId = clinicIdMap[ap.clinicEmail];
    if (!clinicId) {
      console.warn(`  → Clinic email not found for appointment: ${ap.clinicEmail}`);
      continue;
    }

    const vetId = vetEmailToId[ap.vetEmail];
    if (!vetId) {
      console.warn(`  → Vet email not found for appointment: ${ap.vetEmail}`);
      continue;
    }

    const apptId = `${petId}-${vetId}-${new Date(ap.date).getTime()}`;

    const statusEnum = (AppointmentStatus as any)[ap.status];
    if (statusEnum === undefined) {
      console.warn(`  → Invalid status "${ap.status}"`);
      continue;
    }

    await prisma.appointment.upsert({
      where: { id: apptId },
      update: {
        date: new Date(ap.date),
        duration: ap.duration,
        endTime: new Date(ap.endTime),
        reason: ap.reason,
        emergency: ap.emergency,
        status: statusEnum
      },
      create: {
        id: apptId,
        date: new Date(ap.date),
        duration: ap.duration,
        endTime: new Date(ap.endTime),
        reason: ap.reason,
        emergency: ap.emergency,
        petId: petId,
        ownerId: ownerId,
        clinicId: clinicId,
        vetId: vetId,
        status: statusEnum
      }
    });
  }

  console.log('🌱 Seed data loaded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });