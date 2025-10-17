import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken';
import { getPreferences, updatePreferences, unsubscribeEmailHandler } from '../controllers/notifications.controller';

const router = Router();

//Preferences (auth required)
router.get('/preferences', verifyToken, getPreferences);
router.patch('/preferences', verifyToken, updatePreferences);

// Unsubscribe (no auth)
router.get('/unsubscribe/:token', unsubscribeEmailHandler);

export default router;
