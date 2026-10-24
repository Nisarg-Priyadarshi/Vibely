import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find friendship between two specific users
friendshipSchema.index({ requester: 1, recipient: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });
friendshipSchema.index({ requester: 1, status: 1 });

/**
 * Check if two users have an accepted friendship.
 * @param {string|mongoose.Types.ObjectId} userA
 * @param {string|mongoose.Types.ObjectId} userB
 * @returns {Promise<boolean>}
 */
friendshipSchema.statics.areFriends = async function (userA, userB) {
  if (!userA || !userB || userA.toString() === userB.toString()) {
    return false;
  }

  const count = await this.countDocuments({
    status: 'accepted',
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });

  return count > 0;
};

/**
 * Find any existing relationship (pending, accepted, rejected) between two users.
 * @param {string|mongoose.Types.ObjectId} userA
 * @param {string|mongoose.Types.ObjectId} userB
 * @returns {Promise<Document|null>}
 */
friendshipSchema.statics.findRelationship = function (userA, userB) {
  return this.findOne({
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });
};

export const Friendship = mongoose.model('Friendship', friendshipSchema);
export default Friendship;
