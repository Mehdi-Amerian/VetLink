import { Router } from 'express';
import { createClinic, getClinics, getClinicById } from '../controllers/clinics.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { checkRole } from '../middlewares/checkRole';

const router = Router();

// Public access
router.get('/', getClinics);
router.get('/:id', getClinicById);

// Admin-only route
router.post('/', verifyToken, checkRole('CLINIC_ADMIN'), createClinic);

export default router;