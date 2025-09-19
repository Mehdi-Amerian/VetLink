"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePet = exports.updatePet = exports.getMyPets = exports.createPet = void 0;
const zod_1 = require("zod");
const prismaClient_1 = require("../config/prismaClient");
// Validation schema
const petSchema = zod_1.z.object({
    name: zod_1.z.string(),
    species: zod_1.z.string(),
    breed: zod_1.z.string().optional(),
    birthDate: zod_1.z.string()
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
                birthDate: new Date(data.birthDate),
                ownerId: userId,
                isDeleted: false
            }
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
        const pet = await prismaClient_1.prisma.pet.findUnique({
            where: { id: petId }
        });
        if (!pet || pet.ownerId !== userId) {
            return res.status(404).json({ message: 'Pet not found or access denied' });
        }
        const updated = await prismaClient_1.prisma.pet.update({
            where: { id: petId },
            data: req.body
        });
        res.json({ pet: updated });
    }
    catch {
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
        data: { isDeleted: true }
    });
    res.json({ message: 'Pet successfully deleted (soft delete)' });
};
exports.deletePet = deletePet;
