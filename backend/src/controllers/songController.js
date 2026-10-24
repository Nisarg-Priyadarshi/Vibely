import mongoose from 'mongoose';
import Song from '../models/Song.js';
import User from '../models/User.js';

/**
 * Get paginated list of songs with optional genre and search filtering.
 * GET /api/songs
 */
export const getSongs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { genre, q, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    // Filter by genre
    if (genre && genre.trim() && genre.trim().toLowerCase() !== 'all') {
      filter.genre = new RegExp(`^${genre.trim()}$`, 'i');
    }

    // Search query filter (search across title, artist, album, genre, tags)
    const searchTerm = (q || search || '').trim();
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { title: searchRegex },
        { artist: searchRegex },
        { album: searchRegex },
        { genre: searchRegex },
        { tags: searchRegex },
      ];
    }

    const sortOptions = {};
    const sortField = ['createdAt', 'title', 'artist', 'duration'].includes(sortBy)
      ? sortBy
      : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    const [total, songs] = await Promise.all([
      Song.countDocuments(filter),
      Song.find(filter).sort(sortOptions).skip(skip).limit(limit),
    ]);

    res.status(200).json({
      success: true,
      count: songs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: songs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search songs with query parameter q.
 * GET /api/songs/search?q=...
 */
export const searchSongs = async (req, res, next) => {
  try {
    const query = (req.query.q || req.query.query || '').trim();

    if (!query) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = {
      $or: [
        { title: searchRegex },
        { artist: searchRegex },
        { album: searchRegex },
        { genre: searchRegex },
        { tags: searchRegex },
      ],
    };

    const songs = await Song.find(filter).limit(50);

    res.status(200).json({
      success: true,
      count: songs.length,
      data: songs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct list of music genres available in the catalogue.
 * GET /api/songs/genres
 */
export const getGenres = async (req, res, next) => {
  try {
    const genres = await Song.distinct('genre');
    res.status(200).json({
      success: true,
      data: genres.sort(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single song by its ID.
 * GET /api/songs/:id
 */
export const getSongById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid song ID format.',
          status: 400,
        },
      });
    }

    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Song not found.',
          status: 404,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: song,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user's favorite songs.
 * GET /api/songs/favorites/mine or GET /api/favorites
 */
export const getMyFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.', status: 404 },
      });
    }

    const validSongs = (user.favorites || []).filter(Boolean);

    if (validSongs.length !== (user.favorites || []).length) {
      user.favorites = validSongs.map((s) => s._id);
      await user.save();
    }

    res.status(200).json({
      success: true,
      count: validSongs.length,
      data: validSongs,
      songIds: validSongs.map((s) => s._id.toString()),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a song to the current user's favorites.
 * POST /api/songs/:id/favorite or POST /api/favorites/:id
 */
export const addToFavorites = async (req, res, next) => {
  try {
    const songId = req.params.id || req.params.songId || req.body?.songId;

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid song ID format.', status: 400 },
      });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({
        success: false,
        error: { message: 'Song not found.', status: 404 },
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: song._id } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Song added to favourites.',
      isFavorite: true,
      data: song,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a song from the current user's favorites.
 * DELETE /api/songs/:id/favorite or DELETE /api/favorites/:id
 */
export const removeFromFavorites = async (req, res, next) => {
  try {
    const songId = req.params.id || req.params.songId || req.body?.songId;

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid song ID format.', status: 400 },
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: songId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Song removed from favourites.',
      isFavorite: false,
      songId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user's Play Later songs.
 * GET /api/songs/play-later/mine or GET /api/play-later
 */
export const getMyPlayLater = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('playLater');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.', status: 404 },
      });
    }

    const validSongs = (user.playLater || []).filter(Boolean);

    if (validSongs.length !== (user.playLater || []).length) {
      user.playLater = validSongs.map((s) => s._id);
      await user.save();
    }

    res.status(200).json({
      success: true,
      count: validSongs.length,
      data: validSongs,
      songIds: validSongs.map((s) => s._id.toString()),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a song to the current user's Play Later list.
 * POST /api/songs/:id/play-later or POST /api/play-later/:id
 */
export const addToPlayLater = async (req, res, next) => {
  try {
    const songId = req.params.id || req.params.songId || req.body?.songId;

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid song ID format.', status: 400 },
      });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({
        success: false,
        error: { message: 'Song not found.', status: 404 },
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { playLater: song._id } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Song added to Play Later.',
      isInPlayLater: true,
      data: song,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a song from the current user's Play Later list.
 * DELETE /api/songs/:id/play-later or DELETE /api/play-later/:id
 */
export const removeFromPlayLater = async (req, res, next) => {
  try {
    const songId = req.params.id || req.params.songId || req.body?.songId;

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid song ID format.', status: 400 },
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { playLater: songId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Song removed from Play Later.',
      isInPlayLater: false,
      songId,
    });
  } catch (error) {
    next(error);
  }
};

export default {
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
};
