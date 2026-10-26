import crypto from 'crypto';
import Song from '../models/Song.js';

// In-memory registry for Vibely Rooms
// Note: Active rooms reside in-memory for this single-instance deployment and reset on server restart.
const rooms = new Map(); // code -> room object
const socketToRoom = new Map(); // socketId -> room code
const cancelledRooms = new Set(); // codes of cancelled rooms that cannot be rejoined
const hostDisconnectTimers = new Map(); // code -> NodeJS.Timeout

let hostDisconnectGraceMs = process.env.ROOM_HOST_DISCONNECT_GRACE_MS
  ? parseInt(process.env.ROOM_HOST_DISCONNECT_GRACE_MS, 10)
  : (process.env.NODE_ENV === 'test' ? 2000 : 60000); // 60s production default, 2s test mode

export const setHostDisconnectGraceMs = (ms) => {
  hostDisconnectGraceMs = ms;
};

export const getHostDisconnectGraceMs = () => hostDisconnectGraceMs;

export const clearDisconnectTimer = (code) => {
  const normalized = code ? code.trim().toUpperCase() : null;
  if (normalized && hostDisconnectTimers.has(normalized)) {
    clearTimeout(hostDisconnectTimers.get(normalized));
    hostDisconnectTimers.delete(normalized);
  }
};

export const hasDisconnectTimer = (code) => {
  const normalized = code ? code.trim().toUpperCase() : null;
  return normalized ? hostDisconnectTimers.has(normalized) : false;
};

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous chars
const MAX_MEMBERS_PER_ROOM = 50;
const MAX_CHAT_MESSAGES = 200;

/**
 * Generate a cryptographically random, unguessable room code.
 * @returns {string} e.g. "VIBE-8K2N"
 */
export const generateRoomCode = () => {
  let code = '';
  do {
    const bytes = crypto.randomBytes(4);
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 3; i++) {
      part1 += ALPHABET[bytes[i] % ALPHABET.length];
    }
    for (let i = 2; i < 4; i++) {
      part2 += ALPHABET[bytes[i] % ALPHABET.length];
    }
    code = `${part1}${part2}`;
  } while (rooms.has(code) || cancelledRooms.has(code));
  return code;
};

/**
 * Get safe room representation for broadcasting to clients.
 */
export const serializeRoom = (room) => {
  if (!room) return null;

  return {
    code: room.code,
    name: room.name,
    description: room.description || '',
    hostId: room.hostId,
    hostName: room.hostName,
    members: room.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      avatar: m.avatar || null,
      joinedAt: m.joinedAt,
      isHost: m.userId === room.hostId,
    })),
    memberCount: room.members.length,
    state: {
      currentSong: room.state.currentSong || null,
      isPlaying: room.state.isPlaying,
      position: room.state.position,
      updatedAt: room.state.updatedAt,
      hostId: room.hostId,
    },
    requests: Array.from(room.requests.values()),
    createdAt: room.createdAt,
  };
};

/**
 * Create a new room with creator as initial host.
 */
export const createRoom = ({ name, description = '', user, socketId }) => {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new Error('Room name must be at least 2 characters long.');
  }
  if (name.trim().length > 50) {
    throw new Error('Room name cannot exceed 50 characters.');
  }

  const code = generateRoomCode();
  const userId = (user.id || user._id).toString();

  const room = {
    code,
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    hostId: userId,
    hostName: user.name,
    members: [
      {
        userId,
        name: user.name,
        avatar: user.avatar || null,
        socketId,
        joinedAt: Date.now(),
      },
    ],
    state: {
      currentSong: null,
      isPlaying: false,
      position: 0,
      updatedAt: Date.now(),
      hostId: userId,
    },
    requests: new Map(),
    messages: [],
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  socketToRoom.set(socketId, code);

  return serializeRoom(room);
};

/** Return recent room messages to an authenticated member. */
export const getRoomMessages = ({ code, userId }) => {
  const room = rooms.get(code.trim().toUpperCase());
  if (!room || !room.members.some((member) => member.userId === userId.toString())) {
    throw new Error('You must be a room member to read chat.');
  }
  return room.messages;
};

