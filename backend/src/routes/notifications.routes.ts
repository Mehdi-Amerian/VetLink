import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken';
import { getPreferences, updatePreferences } from '../controllers/notifications.controller';

const router = Router();
router.get('/preferences', verifyToken, getPreferences);
router.patch('/preferences', verifyToken, updatePreferences);
export default router;