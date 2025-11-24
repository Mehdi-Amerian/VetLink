export type Role = 'OWNER' | 'VET' | 'CLINIC_ADMIN' | 'SUPER_ADMIN';


export interface User {
id: string;
role: Role;
fullName: string;
email: string;
clinicId?: string;
vetId?: string;
}


export interface LoginResponse {
token: string;
user: User;
}


export interface Pet { id: string; name: string; species: string; ownerId: string; }
export interface Clinic { id: string; name: string; }
export interface Vet { id: string; fullName: string; clinicId: string; }


export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';


export interface Appointment {
id: string;
date: string; // UTC ISO from server
endTime: string; // UTC ISO
duration: number;
reason: string;
emergency: boolean;
petId: string;
ownerId: string;
clinicId: string;
vetId: string;
status: AppointmentStatus;
pet?: Pet;
vet?: Vet;
clinic?: Clinic;
}


export interface Slot {
time: string; // 'HH:mm' in local Helsinki day for the query date
}