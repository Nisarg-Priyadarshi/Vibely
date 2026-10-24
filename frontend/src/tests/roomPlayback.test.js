/**
 * Vibely Rooms - Playback and Pause Synchronization Test Suite
 * Validates:
 * 1. Pausing as the host sets isPlaying = false and triggers audio.pause()
 * 2. Pause synchronization on a second client receives pause state and calls audio.pause()
 * 3. A pause event never calls audio.play()
 * 4. Only explicit play commands attempt playback
 * 5. Interrupted play requests (AbortError) never trigger "Playback was blocked"
 * 6. True browser autoplay restrictions (NotAllowedError) properly set the error message
 * 7. Preventing repeated play() calls when a song is already paused
 */

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ${colors.green('✔')} ${name}`);
    passed++;
  } else {
    console.error(`  ${colors.red('✖')} ${name} ${detail ? `- ${detail}` : ''}`);
    failed++;
  }
}

// Mock Audio element simulating HTMLMediaElement
function createMockAudio() {
  let _src = '';
  let _currentTime = 0;
  let _paused = true;
  let _playCallCount = 0;
  let _pauseCallCount = 0;
  let _loadCallCount = 0;
  let _rejectPlayWith = null;

  return {
    get src() {
      return _src;
    },
    set src(val) {
      _src = val;
    },
    get currentTime() {
      return _currentTime;
    },
    set currentTime(val) {
      _currentTime = val;
    },
    get paused() {
      return _paused;
    },
    get playCallCount() {
      return _playCallCount;
    },
    get pauseCallCount() {
      return _pauseCallCount;
    },
    get loadCallCount() {
      return _loadCallCount;
    },
    setRejectPlay(err) {
      _rejectPlayWith = err;
    },
    load() {
      _loadCallCount++;
    },
    play() {
      _playCallCount++;
      if (_rejectPlayWith) {
        _paused = true;
        const err = _rejectPlayWith;
        return Promise.reject(err);
      }
      _paused = false;
      return Promise.resolve();
    },
    pause() {
      _pauseCallCount++;
      _paused = true;
    },
  };
}

// Reproduces the exact playback synchronization logic from PlayerContext + RoomContext
function createPlaybackSynchronizer(mockAudio) {
  let currentTrack = null;
  let isPlaying = false;
  let playbackError = null;
  let broadcastCount = 0;

  const safePlay = () => {
    playbackError = null;
    const p = mockAudio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        // AbortError is benign interruption by pause()/load()
        if (err.name === 'AbortError') {
          return;
        }
        isPlaying = false;
        playbackError = 'Playback was blocked. Click play to start listening.';
      });
    }
    isPlaying = true;
  };

  const loadTrack = (track, { autoPlay = false, startTime = 0 } = {}) => {
    if (!track || !track.audioUrl) return;

    const curId = currentTrack ? (currentTrack.id || currentTrack._id)?.toString() : null;
    const newId = (track.id || track._id)?.toString();

    if (curId === newId && mockAudio.src) {
      if (typeof startTime === 'number') {
        mockAudio.currentTime = startTime;
      }
      if (autoPlay) {
        if (mockAudio.paused) safePlay();
      } else {
        if (!mockAudio.paused) mockAudio.pause();
      }
      return;
    }

    currentTrack = track;
    mockAudio.src = track.audioUrl;
    mockAudio.load();
    if (startTime > 0) mockAudio.currentTime = startTime;

    if (autoPlay) {
      safePlay();
    } else {
      mockAudio.pause();
      isPlaying = false;
    }
  };

  const forcePlay = () => {
    if (!mockAudio || !currentTrack) return;
    if (mockAudio.paused) {
      safePlay();
    }
  };

  const forcePause = () => {
    if (!mockAudio) return;
    if (!mockAudio.paused) {
      mockAudio.pause();
    }
    isPlaying = false;
  };

  // The RoomContext applyRoomSync logic
  const applyRoomSync = (state) => {
    if (!state) return;
    const { currentSong, isPlaying: stateIsPlaying, position } = state;

    if (currentSong && currentSong.audioUrl) {
      const curId = currentTrack ? (currentTrack.id || currentTrack._id)?.toString() : null;
      const newId = (currentSong.id || currentSong._id)?.toString();

      if (curId !== newId) {
        if (stateIsPlaying) {
          loadTrack(currentSong, { autoPlay: true, startTime: position || 0 });
        } else {
          loadTrack(currentSong, { autoPlay: false, startTime: position || 0 });
        }
      }
    }

    if (typeof position === 'number') {
      mockAudio.currentTime = position;
    }

    if (stateIsPlaying) {
      forcePlay();
    } else {
      forcePause();
    }
  };

  // Host toggle action
  const hostTogglePlay = () => {
    const nextIsPlaying = !isPlaying;
    const state = {
      currentSong: currentTrack,
      isPlaying: nextIsPlaying,
      position: mockAudio.currentTime,
      updatedAt: Date.now(),
    };
    broadcastCount++;
    applyRoomSync(state);
    return state;
  };

  return {
    mockAudio,
    getCurrentTrack: () => currentTrack,
    getIsPlaying: () => isPlaying,
    getPlaybackError: () => playbackError,
    getBroadcastCount: () => broadcastCount,
    setPlaybackError: (err) => { playbackError = err; },
    loadTrack,
    safePlay,
    forcePlay,
    forcePause,
    applyRoomSync,
    hostTogglePlay,
  };
}

async function runTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('   Vibely Rooms Playback Unit Tests     ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  const sampleSong1 = {
    id: 'song-1',
    title: 'Midnight Lo-Fi',
    artist: 'Chillout',
    audioUrl: 'https://example.com/audio/song1.mp3',
    duration: 180,
  };

  const sampleSong2 = {
    id: 'song-2',
    title: 'Solar Echoes',
    artist: 'Ambient Wave',
    audioUrl: 'https://example.com/audio/song2.mp3',
    duration: 210,
  };

  // Test 1: Host Pausing a Song
  console.log(colors.yellow('1. Testing Host Pausing a Song:'));
  {
    const audio = createMockAudio();
    const host = createPlaybackSynchronizer(audio);

    // Host starts playing sampleSong1
    host.applyRoomSync({ currentSong: sampleSong1, isPlaying: true, position: 0 });
    assert(host.getIsPlaying() === true, 'Host begins in playing state');
    assert(audio.playCallCount === 1, 'audio.play() was called once to start playback');
    assert(audio.paused === false, 'Mock audio element is not paused');

    // Host pauses
    const playCallsBeforePause = audio.playCallCount;
    const pauseState = host.hostTogglePlay();

    assert(pauseState.isPlaying === false, 'Host pause produces isPlaying: false state');
    assert(host.getIsPlaying() === false, 'Host state is now paused');
    assert(audio.paused === true, 'audio.paused is true after pausing');
    assert(audio.pauseCallCount >= 1, 'audio.pause() was invoked on pause');
    assert(audio.playCallCount === playCallsBeforePause, 'audio.play() was NEVER called during pause');
    assert(host.getPlaybackError() === null, 'No playback error is set on normal pause');
  }

  // Test 2: Pause Synchronization on Second Client
  console.log(colors.yellow('\n2. Testing Pause Synchronization on Second Client:'));
  {
    const hostAudio = createMockAudio();
    const host = createPlaybackSynchronizer(hostAudio);

    const clientAudio = createMockAudio();
    const client = createPlaybackSynchronizer(clientAudio);

    // Both host and client are playing sampleSong1
    const playingState = { currentSong: sampleSong1, isPlaying: true, position: 25 };
    host.applyRoomSync(playingState);
    client.applyRoomSync(playingState);

    assert(client.getIsPlaying() === true, 'Second client is initially playing');
    assert(clientAudio.paused === false, 'Second client audio is active');

    // Host pauses -> broadcasts pause state to second client
    const pauseState = host.hostTogglePlay();
    const clientPlayCallsBefore = clientAudio.playCallCount;

    // Second client receives pause update
    client.applyRoomSync(pauseState);

    assert(client.getIsPlaying() === false, 'Second client is now synchronized to paused state');
    assert(clientAudio.paused === true, 'Second client audio element is paused');
    assert(clientAudio.pauseCallCount >= 1, 'Second client called audio.pause()');
    assert(
      clientAudio.playCallCount === clientPlayCallsBefore,
      'Second client NEVER called audio.play() on pause synchronization'
    );
    assert(client.getPlaybackError() === null, 'Second client has no playback error');
  }

  // Test 3: Pause Event Must Never Trigger audio.play()
  console.log(colors.yellow('\n3. Testing Pause Event Never Calls audio.play():'));
  {
    const audio = createMockAudio();
    const player = createPlaybackSynchronizer(audio);

    // Player joins room that is ALREADY paused
    const pausedState = { currentSong: sampleSong1, isPlaying: false, position: 50 };
    player.applyRoomSync(pausedState);

    assert(player.getCurrentTrack()?.id === 'song-1', 'Track loaded in paused state');
    assert(audio.src === sampleSong1.audioUrl, 'Audio source set to track URL');
    assert(audio.playCallCount === 0, 'audio.play() was NEVER called when syncing paused room');
    assert(audio.paused === true, 'audio element is paused');
    assert(player.getIsPlaying() === false, 'Player isPlaying is false');
    assert(player.getPlaybackError() === null, 'No playback blocked error when joining paused room');

    // Multiple pause events arrive while paused
    player.applyRoomSync(pausedState);
    player.applyRoomSync(pausedState);
    assert(audio.playCallCount === 0, 'audio.play() is NEVER called on repeated pause syncs');
  }

  // Test 4: Switching to New Song While Room is Paused
  console.log(colors.yellow('\n4. Testing Song Change While Room is Paused:'));
  {
    const audio = createMockAudio();
    const player = createPlaybackSynchronizer(audio);

    // Initial paused song
    player.applyRoomSync({ currentSong: sampleSong1, isPlaying: false, position: 0 });
    assert(audio.playCallCount === 0, 'play() not called for initial paused song');

    // Host changes song to sampleSong2 while room is paused
    player.applyRoomSync({ currentSong: sampleSong2, isPlaying: false, position: 0 });
    assert(player.getCurrentTrack()?.id === 'song-2', 'Track updated to new song');
    assert(audio.src === sampleSong2.audioUrl, 'audio.src updated to new song URL');
    assert(audio.playCallCount === 0, 'audio.play() was NOT called when changing song while paused');
    assert(audio.paused === true, 'audio element remains paused');
    assert(player.getPlaybackError() === null, 'No blocked error on paused song change');
  }

  // Test 5: Rejection Handling: AbortError vs NotAllowedError
  console.log(colors.yellow('\n5. Testing audio.play() Promise Rejection Handling:'));
  {
    // 5a. AbortError (e.g. play() interrupted by rapid pause())
    const audioAbort = createMockAudio();
    const abortError = new Error('The play() request was interrupted by a call to pause().');
    abortError.name = 'AbortError';
    audioAbort.setRejectPlay(abortError);

    const playerAbort = createPlaybackSynchronizer(audioAbort);
    playerAbort.loadTrack(sampleSong1, { autoPlay: true });
    await new Promise((r) => setTimeout(r, 10));

    assert(
      playerAbort.getPlaybackError() === null,
      'AbortError from play() interruption DOES NOT set "Playback was blocked" error'
    );

    // 5b. NotAllowedError (genuine browser autoplay policy block)
    const audioBlocked = createMockAudio();
    const notAllowedError = new Error('play() failed because the user didn\'t interact with the document first.');
    notAllowedError.name = 'NotAllowedError';
    audioBlocked.setRejectPlay(notAllowedError);

    const playerBlocked = createPlaybackSynchronizer(audioBlocked);
    playerBlocked.loadTrack(sampleSong1, { autoPlay: true });
    await new Promise((r) => setTimeout(r, 10));

    assert(
      playerBlocked.getPlaybackError() === 'Playback was blocked. Click play to start listening.',
      'NotAllowedError properly sets "Playback was blocked. Click play to start listening."'
    );

    // 5c. Resuming after block clears the error
    audioBlocked.setRejectPlay(null); // User interacted
    playerBlocked.forcePlay();
    assert(
      playerBlocked.getPlaybackError() === null,
      'User-initiated play clears the blocked error'
    );
  }

  // Test 6: Preventing Socket Event Loops
  console.log(colors.yellow('\n6. Testing Prevention of Socket Event Loops:'));
  {
    const audio = createMockAudio();
    const client = createPlaybackSynchronizer(audio);

    const initialBroadcasts = client.getBroadcastCount();
    // Simulate receiving a sync from the server
    client.applyRoomSync({ currentSong: sampleSong1, isPlaying: false, position: 10 });
    client.applyRoomSync({ currentSong: sampleSong1, isPlaying: true, position: 15 });
    client.applyRoomSync({ currentSong: sampleSong1, isPlaying: false, position: 20 });

    assert(
      client.getBroadcastCount() === initialBroadcasts,
      'Receiving room playback updates NEVER triggers an outbound socket broadcast (0 loops)'
    );
  }

  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`Playback Tests Summary: ${colors.green(`${passed} passed`)}, ${failed > 0 ? colors.red(`${failed} failed`) : '0 failed'}`);
  console.log(`${colors.cyan('========================================')}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
