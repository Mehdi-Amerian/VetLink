import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { exportAppointmentsCsv } from '../controllers/dashboard.controller';

const router = Router();

router.get('/', verifyToken, getDashboard);
router.get('/export/appointments.csv', verifyToken, exportAppointmentsCsv);

export default router;
