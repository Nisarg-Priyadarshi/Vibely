import mongoose from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import { getIO } from '../sockets/socket.js';

/**
 * Safely emit socket event to user room
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
 * Get message history between authenticated user and an accepted friend.
 * GET /api/chat/:friendId
 */
export const getConversation = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid friend ID.', status: 400 },
      });
    }

    if (friendId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot chat with yourself.', status: 400 },
      });
    }

    // Check if target user exists
    const friendUser = await User.findById(friendId).select('name email avatar');
    if (!friendUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.', status: 404 },
      });
    }

    // SERVER-SIDE SECURITY CHECK: Only accepted friends can view or participate in chat
    const isFriend = await Friendship.areFriends(currentUserId, friendId);
    if (!isFriend) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only message accepted friends.',
          status: 403,
        },
      });
    }

    // Fetch message history
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: friendId },
        { sender: friendId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200);

    // Mark unread messages sent by friend to current user as read
    await Message.updateMany(
      { sender: friendId, recipient: currentUserId, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      friend: {
        id: friendUser._id.toString(),
        name: friendUser.name,
        email: friendUser.email,
        avatar: friendUser.avatar || null,
      },
      messages: messages.map((m) => m.toSafeObject()),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a persistent private message to an accepted friend.
 * POST /api/chat/:friendId
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid friend ID.', status: 400 },
      });
    }

    if (friendId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot send messages to yourself.', status: 400 },
      });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message content is required.', status: 400 },
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message cannot exceed 2000 characters.', status: 400 },
      });
    }

    // SERVER-SIDE SECURITY CHECK: Must be accepted friends
    const isFriend = await Friendship.areFriends(currentUserId, friendId);
    if (!isFriend) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only message accepted friends.',
          status: 403,
        },
      });
    }

    // Persist message
    const message = await Message.create({
      sender: currentUserId,
      recipient: friendId,
      content: content.trim(),
    });

    const safeMessage = message.toSafeObject();

    // Broadcast real-time message to recipient and sender sockets
    emitToUser(friendId, 'chat:message', {
      ...safeMessage,
      senderUser: {
        id: req.user._id.toString(),
        name: req.user.name,
        avatar: req.user.avatar || null,
      },
    });

    emitToUser(currentUserId, 'chat:message', safeMessage);

    res.status(201).json({
      success: true,
      message: safeMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active conversations overview with friends (last message & unread counts)
 * GET /api/chat/conversations
 */
export const getConversationsOverview = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    // Get all accepted friends
    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    })
      .populate('requester', 'name email avatar')
      .populate('recipient', 'name email avatar');

    const friends = friendships.map((f) => {
      const isReq = f.requester._id.toString() === currentUserId.toString();
      return isReq ? f.recipient : f.requester;
    });

    const conversationList = await Promise.all(
      friends.map(async (friend) => {
        const friendId = friend._id;

        // Last message
        const lastMsg = await Message.findOne({
          $or: [
            { sender: currentUserId, recipient: friendId },
            { sender: friendId, recipient: currentUserId },
          ],
        }).sort({ createdAt: -1 });

        // Unread count
        const unreadCount = await Message.countDocuments({
          sender: friendId,
          recipient: currentUserId,
          read: false,
        });

        return {
          friend: {
            id: friendId.toString(),
            name: friend.name,
            email: friend.email,
            avatar: friend.avatar || null,
          },
          lastMessage: lastMsg ? lastMsg.toSafeObject() : null,
          unreadCount,
        };
      })
    );

    // Sort by latest message date or friend name
    conversationList.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json({
      success: true,
      conversations: conversationList,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getConversation,
  sendMessage,
  getConversationsOverview,
};
