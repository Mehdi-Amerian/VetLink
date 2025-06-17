import request from 'supertest';
import { PrismaClient, AppointmentStatus, Role } from '@prisma/client';
import app from '../src/index';     
import { signJwt } from '../src/utils/jwt'; 
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('PATCH /api/appointments/:id/status', () => {
  let ownerToken: string;
  let vetToken: string;
  let adminToken: string;
  let apptId: string;
  let now: Date;
  let past: Date;

  beforeAll(async () => {
    //Create users
    const owner = await prisma.user.create({
      data: {
        email: 'owner@test.fi',
        fullName: 'Test Owner',
        password: await bcrypt.hash('pass1', 12),
        role: Role.OWNER
      }
    });
    const vetUser = await prisma.user.create({
      data: {
        email: 'vet@test.fi',
        fullName: 'Test Vet',
        password: await bcrypt.hash('pass2', 12),
        role: Role.VET
      }
    });
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.fi',
        fullName: 'Test Admin',
        password: await bcrypt.hash('pass3', 12),
        role: Role.CLINIC_ADMIN
      }
    });

    ownerToken = signJwt({ userId: owner.id, role: owner.role, vetId: null });
    vetToken   = signJwt({ userId: vetUser.id, role: vetUser.role, vetId: null }); 
    adminToken = signJwt({ userId: admin.id, role: admin.role, vetId: null });

    //Create a pet & clinic & vet profile
    const clinic = await prisma.clinic.create({
      data: {
        name: 'Test Clinic',
        email: 'c@test.fi',
        phone: '123',
        address: 'A',
        city: 'X',
        zipCode: '00000',
      }
    });
    await prisma.user.update({ where: { id: vetUser.id }, data: { clinicId: clinic.id } });
    const vet = await prisma.vet.create({
      data: { name: 'Test Vet', clinicId: clinic.id, userId: vetUser.id }
    });
    await prisma.user.update({ where: { id: vetUser.id }, data: { vetId: vet.id } });

    const pet = await prisma.pet.create({
      data: {
        name: 'Buddy',
        species: 'Dog',
        birthDate: new Date('2020-01-01'),
        ownerId: owner.id
      }
    });

    //Create an appointment in the past
    now = new Date();
    past = new Date(now.getTime() - 60 * 60 * 1000);      // 1h ago
    const future = new Date(now.getTime() + 60 * 60 * 1000); // 1h later

    const appt = await prisma.appointment.create({
      data: {
        date: past,
        endTime: new Date(past.getTime() + 30 * 60 * 1000),
        duration: 30,
        reason: 'Test',
        emergency: false,
        petId: pet.id,
        clinicId: clinic.id,
        vetId: vet.id,
        ownerId: owner.id,
        status: AppointmentStatus.PENDING
      }
    });
    apptId = appt.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Owner cannot confirm', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(403);
  });

  test('Vet can confirm pending', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('CONFIRMED');
  });

  test('Cannot complete before status=CONFIRMED', async () => {
    // First reset appointment to PENDING
    await prisma.appointment.update({ where: { id: apptId }, data: { status: 'PENDING' } });
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/must be confirmed/);
  });

  test('Cannot complete before endTime', async () => {
    // Confirm then set date in future
    await prisma.appointment.update({
      where: { id: apptId },
      data: { status: 'CONFIRMED', date: new Date(now.getTime() + 3600000), endTime: new Date(now.getTime() + 5400000) }
    });
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/before appointment end time/);
  });

  test('Vet can complete after endTime', async () => {
    // Move the appointment to the past and mark confirmed
    await prisma.appointment.update({
      where: { id: apptId },
      data: {
        status: 'CONFIRMED',
        date: past,
        endTime: new Date(past.getTime() + 30 * 60000)
      }
    });
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('COMPLETED');
  });

  test('Owner can cancel a confirmed appointment', async () => {
    // Reset to PENDING then confirm
    await prisma.appointment.update({ where: { id: apptId }, data: { status: 'PENDING' } });
    await prisma.appointment.update({ where: { id: apptId }, data: { status: 'CONFIRMED' } });
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('CANCELLED');
  });

  test('Vet cannot cancel after completed', async () => {
    // Mark completed
    await prisma.appointment.update({ where: { id: apptId }, data: { status: 'COMPLETED' } });
    const res = await request(app)
      .patch(`/api/appointments/${apptId}/status`)
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Cannot change a completed appointment/);
  });
});