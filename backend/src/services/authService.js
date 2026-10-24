import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'token';
export const DEFAULT_EXPIRATION = '7d';
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Sign a JSON Web Token with user payload.
 * @param {Object} payload 
 * @param {Object} [options] Optional JWT sign options (e.g. expiresIn)
 * @returns {string} Signed JWT
 */
export const signToken = (payload, options = {}) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRATION,
    ...options,
  });
};

/**
 * Verify a JSON Web Token.
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.verify(token, secret);
};

/**
 * Configure standard secure HTTP-only cookie options.
 */
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
};

/**
 * Set authentication cookie on response object.
 * @param {import('express').Response} res 
 * @param {string} token 
 */
export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

/**
 * Clear authentication cookie from client session.
 * @param {import('express').Response} res 
 */
export const clearAuthCookie = (res) => {
  const options = getCookieOptions();
  // Remove maxAge when clearing cookie
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
};

export default {
  signToken,
  verifyToken,
  getCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
};
