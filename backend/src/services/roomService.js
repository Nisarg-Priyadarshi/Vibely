import crypto from 'crypto';
import Song from '../models/Song.js';

// In-memory registry for Vibely Rooms
// Note: Active rooms reside in-memory for this single-instance deployment and reset on server restart.
const rooms = new Map(); // code -> room object
const socketToRoom = new Map(); // socketId -> room code

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous chars
const MAX_MEMBERS_PER_ROOM = 50;

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
  } while (rooms.has(code));
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
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  socketToRoom.set(socketId, code);

  return serializeRoom(room);
};

/**
 * Join an existing room using its code.
 */
export const joinRoom = ({ code, user, socketId }) => {
  if (!code || typeof code !== 'string') {
    throw new Error('Room code is required.');
  }

  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    throw new Error(`Room with code "${normalizedCode}" not found.`);
  }

  const userId = (user.id || user._id).toString();

  // Check if user is already a member
  const existingMemberIndex = room.members.findIndex((m) => m.userId === userId);

  if (existingMemberIndex >= 0) {
    // Reconnecting user: update socket ID
    room.members[existingMemberIndex].socketId = socketId;
    socketToRoom.set(socketId, normalizedCode);
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
 * Leave a room. Reassigns host if host left, or deletes room if empty.
 */
export const leaveRoom = ({ code, userId, socketId }) => {
  const normalizedCode = code ? code.trim().toUpperCase() : socketToRoom.get(socketId);
  if (!normalizedCode) return null;

  const room = rooms.get(normalizedCode);
  if (!room) return null;

  const strUserId = userId.toString();

  // Remove member
  room.members = room.members.filter((m) => m.userId !== strUserId);
  socketToRoom.delete(socketId);

  // If room is now empty, delete it
  if (room.members.length === 0) {
    rooms.delete(normalizedCode);
    return { deleted: true, code: normalizedCode };
  }

  let newHost = null;

  // If host departed, assign new host deterministically to the oldest remaining member
  if (room.hostId === strUserId) {
    const nextHostMember = room.members[0];
    room.hostId = nextHostMember.userId;
    room.hostName = nextHostMember.name;
    room.state.hostId = nextHostMember.userId;
    newHost = {
      userId: nextHostMember.userId,
      name: nextHostMember.name,
    };
  }

  return {
    deleted: false,
    newHost,
    room: serializeRoom(room),
  };
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
  const room = rooms.get(code.trim().toUpperCase());
  return serializeRoom(room);
};

/**
 * Get list of active rooms.
 */
export const getAllRooms = () => {
  return Array.from(rooms.values()).map(serializeRoom);
};

/**
 * Helper to get code by socket ID.
 */
export const getCodeBySocket = (socketId) => socketToRoom.get(socketId);

export default {
  createRoom,
  joinRoom,
  leaveRoom,
  updateHostPlayback,
  submitMemberRequest,
  respondToRequest,
  getRoom,
  getAllRooms,
  getCodeBySocket,
};
