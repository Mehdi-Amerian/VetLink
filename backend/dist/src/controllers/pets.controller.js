"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePet = exports.updatePet = exports.getMyPets = exports.createPet = void 0;
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
const time_1 = require("../utils/time");
function isFutureDayInClinicZone(value) {
    const parsed = (0, time_1.parseClientToUtc)(value);
    const selectedDay = (0, time_1.toLocal)(parsed);
    selectedDay.setHours(0, 0, 0, 0);
    const today = (0, time_1.toLocal)(new Date());
    today.setHours(0, 0, 0, 0);
    return selectedDay.getTime() > today.getTime();
}
const birthDateSchema = zod_1.z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid birthDate',
})
    .refine((value) => !isFutureDayInClinicZone(value), {
    message: 'Birth date cannot be in the future',
});
// Validation schema
const petSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    species: zod_1.z.string().min(1),
    breed: zod_1.z.string().min(1).optional().nullable(),
    birthDate: birthDateSchema,
});
const updatePetSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).optional(),
    species: zod_1.z.string().min(1).optional(),
    breed: zod_1.z.string().min(1).nullable().optional(),
    birthDate: birthDateSchema.optional(),
})
    .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields provided for update',
});
const createPet = async (req, res) => {
    const userId = req.user.userId;
    try {
        const data = petSchema.parse(req.body);
        const pet = await prismaClient_1.prisma.pet.create({
            data: {
                name: data.name,
                species: data.species,
                breed: data.breed,
                birthDate: (0, time_1.parseClientToUtc)(data.birthDate),
                ownerId: userId,
                isDeleted: false,
            },
        });
        res.status(201).json({ pet });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Failed to create pet' });
    }
};
exports.createPet = createPet;
const getMyPets = async (req, res) => {
    const userId = req.user.userId;
    try {
        const pets = await prismaClient_1.prisma.pet.findMany({
            where: { ownerId: userId, isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ pets });
    }
    catch {
        res.status(500).json({ message: 'Failed to fetch pets' });
    }
};
exports.getMyPets = getMyPets;
const updatePet = async (req, res) => {
    const userId = req.user.userId;
    const petId = req.params.id;
    try {
        const data = updatePetSchema.parse(req.body);
        const pet = await prismaClient_1.prisma.pet.findUnique({
            where: { id: petId },
        });
        if (!pet || pet.ownerId !== userId) {
            return res.status(404).json({ message: 'Pet not found or access denied' });
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.species !== undefined)
            updateData.species = data.species;
        if (data.breed !== undefined)
            updateData.breed = data.breed;
        if (data.birthDate !== undefined)
            updateData.birthDate = (0, time_1.parseClientToUtc)(data.birthDate);
        const updated = await prismaClient_1.prisma.pet.update({
            where: { id: petId },
            data: updateData,
        });
        res.json({ pet: updated });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors });
        }
        res.status(500).json({ message: 'Failed to update pet' });
    }
};
exports.updatePet = updatePet;
const deletePet = async (req, res) => {
    const userId = req.user.userId;
    const petId = req.params.id;
    const pet = await prismaClient_1.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.ownerId !== userId) {
        return res.status(404).json({ message: 'Pet not found or access denied' });
    }
    await prismaClient_1.prisma.pet.update({
        where: { id: petId },
        data: { isDeleted: true },
    });
    res.json({ message: 'Pet successfully deleted (soft delete)' });
};
exports.deletePet = deletePet;
