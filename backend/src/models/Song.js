import mongoose from 'mongoose';

const urlRegex = /^https?:\/\/.+/i;

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      index: true,
    },
    artist: {
      type: String,
      required: [true, 'Artist name is required'],
      trim: true,
      minlength: [1, 'Artist name cannot be empty'],
      maxlength: [100, 'Artist name cannot exceed 100 characters'],
      index: true,
    },
    album: {
      type: String,
      trim: true,
      maxlength: [100, 'Album name cannot exceed 100 characters'],
      default: '',
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      trim: true,
      index: true,
    },
    coverUrl: {
      type: String,
      required: [true, 'Cover image URL is required'],
      trim: true,
      match: [urlRegex, 'Please provide a valid HTTP/HTTPS cover image URL'],
    },
    audioUrl: {
      type: String,
      required: [true, 'Audio URL is required'],
      trim: true,
      match: [urlRegex, 'Please provide a valid HTTP/HTTPS audio URL'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration in seconds is required'],
      min: [1, 'Duration must be at least 1 second'],
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => (Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()) : []),
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for robust full-text search across catalog
songSchema.index({
  title: 'text',
  artist: 'text',
  album: 'text',
  genre: 'text',
  tags: 'text',
});

// JSON serialization transform
songSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Song = mongoose.model('Song', songSchema);
export default Song;
