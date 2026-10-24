import { Router } from 'express';
import { getActiveRooms, getRoomByCode } from '../controllers/roomController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Routes
router.get('/', authenticate, getActiveRooms);
router.get('/:code', authenticate, getRoomByCode);

export default router;
