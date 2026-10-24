import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Returns Google OAuth configuration loaded from environment variables.
 * @returns {{ clientId: string, clientSecret: string, callbackUrl: string }}
 */
export const getGoogleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || '',
  callbackUrl: process.env.GOOGLE_CALLBACK_URL?.trim() || '',
});

/**
 * Checks whether Google Client ID is configured.
 * @returns {boolean}
 */
export const isGoogleConfigured = () => {
  const { clientId } = getGoogleConfig();
  return Boolean(clientId && clientId.length > 0);
};

/**
 * Returns an OAuth2Client instance configured with environment variables.
 * @returns {OAuth2Client}
 */
export const getOAuth2Client = () => {
  const { clientId, clientSecret, callbackUrl } = getGoogleConfig();
  return new OAuth2Client(clientId, clientSecret, callbackUrl);
};

export default {
  getGoogleConfig,
  isGoogleConfigured,
  getOAuth2Client,
};
