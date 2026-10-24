import { Server } from 'socket.io';
import { verifyToken, COOKIE_NAME } from '../services/authService.js';
import User from '../models/User.js';
import * as roomService from '../services/roomService.js';

let ioInstance = null;

/**
 * Extract JWT from handshake auth payload, headers, or cookies.
 */
const extractTokenFromHandshake = (socket) => {
  // 1. Handshake auth payload
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  // 2. Authorization header
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 3. Cookie header
  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, c) => {
      const [key, val] = c.trim().split('=');
      if (key && val) acc[key] = decodeURIComponent(val);
      return acc;
    }, {});
    if (cookies[COOKIE_NAME]) {
      return cookies[COOKIE_NAME];
    }
  }

  return null;
};

/**
 * Initialize Socket.IO with handshake authentication and Vibely Rooms event handling.
 * @param {import('http').Server} server 
 * @returns {Server}
 */
export const initializeSocket = (server) => {
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

  ioInstance = new Server(server, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // Socket.IO Handshake Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token = extractTokenFromHandshake(socket);

      if (!token) {
        return next(new Error('Authentication required: No token provided'));
      }

      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication failed: User no longer exists'));
      }

      // Attach authenticated user to socket
      socket.user = user;
      next();
    } catch (err) {
      next(new Error(`Socket authentication error: ${err.message}`));
    }
  });

  // Client Connection Handler
  ioInstance.on('connection', (socket) => {
    const userId = (socket.user.id || socket.user._id).toString();
    console.log(`⚡ [Socket.IO] Authenticated listener connected: ${socket.user.name} (${socket.id})`);

    // 1. Create Room
    socket.on('room:create', ({ name, description }, ack) => {
      try {
        const room = roomService.createRoom({
          name,
          description,
          user: socket.user,
          socketId: socket.id,
        });

        socket.join(room.code);
        if (typeof ack === 'function') ack({ success: true, room });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ code }, ack) => {
      try {
        const { room, isNewMember } = roomService.joinRoom({
          code,
          user: socket.user,
          socketId: socket.id,
        });

        socket.join(room.code);

        // Notify other room members of updated member list
        socket.to(room.code).emit('room:members_updated', {
          members: room.members,
          hostId: room.hostId,
        });

        if (typeof ack === 'function') ack({ success: true, room, isNewMember });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 3. Leave Room
    socket.on('room:leave', ({ code }, ack) => {
      try {
        const targetCode = code ? code.trim().toUpperCase() : roomService.getCodeBySocket(socket.id);
        const result = roomService.leaveRoom({
          code: targetCode,
          userId,
          socketId: socket.id,
        });

        if (targetCode) {
          socket.leave(targetCode);
        }

        if (result) {
          if (result.deleted) {
            ioInstance.to(result.code).emit('room:closed', {
              reason: 'Room was closed because all listeners left.',
            });
          } else {
            ioInstance.to(targetCode).emit('room:members_updated', {
              members: result.room.members,
              hostId: result.room.hostId,
            });

            if (result.newHost) {
              ioInstance.to(targetCode).emit('room:host_changed', {
                newHostId: result.newHost.userId,
                newHostName: result.newHost.name,
              });
            }
          }
        }

        if (typeof ack === 'function') ack({ success: true });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 4. Host Playback Control (Host only)
    socket.on('room:host_control', async ({ code, action, payload }, ack) => {
      try {
        const result = await roomService.updateHostPlayback({
          code,
          userId,
          action,
          payload,
        });

        // Broadcast synchronized state to ALL room members
        ioInstance.to(code.trim().toUpperCase()).emit('room:state_updated', {
          state: result.state,
          action: result.action,
        });

        if (typeof ack === 'function') ack({ success: true, state: result.state });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 5. Member Request Playback Action (Non-host request)
    socket.on('room:request_action', async ({ code, action, payload }, ack) => {
      try {
        const { request, hostSocketId } = await roomService.submitMemberRequest({
          code,
          user: socket.user,
          action,
          payload,
        });

        // Forward request specifically to the host
        if (hostSocketId) {
          ioInstance.to(hostSocketId).emit('room:request_received', request);
        }

        if (typeof ack === 'function') ack({ success: true, requestId: request.requestId });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 6. Host Responds to Member Request (Accept/Reject)
    socket.on('room:respond_request', async ({ code, requestId, approved }, ack) => {
      try {
        const result = await roomService.respondToRequest({
          code,
          hostUserId: userId,
          requestId,
          approved,
        });

        const targetCode = code.trim().toUpperCase();

        if (result.approved) {
          // If approved, broadcast state update to whole room
          ioInstance.to(targetCode).emit('room:state_updated', {
            state: result.state,
            action: result.requestItem.action,
          });
        }

        // Broadcast resolution notification
        ioInstance.to(targetCode).emit('room:request_handled', {
          requestId,
          approved: result.approved,
          action: result.requestItem.action,
          userName: result.requestItem.userName,
        });

        if (typeof ack === 'function') ack({ success: true, approved: result.approved });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 7. Sync Request (Fetch current room state on demand)
    socket.on('room:sync_request', ({ code }, ack) => {
      try {
        const room = roomService.getRoom(code);
        if (!room) {
          if (typeof ack === 'function') ack({ success: false, error: 'Room not found.' });
          return;
        }
        if (typeof ack === 'function') ack({ success: true, state: room.state, room });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 8. Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.user.name} (${socket.id})`);

      const code = roomService.getCodeBySocket(socket.id);
      if (code) {
        const result = roomService.leaveRoom({
          code,
          userId,
          socketId: socket.id,
        });

        if (result) {
          if (result.deleted) {
            ioInstance.to(result.code).emit('room:closed', {
              reason: 'Room was closed because all listeners left.',
            });
          } else {
            ioInstance.to(code).emit('room:members_updated', {
              members: result.room.members,
              hostId: result.room.hostId,
            });

            if (result.newHost) {
              ioInstance.to(code).emit('room:host_changed', {
                newHostId: result.newHost.userId,
                newHostName: result.newHost.name,
              });
            }
          }
        }
      }
    });
  });

  return ioInstance;
};

/**
 * Returns the initialized Socket.IO instance.
 * @returns {Server}
 */
export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return ioInstance;
};

export default {
  initializeSocket,
  getIO,
};
