import User from '../models/User.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../services/authService.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import {
  uploadAvatarToCloudinary,
  deleteAvatarFromCloudinary,
} from '../services/cloudinaryService.js';
import { isGoogleConfigured, getOAuth2Client } from '../config/google.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates buffer magic bytes for JPEG, PNG, and WebP
 */
const isValidImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // WebP: RIFF (52 49 46 46) .... WEBP (57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;
  return false;
};

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
      if (avatar === null || avatar === '') {
        const oldPublicId = user.avatarPublicId || user.cloudinaryPublicId;
        if (oldPublicId && isCloudinaryConfigured()) {
          try {
            await deleteAvatarFromCloudinary(oldPublicId);
          } catch (e) {
            console.warn('Failed to delete old avatar on avatar clearing:', e.message);
          }
        }
        user.avatar = null;
        user.avatarPublicId = null;
        user.cloudinaryPublicId = null;
      } else if (typeof avatar === 'string' && avatar.trim()) {
        user.avatar = avatar.trim();
      }
    }

    // If an image file was uploaded with profile update
    if (req.file && req.file.buffer) {
      if (!isCloudinaryConfigured()) {
        return res.status(500).json({
          success: false,
          error: {
            message: 'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
            status: 500,
          },
        });
      }

      const mime = (req.file.mimetype || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mime) || !isValidImageBuffer(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            status: 400,
          },
        });
      }

      if (req.file.size > MAX_AVATAR_SIZE) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'File size exceeds the 5 MB limit. Please upload an image smaller than 5 MB.',
            status: 400,
          },
        });
      }

      const oldPublicId = user.avatarPublicId || user.cloudinaryPublicId;
      if (oldPublicId) {
        try {
          await deleteAvatarFromCloudinary(oldPublicId);
        } catch (e) {
          console.warn('Failed to delete previous avatar from Cloudinary:', e.message);
        }
      }

      const uploadResult = await uploadAvatarToCloudinary(req.file.buffer, {
        public_id: `avatar_${user._id}_${Date.now()}`,
      });

      user.avatar = uploadResult.secure_url;
      user.avatarPublicId = uploadResult.public_id;
      user.cloudinaryPublicId = uploadResult.public_id;
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

/**
 * Upload or replace authenticated user's avatar.
 * POST /api/auth/profile/avatar or POST /api/auth/avatar
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    // 1. Verify Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
          status: 500,
        },
      });
    }

    // 2. Validate file presence
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide an image file to upload.',
          status: 400,
        },
      });
    }

    // 3. Validate MIME type
    const mime = (req.file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          status: 400,
        },
      });
    }

    // 4. Validate file size (max 5 MB)
    if (req.file.size > MAX_AVATAR_SIZE) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'File size exceeds the 5 MB limit. Please upload an image smaller than 5 MB.',
          status: 400,
        },
      });
    }

    // 5. Validate magic bytes in buffer
    if (!isValidImageBuffer(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file content. Uploaded file is not a valid JPEG, PNG, or WebP image.',
          status: 400,
        },
      });
    }

    // 6. Find user
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

    // 7. If user already has an existing avatar in Cloudinary, delete it (replacement)
    const existingPublicId = user.avatarPublicId || user.cloudinaryPublicId;
    if (existingPublicId) {
      try {
        await deleteAvatarFromCloudinary(existingPublicId);
      } catch (delError) {
        console.warn('Failed to delete previous avatar from Cloudinary:', delError.message);
      }
    }

    // 8. Upload new avatar buffer to Cloudinary
    const uploadResult = await uploadAvatarToCloudinary(req.file.buffer, {
      public_id: `avatar_${user._id}_${Date.now()}`,
    });

    // 9. Update MongoDB User document
    user.avatar = uploadResult.secure_url;
    user.avatarPublicId = uploadResult.public_id;
    user.cloudinaryPublicId = uploadResult.public_id;
    await user.save();

    // 10. Return safe user profile
    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete authenticated user's avatar.
 * DELETE /api/auth/profile/avatar or DELETE /api/auth/avatar
 */
