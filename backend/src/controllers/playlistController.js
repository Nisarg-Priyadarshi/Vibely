import mongoose from 'mongoose';
import Playlist from '../models/Playlist.js';
import Song from '../models/Song.js';

/**
 * Create a new playlist.
 * POST /api/playlists
 */
export const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Playlist name is required.',
          status: 400,
        },
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Playlist name cannot exceed 100 characters.',
          status: 400,
        },
      });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description && typeof description === 'string' ? description.trim() : '',
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      owner: req.user._id,
      songs: [],
    });

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully.',
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List the current authenticated user's playlists.
 * GET /api/playlists/mine
 */
export const getMyPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('songs', 'title artist coverUrl duration genre');

    res.status(200).json({
      success: true,
      count: playlists.length,
      data: playlists,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get playlist details by ID with populated songs.
 * GET /api/playlists/:id
 */
export const getPlaylistById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid playlist ID format.',
          status: 400,
        },
      });
    }

    const playlist = await Playlist.findById(id)
      .populate('songs')
      .populate('owner', 'name email avatar');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Playlist not found.',
          status: 404,
        },
      });
    }

    // Privacy check: if playlist is private, verify user is owner
    if (!playlist.isPublic) {
      const isOwner = req.user && playlist.owner._id.toString() === req.user._id.toString();
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'This playlist is private.',
            status: 403,
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update playlist details (name, description, visibility).
 * PATCH /api/playlists/:id
 */
export const updatePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid playlist ID format.',
          status: 400,
        },
      });
    }

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Playlist not found.',
          status: 404,
        },
      });
    }

    // Ownership check
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You are not authorized to update this playlist.',
          status: 403,
        },
      });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Playlist name cannot be empty.',
            status: 400,
          },
        });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Playlist name cannot exceed 100 characters.',
            status: 400,
          },
        });
      }
      playlist.name = name.trim();
    }

    if (description !== undefined) {
      playlist.description = typeof description === 'string' ? description.trim() : '';
    }

    if (isPublic !== undefined) {
      playlist.isPublic = Boolean(isPublic);
    }

    await playlist.save();
    await playlist.populate('songs');

    res.status(200).json({
      success: true,
      message: 'Playlist updated successfully.',
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a playlist.
 * DELETE /api/playlists/:id
 */
export const deletePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid playlist ID format.',
          status: 400,
        },
      });
    }

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Playlist not found.',
          status: 404,
        },
      });
    }

    // Ownership check
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You are not authorized to delete this playlist.',
          status: 403,
        },
      });
    }

    await Playlist.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Playlist deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a song to a playlist.
 * POST /api/playlists/:id/songs
 */
export const addSongToPlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid playlist ID format.',
          status: 400,
        },
      });
    }

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Valid songId is required.',
          status: 400,
        },
      });
    }

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Playlist not found.',
          status: 404,
        },
      });
    }

    // Ownership check
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You are not authorized to modify this playlist.',
          status: 403,
        },
      });
    }

    // Verify song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Song not found.',
          status: 404,
        },
      });
    }

    // Prevent duplicates
    if (playlist.hasSong(songId)) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Song is already present in this playlist.',
          status: 409,
        },
      });
    }

    playlist.songs.push(song._id);
    await playlist.save();
    await playlist.populate('songs');

    res.status(200).json({
      success: true,
      message: `"${song.title}" added to playlist.`,
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a song from a playlist.
 * DELETE /api/playlists/:id/songs/:songId
 */
export const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { id, songId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid playlist ID format.',
          status: 400,
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid song ID format.',
          status: 400,
        },
      });
    }

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Playlist not found.',
          status: 404,
        },
      });
    }

    // Ownership check
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You are not authorized to modify this playlist.',
          status: 403,
        },
      });
    }

    const initialLength = playlist.songs.length;
    playlist.songs = playlist.songs.filter(
      (s) => (s._id ? s._id.toString() : s.toString()) !== songId.toString()
    );

    if (playlist.songs.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Song not found in this playlist.',
          status: 404,
        },
      });
    }

    await playlist.save();
    await playlist.populate('songs');

    res.status(200).json({
      success: true,
      message: 'Song removed from playlist.',
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createPlaylist,
  getMyPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
};