/** Store and sequence a chat message on the server before broadcasting it. */
export const addRoomMessage = ({ code, user, socketId, text }) => {
  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);
  const userId = (user.id || user._id).toString();
  if (!room || !room.members.some((member) => member.userId === userId && member.socketId === socketId)) {
    throw new Error('You must be a connected room member to send chat.');
  }
  if (typeof text !== 'string' || !text.trim() || text.length > 2000) {
    throw new Error('Message must contain 1 to 2000 characters.');
  }
  const message = {
    id: crypto.randomUUID(),
    sequence: (room.messages.at(-1)?.sequence || 0) + 1,
    userId,
    userName: user.name,
    text: text.trim(),
    createdAt: Date.now(),
  };
  room.messages.push(message);
  if (room.messages.length > MAX_CHAT_MESSAGES) room.messages.shift();
  return { code: normalizedCode, message };
};

/**
 * Join an existing room using its code.
 */
export const joinRoom = ({ code, user, socketId }) => {
  if (!code || typeof code !== 'string') {
    throw new Error('Room code is required.');
  }

  const normalizedCode = code.trim().toUpperCase();

  if (cancelledRooms.has(normalizedCode)) {
    throw new Error('This room has been closed.');
  }

  const room = rooms.get(normalizedCode);

  if (!room || room.isCancelled) {
    throw new Error(`Room with code "${normalizedCode}" not found.`);
  }

  const userId = (user.id || user._id).toString();

  // Check if user is already a member
  const existingMemberIndex = room.members.findIndex((m) => m.userId === userId);

  if (existingMemberIndex >= 0) {
    // Reconnecting user: update socket ID
    room.members[existingMemberIndex].socketId = socketId;
    socketToRoom.set(socketId, normalizedCode);

    // If reconnecting user is the room host, clear the disconnect grace timer
    if (room.hostId === userId) {
      clearDisconnectTimer(normalizedCode);
      room.hostDisconnectedAt = null;
    }

    return { room: serializeRoom(room), isNewMember: false };
  }

  if (room.members.length >= MAX_MEMBERS_PER_ROOM) {
    throw new Error('Room is at maximum member capacity.');
  }

  // Add new member
  room.members.push({
    userId,
    name: user.name,
    avatar: user.avatar || null,
    socketId,
    joinedAt: Date.now(),
  });

  socketToRoom.set(socketId, normalizedCode);

  return { room: serializeRoom(room), isNewMember: true };
};

/**
 * Leave a room.
 * When the host leaves, the room is cancelled and closed, and all members are removed.
 * When an ordinary member leaves, only that member is removed; the room stays active.
 */
export const leaveRoom = ({ code, userId, socketId }) => {
  const normalizedCode = code ? code.trim().toUpperCase() : socketToRoom.get(socketId);
  if (!normalizedCode) return null;

  if (cancelledRooms.has(normalizedCode)) {
    return null;
  }

  const room = rooms.get(normalizedCode);
  if (!room || room.isCancelled) return null;

  const strUserId = userId.toString();
  const isHost = room.hostId === strUserId;
  const isMember = room.members.some((m) => m.userId === strUserId);

  if (!isHost && !isMember) {
    return null;
  }

  // Clear any active disconnect grace timer for this room
  clearDisconnectTimer(normalizedCode);

  // If the departing user is the host: cancel and close the room completely
  if (isHost) {
    room.isCancelled = true;
    cancelledRooms.add(normalizedCode);
    rooms.delete(normalizedCode);

    const affectedMembers = [...room.members];

    // Clean up socketToRoom mappings for all room members and host
    for (const m of affectedMembers) {
      if (m.socketId) {
        socketToRoom.delete(m.socketId);
      }
    }
    if (socketId) {
      socketToRoom.delete(socketId);
    }

    // Clean up room state, pending requests, and messages
    room.requests.clear();
    room.messages = [];
    room.state.isPlaying = false;

    return {
      cancelled: true,
      code: normalizedCode,
      reason: 'The host left. This room has been closed.',
      members: affectedMembers,
    };
  }

  // Non-host member leaves: remove only that member
  room.members = room.members.filter((m) => m.userId !== strUserId);
  if (socketId) {
    socketToRoom.delete(socketId);
  }

  // If room is now empty, delete it
  if (room.members.length === 0) {
    clearDisconnectTimer(normalizedCode);
    rooms.delete(normalizedCode);
    return {
      deleted: true,
      code: normalizedCode,
      reason: 'Room was closed because all listeners left.',
    };
  }

  return {
    cancelled: false,
    deleted: false,
    room: serializeRoom(room),
  };
};

/**
 * Handle transport-level socket disconnection.
 * A host disconnection is treated as temporary and starts a grace period timer.
 * Only if the host fails to reconnect before the timer expires is the room closed.
 * A non-host disconnection removes only that member and keeps the room alive.
 */
