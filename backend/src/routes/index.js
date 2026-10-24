import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import songRoutes from './songRoutes.js';
import playlistRoutes from './playlistRoutes.js';
import roomRoutes from './roomRoutes.js';
import friendRoutes from './friendRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = Router();

// Mount sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/songs', songRoutes);
router.use('/playlists', playlistRoutes);
router.use('/rooms', roomRoutes);
router.use('/friends', friendRoutes);
router.use('/chat', chatRoutes);
router.use('/messages', chatRoutes); // Alias for consistency

export default router;


