import { Router } from 'express';
import { addAvailability, getAvailabilityByVet } from '../controllers/availability.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { checkRole } from '../middlewares/checkRole';

const router = Router();

// VET creates availability
router.post('/', verifyToken, checkRole('VET'), addAvailability);

// Anyone can view vet's schedule
router.get('/:vetId', getAvailabilityByVet);

export default router;