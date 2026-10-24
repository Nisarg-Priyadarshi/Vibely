import { Router } from 'express';
import {
  createPlaylist,
  getMyPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from '../controllers/playlistController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All playlist routes require authentication
router.use(authenticate);

// Playlist CRUD
router.post('/', createPlaylist);
router.get('/mine', getMyPlaylists);
router.get('/:id', getPlaylistById);
router.patch('/:id', updatePlaylist);
router.delete('/:id', deletePlaylist);

// Playlist songs management
router.post('/:id/songs', addSongToPlaylist);
router.delete('/:id/songs/:songId', removeSongFromPlaylist);

export default router;
