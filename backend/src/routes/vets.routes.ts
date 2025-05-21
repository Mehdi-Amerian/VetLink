import { Router } from 'express';
import { createVet, getVets, getVetById } from '../controllers/vets.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { checkRole } from '../middlewares/checkRole';

const router = Router();

// Public routes
router.get('/', getVets);
router.get('/:id', getVetById);

// Admin-only vet registration
router.post('/', verifyToken, checkRole('CLINIC_ADMIN'), createVet);

export default router;