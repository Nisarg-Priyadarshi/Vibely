import { cloudinary, isCloudinaryConfigured, configureCloudinary } from '../config/cloudinary.js';

/**
 * Uploads an image buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options (e.g. public_id, folder)
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadAvatarToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      const error = new Error(
        'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      );
      error.statusCode = 500;
      return reject(error);
    }

    // Ensure SDK is configured with latest env vars
    configureCloudinary();

    const uploadOptions = {
      folder: 'vibely/avatars',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve({
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
      });
    });

    stream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary by public ID.
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>}
 */
export const deleteAvatarFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured()) {
    const error = new Error(
      'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
    error.statusCode = 500;
    throw error;
  }

  if (!publicId || typeof publicId !== 'string') {
    return { result: 'ok' };
  }

  configureCloudinary();

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: 'image', invalidate: true },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
};

export default {
  uploadAvatarToCloudinary,
  deleteAvatarFromCloudinary,
};
