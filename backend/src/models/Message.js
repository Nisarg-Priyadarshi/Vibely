import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message sender is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message recipient is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
      minlength: [1, 'Message must be at least 1 character long'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying chat history between two users sorted by creation time
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: 1 });

/**
 * Format message into safe client object
 */
messageSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    sender: this.sender?._id ? this.sender._id.toString() : this.sender.toString(),
    recipient: this.recipient?._id ? this.recipient._id.toString() : this.recipient.toString(),
    content: this.content,
    read: this.read,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Message = mongoose.model('Message', messageSchema);
export default Message;
