import { Router } from 'express';
import { acceptInvite } from '../controllers/acceptInvite.controller';

const router = Router();

router.post('/accept-invite', acceptInvite);

export default router;
