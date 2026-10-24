import { Router } from 'express';
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  respondToFriendRequest,
} from '../controllers/friendController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All friend routes require authentication
router.use(authenticate);

// Friend listing and search
router.get('/', getFriends);
router.get('/requests', getFriendRequests);
router.get('/search', searchUsers);

// Request operations - support both /requests and /request for robustness
router.post('/requests', sendFriendRequest);
router.post('/request', sendFriendRequest);
router.post('/requests/:id/accept', acceptFriendRequest);
router.post('/requests/:id/reject', rejectFriendRequest);
router.post('/respond', respondToFriendRequest);
router.delete('/requests/:id', cancelFriendRequest);

// Unfriend
router.delete('/:friendId', removeFriend);

export default router;
