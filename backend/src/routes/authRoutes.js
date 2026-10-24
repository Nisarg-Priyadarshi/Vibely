import { Router } from 'express';
import { register, login, logout, getMe, updateProfile, googleAuth } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/google', googleAuth);

// Protected routes
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.patch('/profile', authenticate, updateProfile);

export default router;
