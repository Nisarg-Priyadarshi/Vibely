import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

const SongListContext = createContext(null);

export const SongListProvider = ({ children }) => {
  const { user } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [playLater, setPlayLater] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingPlayLater, setLoadingPlayLater] = useState(false);
  const [errorFavorites, setErrorFavorites] = useState(null);
  const [errorPlayLater, setErrorPlayLater] = useState(null);

  // Derive fast lookup sets of IDs
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((s) => (s.id || s._id).toString()));
  }, [favorites]);

  const playLaterIds = useMemo(() => {
    return new Set(playLater.map((s) => (s.id || s._id).toString()));
  }, [playLater]);

  const isFavorite = useCallback(
    (songId) => {
      if (!songId) return false;
      return favoriteIds.has(songId.toString());
    },
    [favoriteIds]
  );

  const isInPlayLater = useCallback(
    (songId) => {
      if (!songId) return false;
      return playLaterIds.has(songId.toString());
    },
    [playLaterIds]
  );

  // Fetch Favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setLoadingFavorites(true);
    setErrorFavorites(null);
    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFavorites(json.data || []);
      } else {
        throw new Error(json.error?.message || 'Failed to load favourites');
      }
    } catch (err) {
      console.warn('Error fetching favorites:', err.message);
      setErrorFavorites(err.message);
    } finally {
      setLoadingFavorites(false);
    }
  }, [user]);

  // Fetch Play Later
  const fetchPlayLater = useCallback(async () => {
    if (!user) {
      setPlayLater([]);
      return;
    }
    setLoadingPlayLater(true);
    setErrorPlayLater(null);
    try {
      const res = await fetch(`${API_BASE_URL}/play-later`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPlayLater(json.data || []);
      } else {
        throw new Error(json.error?.message || 'Failed to load Play Later list');
      }
    } catch (err) {
      console.warn('Error fetching play later:', err.message);
      setErrorPlayLater(err.message);
    } finally {
      setLoadingPlayLater(false);
    }
  }, [user]);

  // Refresh lists on user session changes
  useEffect(() => {
    fetchFavorites();
    fetchPlayLater();
  }, [fetchFavorites, fetchPlayLater]);

  // Toggle Favorite
  const toggleFavorite = useCallback(
    async (song) => {
      if (!user) {
        return { success: false, error: 'Sign in to add songs to favourites' };
      }
      const sId = (song.id || song._id).toString();
      const currentlyFav = favoriteIds.has(sId);

      // Optimistic update
      if (currentlyFav) {
        setFavorites((prev) => prev.filter((s) => (s.id || s._id).toString() !== sId));
      } else {
        setFavorites((prev) => [song, ...prev]);
      }

      try {
        const method = currentlyFav ? 'DELETE' : 'POST';
        const res = await fetch(`${API_BASE_URL}/favorites/${sId}`, {
          method,
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to update favourites');
        }
        return { success: true, isFavorite: !currentlyFav };
      } catch (err) {
        // Rollback on error
        if (currentlyFav) {
          setFavorites((prev) => [song, ...prev]);
        } else {
          setFavorites((prev) => prev.filter((s) => (s.id || s._id).toString() !== sId));
        }
        return { success: false, error: err.message };
      }
    },
    [user, favoriteIds]
  );

  // Toggle Play Later
  const togglePlayLater = useCallback(
    async (song) => {
      if (!user) {
        return { success: false, error: 'Sign in to add songs to Play Later' };
      }
      const sId = (song.id || song._id).toString();
      const currentlySaved = playLaterIds.has(sId);

      // Optimistic update
      if (currentlySaved) {
        setPlayLater((prev) => prev.filter((s) => (s.id || s._id).toString() !== sId));
      } else {
        setPlayLater((prev) => [song, ...prev]);
      }

      try {
        const method = currentlySaved ? 'DELETE' : 'POST';
        const res = await fetch(`${API_BASE_URL}/play-later/${sId}`, {
          method,
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to update Play Later');
        }
        return { success: true, isInPlayLater: !currentlySaved };
      } catch (err) {
        // Rollback on error
        if (currentlySaved) {
          setPlayLater((prev) => [song, ...prev]);
        } else {
          setPlayLater((prev) => prev.filter((s) => (s.id || s._id).toString() !== sId));
        }
        return { success: false, error: err.message };
      }
    },
    [user, playLaterIds]
  );

  return (
    <SongListContext.Provider
      value={{
        favorites,
        playLater,
        favoriteIds,
        playLaterIds,
        loadingFavorites,
        loadingPlayLater,
        errorFavorites,
        errorPlayLater,
        isFavorite,
        isInPlayLater,
        toggleFavorite,
        togglePlayLater,
        fetchFavorites,
        fetchPlayLater,
      }}
    >
      {children}
    </SongListContext.Provider>
  );
};

export const useSongLists = () => {
  const context = useContext(SongListContext);
  if (!context) {
    throw new Error('useSongLists must be used within a SongListProvider');
  }
  return context;
};

export default SongListContext;
