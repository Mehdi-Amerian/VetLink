import { Router } from 'express';
import { signup, login, getMe } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

// Route for user signup
router.post('/signup', signup);
// Route for user login
router.post('/login', login);

//Protectd route
router.get('/me', verifyToken, getMe);

export default router;