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
  Availability,
  Weekday,
  User,
} from "./types";

function unwrapArray<T>(data: unknown, field?: string): T[] {
  // If the whole payload is an array → use it
  if (Array.isArray(data)) {
    return data as T[];
  }

  // If it's an object with a field that is an array → use that
  if (
    field &&
    data &&
    typeof data === "object" &&
    Array.isArray((data as any)[field])
  ) {
    return (data as any)[field] as T[];
  }

  // Fallback: nothing usable
  return [];
}

// ----- basic list fetchers -----

export async function getPets(): Promise<Pet[]> {
  const { data } = await api.get("/pets");
  return unwrapArray<Pet>(data, "pets");
}

export async function getClinics(): Promise<Clinic[]> {
  const { data } = await api.get("/clinics");
  return unwrapArray<Clinic>(data, "clinics");
}

export async function getClinicById(id: string): Promise<Clinic> {
  const { data } = await api.get(`/clinics/${id}`);
  return data.clinic as Clinic;
}

export async function getVets(clinicId?: string): Promise<Vet[]> {
  const { data } = await api.get("/vets", {
    params: clinicId ? { clinicId } : {},
  });

  // supports both `Vet[]` and `{ vets: Vet[] }`
  const vets = unwrapArray<Vet>(data, "vets");

  return clinicId ? vets.filter((v) => v.clinicId === clinicId) : vets;
}

export async function getVetById(id: string): Promise<Vet> {
  const { data } = await api.get(`/vets/${id}`);
  return (data.vet ?? data) as Vet;
}

// ----- user profile -----

export async function updateMyOwnerProfile(payload: {
  fullName?: string;
}): Promise<User> {
  const { data } = await api.patch("/users/me", payload);
  return (data.user ?? data) as User;
}

// ---- pet management -----

export async function createPetForOwner(params: {
  name: string;
  species: string;
  breed?: string;
  birthDateYYYYMMDD: string;
}): Promise<Pet> {
  const { name, species, breed, birthDateYYYYMMDD } = params;

  // Convert YYYY-MM-DD to full ISO datetime at midnight
  const birthDateIso = new Date(`${birthDateYYYYMMDD}T00:00:00`).toISOString();

  const { data } = await api.post<{pet: Pet}>("/pets", {
    name,
    species,
    breed: breed ?? null,
    birthDate: birthDateIso,
  });

  return data.pet;
}

export async function updatePet(
  id: string,
  payload: Partial<Pick<Pet, "name" | "species" | "breed" | "birthDate">>
): Promise<Pet> {
  const { data } = await api.patch(`/pets/${id}`, payload);
  return (data.pet ?? data) as Pet;
}

export async function deletePet(id: string): Promise<void> {
  await api.delete(`/pets/${id}`);
}


// ----- slots -----

export async function getVetSlots(
  vetId: string,
  date: string,
): Promise<Slot[]> {
  const { data } = await api.get<SlotsResponse>(
    `/availability/vets/${vetId}/available-slots`,
    { params: { date } }
  );

  // SlotsResponse: { vetId, date, slots: string[] }
  return (data.slots ?? []).map((time) => ({ time }));
}

export async function getClinicSlots(
  clinicId: string,
  date: string,
  vetId?: string
): Promise<Slot[]> {
  const { data } = await api.get<ClinicSlotsResponse>(
    `/availability/clinics/${clinicId}/available-slots`,
    { params: { date, ...(vetId ? { vetId } : {}) } }
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
    "/appointments"
  );
  return data.appointments;
}

export async function getMyVetAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<{ appointments: Appointment[] }>(
    "/appointments/vet"
  );
  return data.appointments;
}

// ----- create/update appointments -----

