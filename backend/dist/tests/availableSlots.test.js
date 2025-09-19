"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
const prismaClient_1 = __importDefault(require("../src/config/prismaClient"));
/**
 * Integration tests for GET /api/availability/vets/:vetId/available-slots
 */
describe('GET /api/availability/vets/:vetId/available-slots', () => {
    let vetId;
    beforeAll(async () => {
        // Clear relevant tables
        await prismaClient_1.default.appointment.deleteMany();
        await prismaClient_1.default.availability.deleteMany();
        await prismaClient_1.default.pet.deleteMany();
        await prismaClient_1.default.vet.deleteMany();
        await prismaClient_1.default.user.deleteMany();
        await prismaClient_1.default.clinic.deleteMany();
        // Create clinic
        const clinic = await prismaClient_1.default.clinic.create({ data: {
                name: 'Test Clinic', email: 'clinic@test.com', phone: '010', address: '', city: 'Helsinki', zipCode: '00100'
            } });
        // Create vet user & profile
        const vetUser = await prismaClient_1.default.user.create({ data: {
                email: 'vet@test.com', password: 'hashed', fullName: 'Dr Vet', role: 'VET', clinicId: clinic.id
            } });
        const vetProfile = await prismaClient_1.default.vet.create({ data: {
                name: 'Dr Vet', specialization: null, clinicId: clinic.id, userId: vetUser.id
            } });
        vetId = vetProfile.id;
        // Add availability: morning and afternoon on Tuesday (2025-07-01)
        await prismaClient_1.default.availability.createMany({ data: [
                { vetId, day: 'TUESDAY', startTime: '09:00', endTime: '12:00' },
                { vetId, day: 'TUESDAY', startTime: '13:00', endTime: '15:00' }
            ] });
        // Create owner & pet
        const owner = await prismaClient_1.default.user.create({ data: {
                email: 'owner@test.com', password: 'hashed', fullName: 'Pet Owner', role: 'OWNER'
            } });
        const pet = await prismaClient_1.default.pet.create({ data: {
                name: 'Fluffy', species: 'Cat', birthDate: new Date('2020-01-01'), ownerId: owner.id
            } });
        // Block a 30-min slot at 09:30-10:00
        await prismaClient_1.default.appointment.create({ data: {
                date: new Date('2025-07-01T09:30:00'),
                endTime: new Date('2025-07-01T10:00:00'),
                duration: 30,
                reason: 'Checkup', emergency: false,
                petId: pet.id, ownerId: owner.id, clinicId: clinic.id, vetId
            } });
        // Appointment boundary: ends exactly at 13:00
        await prismaClient_1.default.appointment.create({ data: {
                date: new Date('2025-07-01T12:00:00'),
                endTime: new Date('2025-07-01T13:00:00'),
                duration: 60,
                reason: 'Lunch', emergency: false,
                petId: pet.id, ownerId: owner.id, clinicId: clinic.id, vetId
            } });
    });
    afterAll(async () => {
        await prismaClient_1.default.$disconnect();
    });
    it('returns slots excluding the blocked 09:30 but including 09:00 and afternoon slots', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .get(`/api/availability/vets/${vetId}/available-slots?date=2025-07-01&duration=30`);
        expect(res.status).toBe(200);
        const { slots } = res.body;
        expect(slots).toEqual(expect.arrayContaining([
            '09:00', '10:00', '10:30', '11:00', '11:30',
            '13:00', '13:30', '14:00'
        ]));
        expect(slots).not.toContain('09:30');
    });
    it('handles 60-minute slots and respects appointment ending at boundary', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .get(`/api/availability/vets/${vetId}/available-slots?date=2025-07-01&duration=60`);
        expect(res.status).toBe(200);
        const { slots } = res.body;
        // First 60-min slot in morning should start at 10:00 (09:00 conflicts)
        expect(slots[0]).toBe('10:00');
        // Afternoon 13:00 slot is valid (appointment ends at 13:00)
        expect(slots).toContain('13:00');
    });
    it('returns 400 for invalid duration', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .get(`/api/availability/vets/${vetId}/available-slots?date=2025-07-01&duration=20`);
        expect(res.status).toBe(400);
    });
    it('returns 400 for invalid date format', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .get(`/api/availability/vets/${vetId}/available-slots?date=07-01-2025`);
        expect(res.status).toBe(400);
    });
    it('returns 404 for unknown vet', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .get(`/api/availability/vets/invalid-id/available-slots?date=2025-07-01`);
        expect(res.status).toBe(404);
    });
});
