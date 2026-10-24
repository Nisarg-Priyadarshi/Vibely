import mongoose from 'mongoose';

const roomInvitationSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: [true, 'Room code is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    roomName: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

roomInvitationSchema.index({ recipient: 1, status: 1 });
roomInvitationSchema.index({ roomCode: 1, recipient: 1, status: 1 });

export const RoomInvitation = mongoose.model('RoomInvitation', roomInvitationSchema);
export default RoomInvitation;
