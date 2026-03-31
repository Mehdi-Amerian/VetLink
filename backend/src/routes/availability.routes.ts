import { Router } from 'express';
import { addAvailability, getAvailabilityByVet, getAvailableSlots, getClinicAvailableSlots, updateAvailability, deleteAvailability } from '../controllers/availability.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { checkRole } from '../middlewares/checkRole';

const router = Router();

// Anyone can view available appointment start times
// GET /api/availability/vets/:vetId/available-slots?date=YYYY-MM-DD&duration=30
router.get('/vets/:vetId/available-slots', getAvailableSlots);
router.get('/clinics/:clinicId/available-slots', getClinicAvailableSlots);

// Anyone can view vet's schedule
router.get('/vets/:vetId', getAvailabilityByVet);

// VET creates availability
router.post('/', verifyToken, checkRole('VET'), addAvailability);
// VET updates availability
router.patch('/:availabilityId', verifyToken, checkRole('VET'), updateAvailability);
// VET deletes availability
router.delete('/:availabilityId', verifyToken, checkRole('VET'), deleteAvailability);

export default router;