export async function createAppointment(payload: {
  dateUtcIso: string;
  reason: string;
  emergency: boolean;
  petId: string;
  clinicId: string;
  vetId: string;
}): Promise<Appointment> {
  const idem = uuidv4();

  const body = {
    date: payload.dateUtcIso,
    reason: payload.reason,
    emergency: payload.emergency,
    petId: payload.petId,
    clinicId: payload.clinicId,
    vetId: payload.vetId,
  };

  const { data } = await api.post<Appointment>(
    "/appointments",
    body,
    withIdempotency({}, idem)
  );
  return data;
}

export async function rescheduleAppointment(
  id: string,
  dateUtcIso: string,
): Promise<Appointment> {
  const { data } = await api.patch<Appointment>(`/appointments/${id}`, {
    date: dateUtcIso,
  });
  return data;
}

// ----- notifications -----

export async function getNotificationPref(): Promise<{
  emailEnabled: boolean;
}> {
  const { data } = await api.get("/notifications/preferences");
  return { emailEnabled: data.emailEnabled };
}

export async function setNotificationPref(
  emailEnabled: boolean
): Promise<{ emailEnabled: boolean }> {
  const { data } = await api.patch("/notifications/preferences", {
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
  const { data } = await api.post("/admin/clinics/invite-admin", payload);
  return data;
}

interface InviteVetPayload {
  email: string;
  vetId: string;
}

export async function inviteVet(payload: InviteVetPayload) {
  const { data } = await api.post("/admin/vets/invite", payload);
  return data;
}

// create clinics
export async function createClinic(payload: {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  emergency?: boolean;
}): Promise<Clinic> {
  const body = {
    ...payload,
    emergency: payload.emergency ?? false,
  };

  const { data } = await api.post("/clinics", body);
  const clinic: Clinic =
    data && typeof data === "object" && "id" in data
      ? (data as Clinic)
      : (data.clinic as Clinic);
  return clinic;
}

// update clinics
export async function updateClinic(
  id: string,
  payload: Partial<
    Pick<
      Clinic,
      "name" | "email" | "phone" | "address" | "city" | "zipCode" | "emergency"
    >
  >
): Promise<Clinic> {
  const { data } = await api.patch(`/clinics/${id}`, payload);
  return data.clinic as Clinic;
}

// update my vet profile
export async function updateMyVetProfile(payload: {
  name?: string;
  specialization?: string | null;
}): Promise<Vet> {
  const { data } = await api.patch('/vets/me', payload);
  return (data.vet ?? data) as Vet;
}


// Create vet, then invite them via email
export interface CreateVetAndInvitePayload {
  clinicId: string;
  name: string;
  specialization?: string;
  email: string;
}

export async function createVetAndInvite(
  payload: CreateVetAndInvitePayload
): Promise<Vet> {
  // 1) Create the vet record (clinic inferred from logged-in clinic admin)
  const { data } = await api.post<{ vet: Vet }>('/vets', {
    name: payload.name,
    specialization: payload.specialization ?? undefined,
  });

  const vet = data.vet;

  // 2) Send invite email
  await api.post('/admin/vets/invite', {
    email: payload.email,
    vetId: vet.id,
  });

  // 3) Return the full Vet object
  return vet;
}

// ----- availability -----

export async function getAvailabilityForVet(
  vetId: string
): Promise<Availability[]> {
  const { data } = await api.get(`/availability/${vetId}`);
  return unwrapArray<Availability>(data, 'availability');
}

export async function addAvailabilityBlock(payload: {
  day: Weekday;
  startTime: string;
  endTime: string;
}): Promise<Availability> {
  const { data } = await api.post('/availability', payload);
  return (data.availability ?? data) as Availability;
}

export async function updateAvailabilityBlock(
  availabilityId: string,
  payload: Partial<{ day: Weekday; startTime: string; endTime: string }>
): Promise<Availability> {
  const { data } = await api.patch(`/availability/${availabilityId}`, payload);
  return (data.availability ?? data) as Availability;
}

export async function deleteAvailabilityBlock(availabilityId: string): Promise<void> {
  await api.delete(`/availability/${availabilityId}`);
}
