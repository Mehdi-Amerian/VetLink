import { Router } from 'express';
import { createPet, getMyPets, updatePet, deletePet } from '../controllers/pets.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Create a new pet
router.post('/', createPet);

// Get all pets for the logged-in user
router.get('/', getMyPets);

// Update a pet
router.patch('/:id', updatePet);

// Delete a pet
router.delete('/:id', deletePet);

export default router;