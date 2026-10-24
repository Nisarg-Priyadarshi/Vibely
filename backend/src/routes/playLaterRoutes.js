import { Router } from 'express';
import {
  getMyPlayLater,
  addToPlayLater,
  removeFromPlayLater,
} from '../controllers/songController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All play-later routes require authentication
router.use(authenticate);

router.get('/', getMyPlayLater);
router.get('/mine', getMyPlayLater);
router.post('/', addToPlayLater);
router.post('/:id', addToPlayLater);
router.delete('/:id', removeFromPlayLater);

export default router;
