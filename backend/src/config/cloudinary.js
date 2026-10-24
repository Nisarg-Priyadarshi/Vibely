import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Checks whether all required Cloudinary environment variables are present and non-empty.
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    typeof cloudName === 'string' &&
    typeof apiKey === 'string' &&
    typeof apiSecret === 'string' &&
    cloudName.trim().length > 0 &&
    apiKey.trim().length > 0 &&
    apiSecret.trim().length > 0
  );
};

/**
 * Returns a list of missing Cloudinary credential variable names.
 * Does not expose values.
 * @returns {string[]}
 */
export const getMissingCloudinaryConfig = () => {
  const missing = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME?.trim()) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY?.trim()) missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET?.trim()) missing.push('CLOUDINARY_API_SECRET');
  return missing;
};

/**
 * Configures the Cloudinary SDK using environment variables.
 * @returns {boolean} True if configured successfully, false otherwise.
 */
export const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true,
  });

  return true;
};

// Auto-configure on initialization
configureCloudinary();

export { cloudinary };
export default cloudinary;
