import { Router } from 'express';
import { getActiveRooms, getRoomByCode } from '../controllers/roomController.js';
import {
  inviteFriendToRoom,
  getPendingInvitations,
  respondToInvitation,
} from '../controllers/roomInviteController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All room routes require authentication
router.use(authenticate);

// Room invitation endpoints (must be before /:code)
router.get('/invitations', getPendingInvitations);
router.post('/invitations', inviteFriendToRoom);
router.post('/invitations/:invitationId/respond', respondToInvitation);

// Room discovery endpoints
router.get('/', getActiveRooms);
router.get('/:code', getRoomByCode);

export default router;

