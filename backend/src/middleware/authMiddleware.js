import { verifyToken, COOKIE_NAME, clearAuthCookie } from '../services/authService.js';
import User from '../models/User.js';

/**
 * Authentication middleware.
 * Verifies JWT from HTTP-only cookie or Bearer Authorization header,
 * fetches user data, and attaches req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Check Authorization Bearer header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. No token provided.',
          status: 401,
        },
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      // Clear invalid or expired cookie so client does not continue sending bad credentials
      clearAuthCookie(res);
      const message =
        err.name === 'TokenExpiredError'
          ? 'Authentication token has expired. Please log in again.'
          : 'Invalid authentication token.';

      return res.status(401).json({
        success: false,
        error: {
          message,
          status: 401,
        },
      });
    }

    // Find user in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        error: {
          message: 'User belonging to this token no longer exists.',
          status: 401,
        },
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = authenticate;
export default authenticate;

