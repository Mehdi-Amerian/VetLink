import { Router } from 'express';
import {
  createAppointment,
  getMyAppointments,
  getAppointmentsForVet
} from '../controllers/appointments.controller';
import { updateAppointmentStatus } from '../controllers/appointments.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { checkRole } from '../middlewares/checkRole';
import { idempotencyMiddleware } from '../middlewares/idempotency';

const router = Router();

router.post('/', verifyToken, checkRole('OWNER'), idempotencyMiddleware, createAppointment);
router.get('/', verifyToken, checkRole('OWNER'), getMyAppointments);
router.get('/vet', verifyToken, checkRole('VET'), getAppointmentsForVet);
router.patch('/:id/status', verifyToken, updateAppointmentStatus);

export default router;