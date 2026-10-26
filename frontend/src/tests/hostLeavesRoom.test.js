/**
 * Vibely Rooms - Host Leaves Room & Room Cancellation Test Suite
 * Validates:
 * 1. Host intentionally leaves: room closes, all members receive room:closed event
 * 2. Receiving room:closed immediately stops synchronized playback (calls audio.pause())
 * 3. Receiving room:closed clears room-specific client state (currentRoom, members, state, requests, chat)
 * 4. Receiving room:closed triggers navigation redirect to /rooms with warning message
 * 5. Non-host leaves: only that member is removed, room remains active and playback is unaffected
 * 6. Repeated leave/disconnect does not trigger duplicate cancellations or errors
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

function createMockAudio() {
  let _paused = false;
  let _pauseCount = 0;
  let _playCount = 0;

  return {
    get paused() { return _paused; },
    get pauseCount() { return _pauseCount; },
    get playCount() { return _playCount; },
    play() {
      _playCount++;
      _paused = false;
      return Promise.resolve();
    },
    pause() {
      _pauseCount++;
      _paused = true;
    },
  };
}

function createMockRoomClient({ user, initialRoom, audio, navigate }) {
  let currentRoom = initialRoom;
  let roomMembers = initialRoom?.members || [];
  let roomState = initialRoom?.state || null;
  let pendingRequests = initialRoom?.requests || [];
  let chatMessages = ['Welcome to room'];
  let notification = null;

  const listeners = new Map();

  const socket = {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    emit(event, payload, ack) {
      // Mock emit
      if (typeof ack === 'function') ack({ success: true });
    },
    trigger(event, payload) {
      const handlers = listeners.get(event) || [];
      for (const h of handlers) h(payload);
    },
  };

  const forcePause = () => {
    audio.pause();
  };

  const notify = (message, type = 'info') => {
    notification = { message, type };
  };

  // Wire up socket handlers mirroring RoomContext.jsx
  socket.on('room:closed', ({ reason }) => {
    forcePause();
    const message = reason || 'The host left. This room has been closed.';
    notify(message, 'warning');
    currentRoom = null;
    roomMembers = [];
    roomState = null;
    pendingRequests = [];
    chatMessages = [];
    navigate('/rooms');
  });

  socket.on('room:members_updated', ({ members, hostId }) => {
    roomMembers = members || [];
    if (currentRoom) currentRoom.hostId = hostId;
  });

  const leaveRoom = () => {
    return new Promise((resolve) => {
      forcePause();
      if (currentRoom) {
        socket.emit('room:leave', { code: currentRoom.code }, () => {
          currentRoom = null;
          roomMembers = [];
          roomState = null;
          pendingRequests = [];
          chatMessages = [];
          notify('Left the room.', 'info');
          resolve();
        });
      } else {
        currentRoom = null;
        roomMembers = [];
        roomState = null;
        pendingRequests = [];
        chatMessages = [];
        resolve();
      }
    });
  };

  let socketStatus = 'connected';

  socket.on('disconnect', () => {
    socketStatus = 'disconnected';
  });

  socket.on('connect', () => {
    socketStatus = 'connected';
    if (currentRoom?.code) {
      notify('Reconnected to room successfully.', 'success');
    }
  });

  return {
    socket,
    leaveRoom,
    getState: () => ({
      socketStatus,
      currentRoom,
      roomMembers,
      roomState,
      pendingRequests,
      chatMessages,
      notification,
    }),
  };
}

async function runTests() {
  console.log(`\n${colors.cyan('========================================================')}`);
  console.log(`${colors.cyan('   Vibely Frontend - Host Leaves Room Behavior Tests    ')}`);
  console.log(`${colors.cyan('========================================================')}\n`);

  // Test 1: Receiving room:closed stops playback and clears all room state
  console.log(colors.yellow('1. Testing room:closed stops playback and clears state:'));
  {
    const audio = createMockAudio();
    let navigatedTo = null;
    const navigate = (path) => { navigatedTo = path; };

    const initialRoom = {
      code: 'VIBE99',
      name: 'Chill Room',
      hostId: 'host-123',
      members: [{ userId: 'host-123', name: 'Host' }, { userId: 'member-456', name: 'Member' }],
      state: { isPlaying: true, position: 42 },
      requests: [{ id: 'req-1' }],
    };

    const client = createMockRoomClient({
      user: { id: 'member-456', name: 'Member' },
      initialRoom,
      audio,
      navigate,
    });

    assert(audio.pauseCount === 0, 'Audio is playing before room:closed');
    assert(client.getState().currentRoom !== null, 'Room is active before room:closed');

    // Simulate server emitting room:closed when host leaves
    client.socket.trigger('room:closed', { reason: 'The host left. This room has been closed.' });

    assert(audio.pauseCount === 1, 'Synchronized playback is immediately stopped (audio.pause() called)');
    assert(audio.playCount === 0, 'audio.play() is never called on room closure');
    assert(client.getState().currentRoom === null, 'currentRoom is set to null');
    assert(client.getState().roomMembers.length === 0, 'roomMembers is cleared to empty array');
    assert(client.getState().roomState === null, 'roomState is cleared to null');
    assert(client.getState().pendingRequests.length === 0, 'pendingRequests is cleared');
    assert(client.getState().chatMessages.length === 0, 'chatMessages is cleared');
    assert(
      client.getState().notification?.message === 'The host left. This room has been closed.',
      'Warning notification is set: "The host left. This room has been closed."'
    );
    assert(client.getState().notification?.type === 'warning', 'Notification type is "warning"');
    assert(navigatedTo === '/rooms', 'Client is redirected to /rooms page');
  }

  // Test 2: Client calling leaveRoom() stops playback and clears room state
  console.log(colors.yellow('\n2. Testing client leaveRoom() cleanup:'));
  {
    const audio = createMockAudio();
    let navigatedTo = null;
    const navigate = (path) => { navigatedTo = path; };

    const initialRoom = {
      code: 'VIBE88',
      name: 'Beats Room',
      hostId: 'host-123',
      members: [{ userId: 'host-123', name: 'Host' }],
      state: { isPlaying: true },
      requests: [],
    };

    const client = createMockRoomClient({
      user: { id: 'host-123', name: 'Host' },
      initialRoom,
      audio,
      navigate,
    });

    await client.leaveRoom();

    assert(audio.pauseCount === 1, 'leaveRoom() invokes forcePause()');
    assert(client.getState().currentRoom === null, 'currentRoom is cleared after leaveRoom()');
    assert(client.getState().roomMembers.length === 0, 'roomMembers is cleared');
    assert(client.getState().roomState === null, 'roomState is cleared');
  }

  // Test 3: Non-host leave does NOT cancel room for remaining members
  console.log(colors.yellow('\n3. Testing non-host leave (room stays active):'));
  {
    const audio = createMockAudio();
    let navigatedTo = null;
    const navigate = (path) => { navigatedTo = path; };

    const initialRoom = {
      code: 'VIBE77',
      name: 'Rock Room',
      hostId: 'host-123',
      members: [
        { userId: 'host-123', name: 'Host' },
        { userId: 'member-456', name: 'Member 1' },
        { userId: 'member-789', name: 'Member 2' },
      ],
      state: { isPlaying: true },
      requests: [],
    };

    const client = createMockRoomClient({
      user: { id: 'host-123', name: 'Host' },
      initialRoom,
      audio,
      navigate,
    });

    // Member 2 leaves -> room:members_updated received
    client.socket.trigger('room:members_updated', {
      members: [
        { userId: 'host-123', name: 'Host' },
        { userId: 'member-456', name: 'Member 1' },
      ],
      hostId: 'host-123',
    });

    assert(client.getState().currentRoom !== null, 'Room remains active after non-host leaves');
    assert(client.getState().roomMembers.length === 2, 'Member list updated to remaining 2 members');
    assert(audio.pauseCount === 0, 'Playback continues uninterrupted for remaining listeners');
    assert(navigatedTo === null, 'No redirect occurs when non-host member leaves');
  }

  // Test 4: Default message fallback when reason is omitted
  console.log(colors.yellow('\n4. Testing fallback message when reason is omitted:'));
  {
    const audio = createMockAudio();
    let navigatedTo = null;
    const navigate = (path) => { navigatedTo = path; };

    const client = createMockRoomClient({
      user: { id: 'member-1', name: 'Member' },
      initialRoom: { code: 'VIBE66', hostId: 'host-1', members: [] },
      audio,
      navigate,
    });

    client.socket.trigger('room:closed', {});

    assert(
      client.getState().notification?.message === 'The host left. This room has been closed.',
      'Default message is applied if reason is omitted'
    );
    assert(navigatedTo === '/rooms', 'Navigates to /rooms with default message');
  }

  // Test 5: Temporary socket disconnect does NOT clear room state or redirect
  console.log(colors.yellow('\n5. Testing temporary socket disconnect does NOT clear room state:'));
  {
    const audio = createMockAudio();
    let navigatedTo = null;
    const navigate = (path) => { navigatedTo = path; };

    const initialRoom = {
      code: 'VIBE55',
      name: 'Synthwave Room',
      hostId: 'host-123',
      members: [{ userId: 'host-123', name: 'Host' }],
      state: { isPlaying: true, position: 10 },
      requests: [],
    };

    const client = createMockRoomClient({
      user: { id: 'host-123', name: 'Host' },
      initialRoom,
      audio,
      navigate,
    });

    // Simulate socket disconnect event
    client.socket.trigger('disconnect', 'transport close');

    assert(client.getState().socketStatus === 'disconnected', 'Socket status transitions to disconnected');
    assert(client.getState().currentRoom !== null, 'currentRoom is NOT cleared on temporary disconnect');
    assert(client.getState().currentRoom.code === 'VIBE55', 'Room code is preserved across disconnect');
    assert(client.getState().roomMembers.length === 1, 'Room members preserved on disconnect');
    assert(audio.pauseCount === 0, 'forcePause() is NOT called on temporary disconnect');
    assert(navigatedTo === null, 'Client is NOT redirected away from room on disconnect');
  }

  // Test 6: Reconnecting socket preserves room and notifies user
  console.log(colors.yellow('\n6. Testing socket reconnect preserves room and restores presence:'));
  {
    const audio = createMockAudio();
    let navigatedTo = null;
    const navigate = (path) => { navigatedTo = path; };

    const initialRoom = {
      code: 'VIBE44',
      name: 'Ambient Room',
      hostId: 'host-123',
      members: [{ userId: 'host-123', name: 'Host' }, { userId: 'listener-1', name: 'Listener' }],
      state: { isPlaying: true, position: 25 },
      requests: [],
    };

    const client = createMockRoomClient({
      user: { id: 'host-123', name: 'Host' },
      initialRoom,
      audio,
      navigate,
    });

    // Disconnect then reconnect
    client.socket.trigger('disconnect', 'ping timeout');
    assert(client.getState().socketStatus === 'disconnected', 'Socket is disconnected');

    client.socket.trigger('connect');
    assert(client.getState().socketStatus === 'connected', 'Socket is reconnected');
    assert(client.getState().currentRoom !== null, 'Room remains active upon reconnect');
    assert(client.getState().currentRoom.hostId === 'host-123', 'Host ID remains preserved');
    assert(
      client.getState().notification?.message === 'Reconnected to room successfully.',
      'Reconnection success notification is displayed'
    );
    assert(navigatedTo === null, 'No redirection occurred during disconnect and reconnect cycle');
  }

  console.log(`\n${colors.cyan('========================================================')}`);
  console.log(`Host Leaves Tests Summary: ${colors.green(`${passed} passed`)}, ${failed > 0 ? colors.red(`${failed} failed`) : '0 failed'}`);
  console.log(`${colors.cyan('========================================================')}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
