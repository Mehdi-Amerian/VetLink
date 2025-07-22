import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/prismaClient';
import { Weekday } from '@prisma/client';

describe('GET /api/availability/clinics/:clinicId/available-slots', () => {
  let clinicId: string;
  let vetA: string;
  let vetB: string;

  beforeAll(async () => {
    // cleanup in correct dependency order
    await prisma.appointment.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.pet.deleteMany();
    await prisma.vet.deleteMany();
    await prisma.user.deleteMany();
    await prisma.clinic.deleteMany();

    // seed clinic
    const clinic = await prisma.clinic.create({ data: {
      name: 'C', email:'c@test', phone:'010', address:'', city:'Helsinki', zipCode:'00100'
    }});
    clinicId = clinic.id;

    // vet A & availability
    const uA = await prisma.user.create({ data: {
      email:'va@test', password:'x', fullName:'VA', role:'VET', clinicId
    }});
    const vA = await prisma.vet.create({ data:{ name:'VA', clinicId, userId:uA.id }});
    vetA = vA.id;
    await prisma.availability.create({ data:{ vetId:vetA, day:'TUESDAY', startTime:'09:00', endTime:'11:00' }});
    // block one slot
    await prisma.pet.create({ data:{ name:'P1', species:'Dog', birthDate:new Date('2020-01-01'), ownerId:(await prisma.user.create({ data:{ email:'o1@test', password:'x', fullName:'O1', role:'OWNER' } })).id }});
    await prisma.appointment.create({ data:{
      date: new Date('2025-07-01T10:00:00'),
      duration: 30,
      endTime: new Date('2025-07-01T10:30:00'),
      reason:'r', emergency:false,
      petId: (await prisma.pet.findFirst()!)!.id,
      ownerId:(await prisma.user.findFirst({ where:{ role:'OWNER' } }))!.id,
      clinicId, vetId: vetA
    }});

    // vet B & availability (no appointments)
    const uB = await prisma.user.create({ data:{ email:'vb@test',password:'x',fullName:'VB',role:'VET',clinicId }});
    const vB = await prisma.vet.create({ data:{ name:'VB', clinicId, userId:uB.id }});
    vetB = vB.id;
    await prisma.availability.create({ data:{ vetId:vetB, day:'TUESDAY', startTime:'09:00', endTime:'10:00' }});
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it('aggregates slots for both vets, excluding booked ones', async () => {
    const res = await request(app)
      .get(`/api/availability/clinics/${clinicId}/available-slots?date=2025-07-01&duration=30`);
    expect(res.status).toBe(200);
    const byVet = res.body.slotsByVet;
    expect(byVet).toHaveProperty(vetA);
    expect(byVet).toHaveProperty(vetB);
    // vetA: 09:00, skip 10:00, then 10:30
    expect(byVet[vetA]).toEqual(expect.arrayContaining(['09:00','10:30']));
    expect(byVet[vetA]).not.toContain('10:00');
    // vetB: 09:00 and 09:30 (two 30-min slots)
    expect(byVet[vetB]).toEqual(['09:00','09:30']);
  });

  it('returns empty object when clinic has no vets', async () => {
    const fake = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/availability/clinics/${fake}/available-slots?date=2025-07-01`);
    expect(res.status).toBe(404);
  });

  it('filters by vetId if provided', async () => {
    const res = await request(app)
      .get(`/api/availability/clinics/${clinicId}/available-slots?date=2025-07-01&vetId=${vetB}`);
    expect(res.status).toBe(200);
    const keys = Object.keys(res.body.slotsByVet);
    expect(keys).toEqual([vetB]);
  });

  it('validates date & duration', async () => {
    let r = await request(app).get(`/api/availability/clinics/${clinicId}/available-slots?date=bad`);
    expect(r.status).toBe(400);
    r = await request(app).get(`/api/availability/clinics/${clinicId}/available-slots?date=2025-07-01&duration=20`);
    expect(r.status).toBe(400);
  });
});
