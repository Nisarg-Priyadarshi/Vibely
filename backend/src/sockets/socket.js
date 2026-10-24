import { Server } from 'socket.io';
import { verifyToken, COOKIE_NAME } from '../services/authService.js';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import Message from '../models/Message.js';
import RoomInvitation from '../models/RoomInvitation.js';
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

    // Join private user room for direct messages and personal notifications
    socket.join(`user:${userId}`);

    // 1. Create Room
    socket.on('room:create', ({ name, description }, ack) => {
      try {
        const previousCode = roomService.getCodeBySocket(socket.id);
        if (previousCode) {
          const previous = roomService.leaveRoom({ code: previousCode, userId, socketId: socket.id });
          socket.leave(previousCode);
          if (previous && !previous.deleted) {
            ioInstance.to(previousCode).emit('room:members_updated', {
              members: previous.room.members,
              hostId: previous.room.hostId,
            });
          }
        }
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
        const requestedCode = code?.trim().toUpperCase();
        if (!requestedCode || !roomService.getRoom(requestedCode)) throw new Error('Room not found.');
        const previousCode = roomService.getCodeBySocket(socket.id);
        if (previousCode && previousCode !== requestedCode) {
          const previous = roomService.leaveRoom({ code: previousCode, userId, socketId: socket.id });
          socket.leave(previousCode);
          if (previous?.deleted) {
            ioInstance.to(previousCode).emit('room:closed', { reason: 'Room was closed because all listeners left.' });
          } else if (previous) {
            ioInstance.to(previousCode).emit('room:members_updated', {
              members: previous.room.members,
              hostId: previous.room.hostId,
            });
          }
        }
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

        const messages = roomService.getRoomMessages({ code: room.code, userId });
        if (typeof ack === 'function') ack({ success: true, room, isNewMember, messages });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // Room chat: persist and sequence on the server before broadcasting.
    socket.on('room:chat_send', ({ code, text }, ack) => {
      try {
        const { code: roomCode, message } = roomService.addRoomMessage({
          code,
          user: socket.user,
          socketId: socket.id,
          text,
        });
        ioInstance.to(roomCode).emit('room:chat_message', message);
        if (typeof ack === 'function') ack({ success: true, message });
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

        if (result) {
          if (result.cancelled) {
            // Host intentionally left: broadcast cancellation event to all members before removing them
            ioInstance.to(result.code).emit('room:closed', {
              reason: result.reason,
              code: result.code,
            });
            ioInstance.in(result.code).socketsLeave(result.code);
            if (Array.isArray(result.members)) {
              for (const m of result.members) {
                const s = ioInstance.sockets.sockets.get(m.socketId);
                if (s) s.leave(result.code);
              }
            }
            socket.leave(result.code);
          } else if (result.deleted) {
            ioInstance.to(result.code).emit('room:closed', {
              reason: result.reason || 'Room was closed because all listeners left.',
              code: result.code,
            });
            ioInstance.in(result.code).socketsLeave(result.code);
            socket.leave(result.code);
          } else if (result.room) {
            // Non-host left: only this member leaves, room stays active
            if (targetCode) {
              socket.leave(targetCode);
            }
            ioInstance.to(targetCode).emit('room:members_updated', {
              members: result.room.members,
              hostId: result.room.hostId,
            });
          }
        } else if (targetCode) {
          socket.leave(targetCode);
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

        const targetCode = code.trim().toUpperCase();

        // Broadcast synchronized state to ALL room members
        ioInstance.to(targetCode).emit('room:state_updated', {
          state: result.state,
          action: result.action,
        });

        if (result.action === 'pause') {
          ioInstance.to(targetCode).emit('room:pause', {
            state: result.state,
            position: result.state.position,
          });
        } else if (result.action === 'play') {
          ioInstance.to(targetCode).emit('room:play', {
            state: result.state,
            position: result.state.position,
          });
        }

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

          if (result.requestItem.action === 'pause') {
            ioInstance.to(targetCode).emit('room:pause', {
              state: result.state,
              position: result.state.position,
            });
          } else if (result.requestItem.action === 'play') {
            ioInstance.to(targetCode).emit('room:play', {
              state: result.state,
              position: result.state.position,
            });
          }
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

    // 8. Real-Time One-to-One Chat
    socket.on('chat:send', async ({ recipientId, content }, ack) => {
      try {
        if (!recipientId || !content || !content.trim()) {
          if (typeof ack === 'function') ack({ success: false, error: 'Recipient and content are required.' });
          return;
        }

        // Server-Side Security Check: Direct chat permitted ONLY between accepted friends
        const isFriend = await Friendship.areFriends(userId, recipientId);
        if (!isFriend) {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'Access denied: You can only message accepted friends.' });
          }
          return;
        }

        const message = await Message.create({
          sender: userId,
          recipient: recipientId,
          content: content.trim(),
        });

        const safeMessage = message.toSafeObject();

        // Broadcast to recipient user room
        ioInstance.to(`user:${recipientId}`).emit('chat:message', {
          ...safeMessage,
          senderUser: {
            id: socket.user._id.toString(),
            name: socket.user.name,
            avatar: socket.user.avatar || null,
          },
        });

        // Broadcast to sender user room (for multi-tab / self sync)
        ioInstance.to(`user:${userId}`).emit('chat:message', safeMessage);

        if (typeof ack === 'function') ack({ success: true, message: safeMessage });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 9. Chat Typing Indicator
    socket.on('chat:typing', ({ recipientId, isTyping }) => {
      if (recipientId) {
        ioInstance.to(`user:${recipientId}`).emit('chat:typing', {
          senderId: userId,
          isTyping: !!isTyping,
        });
      }
    });

    // 10. Room Invitation via Socket
    socket.on('room:invite', async ({ roomCode, friendId }, ack) => {
      try {
        if (!roomCode || !friendId) {
          if (typeof ack === 'function') ack({ success: false, error: 'Room code and friend ID required.' });
          return;
        }

        const room = roomService.getRoom(roomCode);
        if (!room) {
          if (typeof ack === 'function') ack({ success: false, error: 'Active room not found.' });
          return;
        }

        // Inviter must be inside room
        const isMember = room.members.some((m) => m.userId === userId);
        if (!isMember) {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'You must be inside the room to invite friends.' });
          }
          return;
        }

        // Must be accepted friends
        const isFriend = await Friendship.areFriends(userId, friendId);
        if (!isFriend) {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'You can only invite accepted friends.' });
          }
          return;
        }

        // Check if friend is already inside room
        const alreadyIn = room.members.some((m) => m.userId === friendId.toString());
        if (alreadyIn) {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'Friend is already in this room.' });
          }
          return;
        }

        const invitation = await RoomInvitation.create({
          roomCode: room.code,
          roomName: room.name,
          sender: userId,
          recipient: friendId,
          status: 'pending',
        });

        ioInstance.to(`user:${friendId}`).emit('room:invitation_received', {
          invitationId: invitation._id.toString(),
          roomCode: room.code,
          roomName: room.name,
          sender: {
            id: socket.user._id.toString(),
            name: socket.user.name,
            avatar: socket.user.avatar || null,
          },
          createdAt: invitation.createdAt,
        });

        if (typeof ack === 'function') ack({ success: true, invitationId: invitation._id.toString() });
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    // 11. Handle Disconnect
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
          if (result.cancelled) {
            // Host unexpectedly disconnected: broadcast cancellation event to all remaining members
            ioInstance.to(result.code).emit('room:closed', {
              reason: result.reason,
              code: result.code,
            });
            ioInstance.in(result.code).socketsLeave(result.code);
            if (Array.isArray(result.members)) {
              for (const m of result.members) {
                const s = ioInstance.sockets.sockets.get(m.socketId);
                if (s) s.leave(result.code);
              }
            }
          } else if (result.deleted) {
            ioInstance.to(result.code).emit('room:closed', {
              reason: result.reason || 'Room was closed because all listeners left.',
              code: result.code,
            });
            ioInstance.in(result.code).socketsLeave(result.code);
          } else if (result.room) {
            // Non-host disconnected: update member list
            ioInstance.to(code).emit('room:members_updated', {
              members: result.room.members,
              hostId: result.room.hostId,
            });
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
