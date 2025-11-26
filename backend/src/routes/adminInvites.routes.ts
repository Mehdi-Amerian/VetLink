import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken';
import { inviteClinicAdmin, inviteVet } from '../controllers/adminInvites.controller';

const router = Router();

// SUPER_ADMIN: invite clinic admin
router.post('/clinics/invite-admin', verifyToken, inviteClinicAdmin);

// CLINIC_ADMIN: invite vet
router.post('/vets/invite', verifyToken, inviteVet);

export default router;
