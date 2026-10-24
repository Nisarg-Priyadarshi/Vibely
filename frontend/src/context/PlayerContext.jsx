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

  const currentTrackRef = useRef(null);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Safely attempt audio.play() with proper AbortError rejection handling
  const safePlay = useCallback((audio) => {
    if (!audio) return Promise.resolve();
    setPlaybackError(null);
    const p = audio.play();
    if (p !== undefined && typeof p.catch === 'function') {
      p.catch((err) => {
        // Interrupted by pause() or new load - normal audio lifecycle, NOT a blocked error
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('Playback error or autoplay prevented:', err.name, err.message);
        isPlayingRef.current = false;
        setIsPlaying(false);
        setIsLoading(false);
        setPlaybackError('Playback was blocked. Click play to start listening.');
      });
    }
    return p;
  }, []);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.8;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      currentTimeRef.current = audio.currentTime;
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
      isPlayingRef.current = true;
      setIsLoading(false);
      setIsPlaying(true);
      setPlaybackError(null);
    };

    const onPause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    const onError = () => {
      isPlayingRef.current = false;
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

  // Load a track without necessarily playing it
  const loadTrack = useCallback((track, { autoPlay = false, startTime = 0 } = {}) => {
    if (!track || !track.audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    const currentId = currentTrackRef.current ? (currentTrackRef.current.id || currentTrackRef.current._id)?.toString() : null;
    const newId = (track.id || track._id)?.toString();

    // If the same track is already loaded
    if (currentId === newId && audio.src) {
      if (typeof startTime === 'number' && Math.abs(audio.currentTime - startTime) > 2) {
        audio.currentTime = startTime;
        currentTimeRef.current = startTime;
        setCurrentTime(startTime);
      }
      if (autoPlay) {
        if (audio.paused) {
          safePlay(audio);
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
      return;
    }

    // New track
    setCurrentTrack(track);
    currentTrackRef.current = track;
    currentTimeRef.current = startTime || 0;
    setCurrentTime(startTime || 0);
    setDuration(track.duration || 0);
    setIsLoading(true);
    setPlaybackError(null);

    audio.src = track.audioUrl;
    audio.load();

    if (startTime > 0) {
      audio.currentTime = startTime;
    }

    if (autoPlay) {
      safePlay(audio);
    } else {
      audio.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [safePlay]);

  // Play a specific track
  const playTrack = useCallback((track, newQueue = null) => {
    if (!track || !track.audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    // If queue is provided, update queue and index
    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      setQueue(newQueue);
      const index = newQueue.findIndex((s) => (s.id || s._id)?.toString() === (track.id || track._id)?.toString());
      setQueueIndex(index >= 0 ? index : 0);
    }

    const currentId = currentTrackRef.current ? (currentTrackRef.current.id || currentTrackRef.current._id)?.toString() : null;
    const newId = (track.id || track._id)?.toString();

    if (currentId === newId) {
      if (audio.paused) {
        safePlay(audio);
      } else {
        audio.pause();
      }
      return;
    }

    loadTrack(track, { autoPlay: true, startTime: 0 });
  }, [loadTrack, safePlay]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;

    if (audio.paused) {
      safePlay(audio);
    } else {
      audio.pause();
    }
  }, [safePlay]);

  // Force play (for room synchronization - only called on explicit play command)
  const forcePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;
    if (audio.paused) {
      safePlay(audio);
    }
  }, [safePlay]);

  // Force pause (for room synchronization - must never trigger play)
  const forcePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
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
        loadTrack,
        playTrack,
        togglePlay,
        forcePlay,
        forcePause,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
        currentTrackRef,
        currentTimeRef,
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