export const handleDisconnect = ({ socketId, userId, onHostTimeout }) => {
  const normalizedCode = socketToRoom.get(socketId);
  if (!normalizedCode) return null;

  // Clean up socket mapping for the disconnected socket
  socketToRoom.delete(socketId);

  const room = rooms.get(normalizedCode);
  if (!room || room.isCancelled) return null;

  const strUserId = userId.toString();
  const isHost = room.hostId === strUserId;

  if (isHost) {
    // Host temporarily disconnected: do NOT immediately cancel or delete the room!
    const hostMember = room.members.find((m) => m.userId === strUserId);
    if (hostMember) {
      hostMember.socketId = null;
    }
    room.hostDisconnectedAt = Date.now();

    // Clear any prior timer for this room
    clearDisconnectTimer(normalizedCode);

    // Start grace period timer
    const graceMs = hostDisconnectGraceMs;
    const timer = setTimeout(() => {
      hostDisconnectTimers.delete(normalizedCode);

      const targetRoom = rooms.get(normalizedCode);
      if (!targetRoom || targetRoom.isCancelled) return;

      // Check if host reconnected in the meantime
      const currentHost = targetRoom.members.find((m) => m.userId === targetRoom.hostId);
      if (currentHost && currentHost.socketId) {
        return; // Host reconnected, do not clean up
      }

      // Host timed out: cancel and close room
      targetRoom.isCancelled = true;
      cancelledRooms.add(normalizedCode);
      rooms.delete(normalizedCode);

      const affectedMembers = [...targetRoom.members];
      for (const m of affectedMembers) {
        if (m.socketId) {
          socketToRoom.delete(m.socketId);
        }
      }
      targetRoom.requests.clear();
      targetRoom.messages = [];
      targetRoom.state.isPlaying = false;

      if (typeof onHostTimeout === 'function') {
        onHostTimeout({
          code: normalizedCode,
          reason: 'The host left. This room has been closed.',
          members: affectedMembers,
        });
      }
    }, graceMs);

    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
    hostDisconnectTimers.set(normalizedCode, timer);

    return {
      isHost: true,
      code: normalizedCode,
      room: serializeRoom(room),
    };
  }

  // Non-host member disconnected
  room.members = room.members.filter((m) => m.userId !== strUserId);

  // If room is now empty, delete it
  if (room.members.length === 0) {
    clearDisconnectTimer(normalizedCode);
    rooms.delete(normalizedCode);
    return {
      deleted: true,
      code: normalizedCode,
      reason: 'Room was closed because all listeners left.',
    };
  }

  return {
    isHost: false,
    deleted: false,
    room: serializeRoom(room),
  };
};

/**
 * Cancel any rooms currently hosted by a user (e.g. if creating a new room).
 */
export const cancelRoomsHostedBy = (userId) => {
  const strUserId = userId.toString();
  const cancelled = [];
  for (const [code, room] of rooms.entries()) {
    if (room.hostId === strUserId) {
      clearDisconnectTimer(code);
      room.isCancelled = true;
      cancelledRooms.add(code);
      rooms.delete(code);
      cancelled.push({
        code,
        reason: 'The host created a new room. This room has been closed.',
        members: [...room.members],
      });
    }
  }
  return cancelled;
};

/**
 * Update playback state directly (Host only).
 */
export const updateHostPlayback = async ({ code, userId, action, payload = {} }) => {
  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    throw new Error('Room not found.');
  }

  if (room.hostId !== userId.toString()) {
    throw new Error('Forbidden: Only the room host can control playback directly.');
  }

  const { state } = room;

  switch (action) {
    case 'play': {
      state.isPlaying = true;
      if (typeof payload.position === 'number' && payload.position >= 0) {
        state.position = payload.position;
      }
      state.updatedAt = Date.now();
      break;
    }

    case 'pause': {
      state.isPlaying = false;
      if (typeof payload.position === 'number' && payload.position >= 0) {
        state.position = payload.position;
      }
      state.updatedAt = Date.now();
      break;
    }

    case 'seek': {
      if (typeof payload.position !== 'number' || payload.position < 0) {
        throw new Error('Valid numeric seek position in seconds is required.');
      }
      state.position = payload.position;
      state.updatedAt = Date.now();
      break;
    }

    case 'change_track': {
      if (!payload.songId) {
        throw new Error('songId is required to change track.');
      }

      // Verify song exists in catalogue
      const song = await Song.findById(payload.songId);
      if (!song) {
        throw new Error('Requested song does not exist in catalogue.');
      }

      state.currentSong = song.toJSON();
      state.position = 0;
      state.isPlaying = true;
      state.updatedAt = Date.now();
      break;
    }

    default:
      throw new Error(`Unsupported playback action: "${action}".`);
  }

  return {
    state: {
      ...state,
      hostId: room.hostId,
    },
    action,
  };
};

