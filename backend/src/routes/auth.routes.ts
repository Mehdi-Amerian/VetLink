import { Router } from 'express';
import { signup } from '../controllers/auth.controller';

const router = Router();

// Route for user signup
router.post('/signup', signup);

export default router;