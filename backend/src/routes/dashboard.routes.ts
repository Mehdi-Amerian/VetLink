import { Router } from 'express';
import { getDashboard, exportAppointmentsCsv, exportPetsCsv, exportUsersCsv, exportClinicsCsv } from '../controllers/dashboard.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.get('/export/appointments.csv', verifyToken, exportAppointmentsCsv);
router.get('/export/pets.csv', verifyToken, exportPetsCsv);
router.get('/export/users.csv', verifyToken, exportUsersCsv);
router.get('/export/clinics.csv', verifyToken, exportClinicsCsv);
router.get('/', verifyToken, getDashboard);

export default router;