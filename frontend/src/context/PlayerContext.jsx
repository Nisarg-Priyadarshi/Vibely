import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.8;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setPlaybackError(null);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setPlaybackError('Failed to load or play audio track. Please check network connection.');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Play a specific track
  const playTrack = useCallback((track, newQueue = null) => {
    if (!track || !track.audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackError(null);

    // If queue is provided, update queue and index
    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      setQueue(newQueue);
      const index = newQueue.findIndex((s) => (s.id || s._id) === (track.id || track._id));
      setQueueIndex(index >= 0 ? index : 0);
    }

    // If clicking the current track, toggle playback
    const currentId = currentTrack ? currentTrack.id || currentTrack._id : null;
    const newId = track.id || track._id;

    if (currentId === newId) {
      if (audio.paused) {
        audio.play().catch((err) => {
          console.warn('Autoplay prevented:', err.message);
          setPlaybackError('Playback restricted by browser. Click play to listen.');
        });
      } else {
        audio.pause();
      }
      return;
    }

    // Load and play new track
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    setIsLoading(true);

    audio.src = track.audioUrl;
    audio.load();

    audio.play().catch((err) => {
      console.warn('Playback error or autoplay prevented:', err.message);
      setIsPlaying(false);
      setIsLoading(false);
      setPlaybackError('Playback was blocked. Click play to start listening.');
    });
  }, [currentTrack]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (audio.paused) {
      setPlaybackError(null);
      audio.play().catch((err) => {
        console.warn('Play error:', err.message);
        setPlaybackError('Could not start playback.');
      });
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  // Force play (for room synchronization)
  const forcePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      setPlaybackError(null);
      audio.play().catch((err) => {
        console.warn('Playback prevented or play error:', err.message);
      });
    }
  }, [currentTrack]);

  // Force pause (for room synchronization)
  const forcePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
    }
  }, []);

  // Next Track
  const nextTrack = useCallback(() => {
    if (!queue || queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    const nextSong = queue[nextIdx];
    if (nextSong) {
      setQueueIndex(nextIdx);
      playTrack(nextSong);
    }
  }, [queue, queueIndex, playTrack]);

  // Previous Track
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    // If playing for more than 3 seconds, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (!queue || queue.length === 0) return;
    const prevIdx = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1;
    const prevSong = queue[prevIdx];
    if (prevSong) {
      setQueueIndex(prevIdx);
      playTrack(prevSong);
    }
  }, [queue, queueIndex, playTrack]);

  // Seek
  const seek = useCallback((timeInSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = timeInSeconds;
    setCurrentTime(timeInSeconds);
  }, []);

  // Set Volume
  const setVolume = useCallback((newVolume) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Auto-advance when track finishes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      nextTrack();
    };

    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [nextTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isLoading,
        playbackError,
        queue,
        queueIndex,
        playTrack,
        togglePlay,
        forcePlay,
        forcePause,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export default PlayerContext;