export const deleteAvatar = async (req, res, next) => {
  try {
    // 1. Verify Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
          status: 500,
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

    // 2. Delete asset from Cloudinary if stored
    const existingPublicId = user.avatarPublicId || user.cloudinaryPublicId;
    if (existingPublicId) {
      try {
        await deleteAvatarFromCloudinary(existingPublicId);
      } catch (delError) {
        console.warn('Failed to delete avatar from Cloudinary:', delError.message);
      }
    }

    // 3. Reset avatar fields in MongoDB
    user.avatar = null;
    user.avatarPublicId = null;
    user.cloudinaryPublicId = null;
    await user.save();

    // 4. Return safe user profile
    res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify a Google credential (ID token) or authorization code and issue a session.
 * POST /api/auth/google
 */
export const googleAuth = async (req, res, next) => {
  try {
    const credential = req.body?.credential || req.body?.idToken || req.body?.token;
    const code = req.body?.code;

    if (!credential && !code) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Google credential or authorization code is required.',
          status: 400,
        },
      });
    }

    if (!isGoogleConfigured()) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Google authentication is not configured on this server.',
          status: 500,
        },
      });
    }

    const client = getOAuth2Client();
    let googleId;
    let email;
    let name;
    let picture;

    if (code) {
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      if (tokens.id_token) {
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID?.trim(),
        });
        const payload = ticket.getPayload();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      } else {
        const userInfoRes = await client.request({
          url: 'https://www.googleapis.com/oauth2/v3/userinfo',
        });
        googleId = userInfoRes.data.sub;
        email = userInfoRes.data.email;
        name = userInfoRes.data.name;
        picture = userInfoRes.data.picture;
      }
    } else {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID?.trim(),
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Google account must have an email address.',
          status: 400,
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find existing user by googleId or email, or create a new one
    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }],
    });

    if (!user) {
      user = await User.create({
        name: name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        avatar: picture || null,
      });
    } else if (!user.googleId) {
      // Link Google ID to existing account
      user.googleId = googleId;
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      await user.save();
    }

    const token = signToken({ id: user._id.toString(), email: user.email });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Google login successful.',
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    if (error.message && error.message.includes('Token used too late')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Google sign-in session expired. Please try again.',
          status: 401,
        },
      });
    }
    if (
      error.message &&
      (error.message.includes('Invalid token') ||
        error.message.includes('audience') ||
        error.message.includes('Wrong number of segments') ||
        error.message.includes('jwt') ||
        error.message.includes('invalid_grant'))
    ) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid Google credential. Please try again.',
          status: 401,
        },
      });
    }
    next(error);
  }
};

/**
 * Initiate server-side Google OAuth 2.0 redirect flow.
 * GET /api/auth/google
 */
export const googleAuthRedirect = (req, res, next) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Google authentication is not configured on this server.',
          status: 500,
        },
      });
    }

    const client = getOAuth2Client();
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'profile', 'email'],
      prompt: 'select_account',
    });

    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Google OAuth 2.0 redirect callback.
 * GET /api/auth/google/callback
 */
export const googleAuthCallback = async (req, res, next) => {
  try {
    const { code, error } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (error) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${clientUrl}/login?error=missing_auth_code`);
    }

    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    let googleId;
    let email;
    let name;
    let picture;

    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID?.trim(),
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      const userInfoRes = await client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });
      googleId = userInfoRes.data.sub;
      email = userInfoRes.data.email;
      name = userInfoRes.data.name;
      picture = userInfoRes.data.picture;
    }

    if (!email) {
      return res.redirect(`${clientUrl}/login?error=no_email_provided`);
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }],
    });

    if (!user) {
      user = await User.create({
        name: name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        avatar: picture || null,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    const token = signToken({ id: user._id.toString(), email: user.email });
    setAuthCookie(res, token);

    return res.redirect(`${clientUrl}/`);
  } catch (err) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
};

export default {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  googleAuth,
  googleAuthRedirect,
  googleAuthCallback,
};

