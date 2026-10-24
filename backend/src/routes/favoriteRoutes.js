import { Router } from 'express';
import {
  getMyFavorites,
  addToFavorites,
  removeFromFavorites,
} from '../controllers/songController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All favorites routes require authentication
router.use(authenticate);

router.get('/', getMyFavorites);
router.get('/mine', getMyFavorites);
router.post('/', addToFavorites);
router.post('/:id', addToFavorites);
router.delete('/:id', removeFromFavorites);

export default router;
