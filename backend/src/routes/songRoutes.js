import { Router } from 'express';
import {
  getSongs,
  searchSongs,
  getGenres,
  getSongById,
  getMyFavorites,
  addToFavorites,
  removeFromFavorites,
  getMyPlayLater,
  addToPlayLater,
  removeFromPlayLater,
} from '../controllers/songController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// User-specific authenticated song list endpoints (placed before /:id)
router.get('/favorites/mine', authenticate, getMyFavorites);
router.get('/favorites', authenticate, getMyFavorites);
router.get('/play-later/mine', authenticate, getMyPlayLater);
router.get('/play-later', authenticate, getMyPlayLater);

// Action endpoints on individual songs
router.post('/:id/favorite', authenticate, addToFavorites);
router.delete('/:id/favorite', authenticate, removeFromFavorites);
router.post('/:id/play-later', authenticate, addToPlayLater);
router.delete('/:id/play-later', authenticate, removeFromPlayLater);

// Public catalogue routes
router.get('/', getSongs);
router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/:id', getSongById);

export default router;
