import { Router } from 'express';
import { getSongs, searchSongs, getGenres, getSongById } from '../controllers/songController.js';

const router = Router();

// Routes
router.get('/', getSongs);
router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/:id', getSongById);

export default router;
