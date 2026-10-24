import User from '../models/User.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../services/authService.js';
import { getGoogleConfig, getOAuth2Client, isGoogleConfigured } from '../config/google.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { deleteAvatarFromCloudinary, uploadAvatarToCloudinary } from '../services/cloudinaryService.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

const googleError = (res, status, message) => res.status(status).json({
  success: false,
  error: { message, status },
});

const findOrCreateGoogleUser = async (payload) => {
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw Object.assign(new Error('Google account must have a verified email address.'), { status: 401 });
  }
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });
  if (!user) {
    user = new User({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email.toLowerCase(),
      googleId: payload.sub,
      avatar: payload.picture || null,
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
  }
  await user.save();
  return user;
};

export const googleAuth = async (req, res) => {
  const { credential, idToken, code } = req.body || {};
  if (!credential && !idToken && !code) {
    return googleError(res, 400, 'A credential or authorization code is required.');
  }
  if (!isGoogleConfigured()) return googleError(res, 503, 'Google Sign-In is not configured.');

  try {
    const client = getOAuth2Client();
    const { clientId } = getGoogleConfig();
    let ticket;
    if (credential || idToken) {
      ticket = await client.verifyIdToken({ idToken: credential || idToken, audience: clientId });
    } else {
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) return googleError(res, 401, 'Invalid Google credential.');
      ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    }

    const user = await findOrCreateGoogleUser(ticket.getPayload());
    const token = signToken({ id: user._id.toString(), email: user.email });
    setAuthCookie(res, token);
    return res.status(200).json({ success: true, message: 'Google sign-in successful.', user: user.toSafeObject(), token });
  } catch (error) {
    return googleError(res, error.status || 401, error.status ? error.message : 'Invalid Google credential.');
  }
};

export const googleAuthRedirect = (req, res) => {
  if (!isGoogleConfigured()) return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_not_configured`);
  const { callbackUrl } = getGoogleConfig();
  const url = getOAuth2Client().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: callbackUrl || undefined,
    prompt: 'select_account',
  });
  return res.redirect(url);
};

export const googleAuthCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (req.query.error) return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(req.query.error)}`);
  if (!req.query.code) return res.redirect(`${clientUrl}/login?error=missing_auth_code`);
  if (!isGoogleConfigured()) return res.redirect(`${clientUrl}/login?error=google_not_configured`);
  try {
    const { tokens } = await getOAuth2Client().getToken(req.query.code);
    const { clientId } = getGoogleConfig();
    const ticket = await getOAuth2Client().verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const user = await findOrCreateGoogleUser(ticket.getPayload());
    setAuthCookie(res, signToken({ id: user._id.toString(), email: user.email }));
    return res.redirect(`${clientUrl}/?auth=success`);
  } catch {
    return res.redirect(`${clientUrl}/login?error=invalid_auth_code`);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file?.buffer) return googleError(res, 400, 'An avatar file is required.');
    if (!isCloudinaryConfigured()) {
      return googleError(res, 500, 'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    }
    const mime = (req.file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime) || !isValidImageBuffer(req.file.buffer)) {
      return googleError(res, 400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }
    if (req.file.size > MAX_AVATAR_SIZE) return googleError(res, 400, 'File size exceeds the 5 MB limit.');

    const user = await User.findById(req.user._id);
    if (!user) return googleError(res, 404, 'User not found.');
    const result = await uploadAvatarToCloudinary(req.file.buffer, { public_id: `avatar_${user._id}_${Date.now()}` });
    const oldPublicId = user.avatarPublicId || user.cloudinaryPublicId;
    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
    user.cloudinaryPublicId = result.public_id;
    await user.save();
    if (oldPublicId) {
      try { await deleteAvatarFromCloudinary(oldPublicId); } catch (error) { console.warn('Failed to delete replaced avatar:', error.message); }
    }
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    return next(error);
  }
};

export const deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return googleError(res, 404, 'User not found.');
    const publicId = user.avatarPublicId || user.cloudinaryPublicId;
    if (publicId && isCloudinaryConfigured()) {
      try { await deleteAvatarFromCloudinary(publicId); } catch (error) { console.warn('Failed to delete avatar:', error.message); }
    }
    user.avatar = null;
    user.avatarPublicId = null;
    user.cloudinaryPublicId = null;
    await user.save();
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    return next(error);
  }
};

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

export default {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  googleAuth,
  googleAuthRedirect,
  googleAuthCallback,
  uploadAvatar,
  deleteAvatar,
};


