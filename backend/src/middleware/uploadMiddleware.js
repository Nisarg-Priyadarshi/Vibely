import multer from 'multer';

// Allowed MIME types: JPEG, PNG, and WebP only
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

// Maximum file size: 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

// In-memory buffer storage for direct upload to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype ? file.mimetype.toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    const error = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

// Support avatar, image, or file field names
const multerUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

/**
 * Express middleware to handle avatar file upload with validation.
 */
export const handleAvatarUpload = (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'File size exceeds the 5 MB limit. Please upload an image smaller than 5 MB.',
            status: 400,
          },
        });
      }

      if (err.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({
          success: false,
          error: {
            message: err.message,
            status: 400,
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          message: err.message || 'File upload error.',
          status: 400,
        },
      });
    }

    // Normalize uploaded file to req.file
    if (req.files) {
      req.file =
        req.files.avatar?.[0] ||
        req.files.image?.[0] ||
        req.files.file?.[0] ||
        null;
    }

    next();
  });
};

export default handleAvatarUpload;
