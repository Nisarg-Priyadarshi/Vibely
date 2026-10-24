import mongoose from 'mongoose';
import Song from '../models/Song.js';

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

export default {
  getSongs,
  searchSongs,
  getGenres,
  getSongById,
};
