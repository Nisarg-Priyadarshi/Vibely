import { Router } from 'express';
import { register, login, logout, getMe, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { handleAvatarUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/google', googleAuth);

// Protected routes
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, handleAvatarUpload, updateProfile);
router.patch('/profile', authenticate, handleAvatarUpload, updateProfile);

// Avatar management routes
router.post('/profile/avatar', authenticate, handleAvatarUpload, uploadAvatar);
router.put('/profile/avatar', authenticate, handleAvatarUpload, uploadAvatar);
router.delete('/profile/avatar', authenticate, deleteAvatar);

router.post('/avatar', authenticate, handleAvatarUpload, uploadAvatar);
router.put('/avatar', authenticate, handleAvatarUpload, uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);

router.post('/me/avatar', authenticate, handleAvatarUpload, uploadAvatar);
router.put('/me/avatar', authenticate, handleAvatarUpload, uploadAvatar);
router.delete('/me/avatar', authenticate, deleteAvatar);

export default router;

