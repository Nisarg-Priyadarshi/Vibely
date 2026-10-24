import mongoose from 'mongoose';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import RoomInvitation from '../models/RoomInvitation.js';
import * as roomService from '../services/roomService.js';
import { getIO } from '../sockets/socket.js';

/**
 * Emit socket event to a user's private room
 */
const emitToUser = (userId, event, payload) => {
  try {
    const io = getIO();
    io.to(`user:${userId.toString()}`).emit(event, payload);
  } catch (err) {
    // Socket.IO may not be active in test environments
  }
};

/**
 * Invite an accepted friend to a Vibely Room.
 * POST /api/rooms/invitations
 */
export const inviteFriendToRoom = async (req, res, next) => {
  try {
    const { roomCode, friendId } = req.body;
    const currentUserId = req.user._id;

    if (!roomCode || typeof roomCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'A valid room code is required.', status: 400 },
      });
    }

    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'A valid friend ID is required.', status: 400 },
      });
    }

    // 1. Verify Room exists in active rooms
    const cleanCode = roomCode.trim().toUpperCase();
    const room = roomService.getRoom(cleanCode);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: { message: 'Active room not found.', status: 404 },
      });
    }

    // 2. SECURITY CHECK: Inviter must be an active member of this room
    const isMember = room.members.some((m) => m.userId === currentUserId.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden. You must be inside the room to invite friends.',
          status: 403,
        },
      });
    }

    // 3. SECURITY CHECK: Recipient must be an accepted friend of inviter
    const isFriend = await Friendship.areFriends(currentUserId, friendId);
    if (!isFriend) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden. You can only invite accepted friends.',
          status: 403,
        },
      });
    }

    // 4. Check if friend is already in the room
    const alreadyInRoom = room.members.some((m) => m.userId === friendId.toString());
    if (alreadyInRoom) {
      return res.status(400).json({
        success: false,
        error: { message: 'This friend is already inside the room.', status: 400 },
      });
    }

    // 5. Create or refresh invitation
    const invitation = await RoomInvitation.create({
      roomCode: room.code,
      roomName: room.name,
      sender: currentUserId,
      recipient: friendId,
      status: 'pending',
    });

    // 6. Notify recipient in real time
    emitToUser(friendId, 'room:invitation_received', {
      invitationId: invitation._id.toString(),
      roomCode: room.code,
      roomName: room.name,
      sender: {
        id: currentUserId.toString(),
        name: req.user.name,
        avatar: req.user.avatar || null,
      },
      createdAt: invitation.createdAt,
    });

    res.status(201).json({
      success: true,
      message: `Invitation to "${room.name}" sent successfully!`,
      invitationId: invitation._id.toString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending room invitations for authenticated user.
 * GET /api/rooms/invitations
 */
export const getPendingInvitations = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const invitations = await RoomInvitation.find({
      recipient: currentUserId,
      status: 'pending',
    })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    // Filter to invitations for rooms that are still active
    const activeInvitations = invitations.map((inv) => {
      const activeRoom = roomService.getRoom(inv.roomCode);
      return {
        id: inv._id.toString(),
        roomCode: inv.roomCode,
        roomName: inv.roomName,
        isRoomActive: !!activeRoom,
        memberCount: activeRoom ? activeRoom.members.length : 0,
        sender: {
          id: inv.sender._id.toString(),
          name: inv.sender.name,
          email: inv.sender.email,
          avatar: inv.sender.avatar || null,
        },
        createdAt: inv.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      invitations: activeInvitations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept or decline a room invitation.
 * POST /api/rooms/invitations/:invitationId/respond
 */
export const respondToInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { accept } = req.body;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid invitation ID.', status: 400 },
      });
    }

    const invitation = await RoomInvitation.findById(invitationId).populate('sender', 'name');
    if (!invitation || invitation.status !== 'pending') {
      return res.status(404).json({
        success: false,
        error: { message: 'Invitation not found or already handled.', status: 404 },
      });
    }

    // SECURITY CHECK: Only designated recipient can respond
    if (invitation.recipient.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to respond to this invitation.', status: 403 },
      });
    }

    if (accept) {
      // Check if room is still active
      const room = roomService.getRoom(invitation.roomCode);
      if (!room) {
        invitation.status = 'expired';
        await invitation.save();
        return res.status(404).json({
          success: false,
          error: { message: 'This room has already ended or closed.', status: 404 },
        });
      }

      invitation.status = 'accepted';
      await invitation.save();

      emitToUser(invitation.sender._id, 'room:invitation_accepted', {
        invitationId: invitation._id.toString(),
        roomCode: invitation.roomCode,
        userName: req.user.name,
      });

      return res.status(200).json({
        success: true,
        message: `Accepted invitation to ${invitation.roomName}.`,
        roomCode: invitation.roomCode,
      });
    } else {
      invitation.status = 'declined';
      await invitation.save();

      emitToUser(invitation.sender._id, 'room:invitation_declined', {
        invitationId: invitation._id.toString(),
        roomCode: invitation.roomCode,
        userName: req.user.name,
      });

      return res.status(200).json({
        success: true,
        message: 'Invitation declined.',
      });
    }
  } catch (error) {
    next(error);
  }
};

export default {
  inviteFriendToRoom,
  getPendingInvitations,
  respondToInvitation,
};
