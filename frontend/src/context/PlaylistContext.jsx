import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext(null);

export const PlaylistProvider = ({ children }) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current user's playlists
  const fetchMyPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/mine`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlaylists(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch playlists');
      }
    } catch (err) {
      console.warn('Error fetching playlists:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyPlaylists();
  }, [fetchMyPlaylists]);

  // Create playlist
  const createPlaylist = async ({ name, description = '', isPublic = true }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description, isPublic }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Could not create playlist');
      }
      setPlaylists((prev) => [data.data, ...prev]);
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update playlist
  const updatePlaylist = async (id, { name, description, isPublic }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description, isPublic }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Could not update playlist');
      }
      setPlaylists((prev) =>
        prev.map((p) => ((p.id || p._id) === id ? data.data : p))
      );
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete playlist
  const deletePlaylist = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Could not delete playlist');
      }
      setPlaylists((prev) => prev.filter((p) => (p.id || p._id) !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Add song to playlist
  const addSongToPlaylist = async (playlistId, songId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ songId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Could not add song to playlist');
      }
      setPlaylists((prev) =>
        prev.map((p) => ((p.id || p._id) === playlistId ? data.data : p))
      );
      return { success: true, data: data.data, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Remove song from playlist
  const removeSongFromPlaylist = async (playlistId, songId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Could not remove song');
      }
      setPlaylists((prev) =>
        prev.map((p) => ((p.id || p._id) === playlistId ? data.data : p))
      );
      return { success: true, data: data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        loading,
        error,
        fetchMyPlaylists,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylists = () => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
};

export default PlaylistContext;