/**
 * Submit a playback request from a member to the host.
 */
export const submitMemberRequest = async ({ code, user, action, payload = {} }) => {
  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    throw new Error('Room not found.');
  }

  const allowedActions = ['play', 'pause', 'seek', 'change_track'];
  if (!allowedActions.includes(action)) {
    throw new Error(`Invalid action request: "${action}".`);
  }

  let enrichedPayload = { ...payload };

  if (action === 'change_track') {
    if (!payload.songId) {
      throw new Error('songId is required to request a track change.');
    }
    const song = await Song.findById(payload.songId);
    if (!song) {
      throw new Error('Requested song not found in catalogue.');
    }
    enrichedPayload.song = song.toJSON();
  }

  const requestId = crypto.randomBytes(6).toString('hex');
  const requestItem = {
    requestId,
    userId: (user.id || user._id).toString(),
    userName: user.name,
    action,
    payload: enrichedPayload,
    createdAt: Date.now(),
  };

  room.requests.set(requestId, requestItem);

  return {
    request: requestItem,
    hostSocketId: room.members.find((m) => m.userId === room.hostId)?.socketId,
  };
};

/**
 * Host accepts or rejects a member playback request.
 */
export const respondToRequest = async ({ code, hostUserId, requestId, approved }) => {
  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    throw new Error('Room not found.');
  }

  if (room.hostId !== hostUserId.toString()) {
    throw new Error('Forbidden: Only the room host can respond to requests.');
  }

  const requestItem = room.requests.get(requestId);
  if (!requestItem) {
    throw new Error('Request not found or already handled.');
  }

  // Remove request from pending map
  room.requests.delete(requestId);

  if (!approved) {
    return {
      approved: false,
      requestId,
      requestItem,
    };
  }

  // If approved, execute the requested action as host
  const { state } = await updateHostPlayback({
    code: normalizedCode,
    userId: hostUserId,
    action: requestItem.action,
    payload: requestItem.payload,
  });

  return {
    approved: true,
    requestId,
    requestItem,
    state,
  };
};

/**
 * Get room by code (safe representation).
 */
export const getRoom = (code) => {
  if (!code) return null;
  const normalizedCode = code.trim().toUpperCase();
  if (cancelledRooms.has(normalizedCode)) return null;
  const room = rooms.get(normalizedCode);
  if (!room || room.isCancelled) return null;
  return serializeRoom(room);
};

/**
 * Get list of active rooms.
 */
export const getAllRooms = () => {
  return Array.from(rooms.values())
    .filter((r) => !r.isCancelled && !cancelledRooms.has(r.code))
    .map(serializeRoom);
};

/**
 * Helper to get code by socket ID.
 */
export const getCodeBySocket = (socketId) => socketToRoom.get(socketId);

/**
 * Helper to check if a room code was cancelled.
 */
export const isRoomCancelled = (code) => {
  if (!code) return false;
  return cancelledRooms.has(code.trim().toUpperCase());
};

/**
 * Test utility to reset all room state.
 */
export const _resetRooms = () => {
  for (const timer of hostDisconnectTimers.values()) {
    clearTimeout(timer);
  }
  hostDisconnectTimers.clear();
  rooms.clear();
  socketToRoom.clear();
  cancelledRooms.clear();
  hostDisconnectGraceMs = process.env.ROOM_HOST_DISCONNECT_GRACE_MS
    ? parseInt(process.env.ROOM_HOST_DISCONNECT_GRACE_MS, 10)
    : (process.env.NODE_ENV === 'test' ? 2000 : 60000);
};

export default {
  createRoom,
  joinRoom,
  leaveRoom,
  handleDisconnect,
  cancelRoomsHostedBy,
  setHostDisconnectGraceMs,
  getHostDisconnectGraceMs,
  clearDisconnectTimer,
  hasDisconnectTimer,
  updateHostPlayback,
  submitMemberRequest,
  respondToRequest,
  getRoom,
  getAllRooms,
  getCodeBySocket,
  isRoomCancelled,
  _resetRooms,
};
