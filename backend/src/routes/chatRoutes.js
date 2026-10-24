import { Router } from 'express';
import {
  getConversation,
  sendMessage,
  getConversationsOverview,
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Authentication required for all chat routes
router.use(authenticate);

// Conversations list
router.get('/conversations', getConversationsOverview);

// Direct message history and sending
router.get('/:friendId', getConversation);
router.post('/:friendId', sendMessage);

export default router;
