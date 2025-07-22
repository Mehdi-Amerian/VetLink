import { Router } from 'express';
import { addAvailability, getAvailabilityByVet, getAvailableSlots, getClinicAvailableSlots} from '../controllers/availability.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { checkRole } from '../middlewares/checkRole';

const router = Router();

// VET creates availability
router.post('/', verifyToken, checkRole('VET'), addAvailability);

// Anyone can view vet's schedule
router.get('/:vetId', getAvailabilityByVet);

// Anyone can view available appointment start times
// GET /api/availability/vets/:vetId/available-slots?date=YYYY-MM-DD&duration=30
router.get('/vets/:vetId/available-slots', getAvailableSlots);
router.get('/clinics/:clinicId/available-slots', getClinicAvailableSlots);

export default router;