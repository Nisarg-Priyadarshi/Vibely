import User from '../models/User.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../services/authService.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user account.
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name is required and must be at least 2 characters long.',
          status: 400,
        },
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'A valid email address is required.',
          status: 400,
        },
      });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password is required and must be at least 6 characters long.',
          status: 400,
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email address already exists.',
          status: 409,
        },
      });
    }

    // Create user (password is hashed in pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      avatar: avatar && typeof avatar === 'string' ? avatar.trim() : null,
    });

    // Generate JWT and set secure HTTP-only cookie
    const token = signToken({ id: user._id.toString(), email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate existing user and issue session token.
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide both email and password.',
          status: 400,
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user including password field for verification
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          status: 401,
        },
      });
    }

    // Compare supplied password with bcrypt hash
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          status: 401,
        },
      });
    }

    // Generate JWT and set secure HTTP-only cookie
    const token = signToken({ id: user._id.toString(), email: user.email });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invalidate client session by clearing HTTP-only cookie.
 * POST /api/auth/logout
 */
export const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logout successful.',
  });
};

/**
 * Get current authenticated user profile.
 * GET /api/auth/me
 */
export const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
  });
};

/**
 * Update authenticated user display name.
 * PATCH /api/auth/me or PATCH /api/auth/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Display name is required and must be at least 2 characters long.',
          status: 400,
        },
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Display name cannot exceed 50 characters.',
          status: 400,
        },
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found.',
          status: 404,
        },
      });
    }

    user.name = name.trim();
    if (avatar !== undefined) {
      user.avatar = typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  logout,
  getMe,
  updateProfile,
};

