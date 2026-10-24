import mongoose from 'mongoose';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import { getIO } from '../sockets/socket.js';

/**
 * Helper to emit socket events safely if Socket.IO is initialized.
 */
const emitToUser = (userId, event, payload) => {
  try {
    const io = getIO();
    io.to(`user:${userId.toString()}`).emit(event, payload);
  } catch (err) {
    // Socket.IO may not be active in some test environments
  }
};

/**
 * Format user for friend responses
 */
const formatFriendUser = (userDoc) => {
  if (!userDoc) return null;
  return {
    id: userDoc._id ? userDoc._id.toString() : userDoc.id,
    name: userDoc.name,
    email: userDoc.email,
    avatar: userDoc.avatar || null,
  };
};

/**
 * Search users by name or email and include friendship status.
 * GET /api/friends/search?q=...
 */
export const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    if (!query) {
      return res.status(200).json({ success: true, users: [] });
    }

    const currentUserId = req.user._id;

    // Sanitize search query to prevent regex injection
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const matchedUsers = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ name: regex }, { email: regex }],
    })
      .select('name email avatar')
      .limit(20);

    if (matchedUsers.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    const matchedIds = matchedUsers.map((u) => u._id);

    // Find all relationships between current user and matched users
    const relationships = await Friendship.find({
      $or: [
        { requester: currentUserId, recipient: { $in: matchedIds } },
        { requester: { $in: matchedIds }, recipient: currentUserId },
      ],
    });

    const relationshipMap = new Map();
    relationships.forEach((rel) => {
      const otherId =
        rel.requester.toString() === currentUserId.toString()
          ? rel.recipient.toString()
          : rel.requester.toString();

      let status = 'none';
      if (rel.status === 'accepted') {
        status = 'friends';
      } else if (rel.status === 'pending') {
        status =
          rel.requester.toString() === currentUserId.toString()
            ? 'pending_sent'
            : 'pending_received';
      }

      relationshipMap.set(otherId, {
        status,
        friendshipId: rel._id.toString(),
      });
    });

    const results = matchedUsers.map((u) => {
      const relInfo = relationshipMap.get(u._id.toString()) || {
        status: 'none',
        friendshipId: null,
      };

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatar: u.avatar || null,
        relationshipStatus: relInfo.status,
        friendshipId: relInfo.friendshipId,
      };
    });

    res.status(200).json({
      success: true,
      users: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all accepted friends of current user.
 * GET /api/friends
 */
export const getFriends = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    })
      .populate('requester', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .sort({ updatedAt: -1 });

    const friends = friendships.map((f) => {
      const isRequester = f.requester._id.toString() === currentUserId.toString();
      const friendUser = isRequester ? f.recipient : f.requester;
      return {
        ...formatFriendUser(friendUser),
        friendshipId: f._id.toString(),
        since: f.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      friends,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending friend requests (received and sent).
 * GET /api/friends/requests
 */
export const getFriendRequests = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const [receivedDocs, sentDocs] = await Promise.all([
      Friendship.find({
        recipient: currentUserId,
        status: 'pending',
      })
        .populate('requester', 'name email avatar')
        .sort({ createdAt: -1 }),

      Friendship.find({
        requester: currentUserId,
        status: 'pending',
      })
        .populate('recipient', 'name email avatar')
        .sort({ createdAt: -1 }),
    ]);

    const received = receivedDocs.map((r) => ({
      id: r._id.toString(),
      user: formatFriendUser(r.requester),
      createdAt: r.createdAt,
    }));

    const sent = sentDocs.map((s) => ({
      id: s._id.toString(),
      user: formatFriendUser(s.recipient),
      createdAt: s.createdAt,
    }));

    res.status(200).json({
      success: true,
      received,
      sent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a friend request.
 * POST /api/friends/requests
 */
export const sendFriendRequest = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'A valid recipient ID is required.', status: 400 },
      });
    }

    if (recipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot send a friend request to yourself.', status: 400 },
      });
    }

    const recipientUser = await User.findById(recipientId).select('name email avatar');
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'Recipient user not found.', status: 404 },
      });
    }

    // Check existing relationship
    const existing = await Friendship.findRelationship(currentUserId, recipientId);

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({
          success: false,
          error: { message: 'You are already friends with this listener.', status: 400 },
        });
      }

      if (existing.status === 'pending') {
        if (existing.requester.toString() === currentUserId.toString()) {
          return res.status(400).json({
            success: false,
            error: { message: 'Friend request already sent and pending.', status: 400 },
          });
        }

        // Mutual request: immediately accept!
        existing.status = 'accepted';
        await existing.save();

        emitToUser(existing.requester, 'friend:request_accepted', {
          friendshipId: existing._id.toString(),
          user: formatFriendUser(req.user),
        });

        emitToUser(currentUserId, 'friend:request_accepted', {
          friendshipId: existing._id.toString(),
          user: formatFriendUser(recipientUser),
        });

        return res.status(200).json({
          success: true,
          message: 'Mutual friend request detected and automatically accepted!',
          status: 'accepted',
          friendshipId: existing._id.toString(),
          friend: formatFriendUser(recipientUser),
        });
      }

      // If previously rejected, re-open as pending
      existing.requester = currentUserId;
      existing.recipient = recipientId;
      existing.status = 'pending';
      await existing.save();

      emitToUser(recipientId, 'friend:request_received', {
        id: existing._id.toString(),
        user: formatFriendUser(req.user),
        createdAt: existing.updatedAt,
      });

      return res.status(201).json({
        success: true,
        message: 'Friend request sent successfully.',
        status: 'pending',
        friendshipId: existing._id.toString(),
      });
    }

    // Create new friend request
    const friendship = await Friendship.create({
      requester: currentUserId,
      recipient: recipientId,
      status: 'pending',
    });

    emitToUser(recipientId, 'friend:request_received', {
      id: friendship._id.toString(),
      user: formatFriendUser(req.user),
      createdAt: friendship.createdAt,
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully.',
      status: 'pending',
      friendshipId: friendship._id.toString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a friend request.
 * POST /api/friends/requests/:id/accept
 */
export const acceptFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid friend request ID.', status: 400 },
      });
    }

    const friendship = await Friendship.findById(id).populate('requester', 'name email avatar');
    if (!friendship || friendship.status !== 'pending') {
      return res.status(404).json({
        success: false,
        error: { message: 'Friend request not found or already handled.', status: 404 },
      });
    }

    // Security check: only recipient can accept
    if (friendship.recipient.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to accept this friend request.', status: 403 },
      });
    }

    friendship.status = 'accepted';
    await friendship.save();

    const friendInfo = formatFriendUser(friendship.requester);

    // Notify requester
    emitToUser(friendship.requester._id, 'friend:request_accepted', {
      friendshipId: friendship._id.toString(),
      user: formatFriendUser(req.user),
    });

    // Notify recipient (self)
    emitToUser(currentUserId, 'friend:request_accepted', {
      friendshipId: friendship._id.toString(),
      user: friendInfo,
    });

    res.status(200).json({
      success: true,
      message: 'Friend request accepted successfully.',
      friend: friendInfo,
      friendshipId: friendship._id.toString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a friend request.
 * POST /api/friends/requests/:id/reject
 */
export const rejectFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid friend request ID.', status: 400 },
      });
    }

    const friendship = await Friendship.findById(id);
    if (!friendship || friendship.status !== 'pending') {
      return res.status(404).json({
        success: false,
        error: { message: 'Friend request not found or already handled.', status: 404 },
      });
    }

    // Security check: only recipient can reject
    if (friendship.recipient.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to reject this friend request.', status: 403 },
      });
    }

    const requesterId = friendship.requester;
    await Friendship.findByIdAndDelete(id);

    emitToUser(requesterId, 'friend:request_rejected', {
      friendshipId: id,
      user: formatFriendUser(req.user),
    });

    res.status(200).json({
      success: true,
      message: 'Friend request declined.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an outgoing friend request.
 * DELETE /api/friends/requests/:id
 */
export const cancelFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid friend request ID.', status: 400 },
      });
    }

    const friendship = await Friendship.findById(id);
    if (!friendship || friendship.status !== 'pending') {
      return res.status(404).json({
        success: false,
        error: { message: 'Pending request not found.', status: 404 },
      });
    }

    // Security check: only requester can cancel
    if (friendship.requester.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to cancel this friend request.', status: 403 },
      });
    }

    const recipientId = friendship.recipient;
    await Friendship.findByIdAndDelete(id);

    emitToUser(recipientId, 'friend:request_cancelled', {
      friendshipId: id,
    });

    res.status(200).json({
      success: true,
      message: 'Friend request cancelled successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unfriend / remove friendship.
 * DELETE /api/friends/:friendId
 */
export const removeFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid friend ID.', status: 400 },
      });
    }

    const friendship = await Friendship.findOneAndDelete({
      status: 'accepted',
      $or: [
        { requester: currentUserId, recipient: friendId },
        { requester: friendId, recipient: currentUserId },
      ],
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        error: { message: 'Friendship not found.', status: 404 },
      });
    }

    emitToUser(friendId, 'friend:removed', {
      friendId: currentUserId.toString(),
    });

    emitToUser(currentUserId, 'friend:removed', {
      friendId: friendId.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
};
