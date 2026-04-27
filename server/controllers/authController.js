/**
 * Authentication Controller
 * Handles Twitter OAuth 2.0 authentication flow with JWT
 */

const { generateAuthLink, getAccessToken, createUserClient } = require('../config/twitter');
const User = require('../models/User');
const logger = require('../utils/logger');
const { generateState } = require('../utils/helpers');
const { generateToken, verifyToken, extractToken } = require('../utils/jwt');

// In-memory store for OAuth state (short-lived, cleared after use)
const oauthStore = new Map();

// Clean up old OAuth entries after 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStore.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      oauthStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Initiate Twitter OAuth flow
 * GET /api/auth/twitter
 */
const initiateAuth = (req, res) => {
  try {
    // Generate state for CSRF protection
    const state = generateState();
    
    // Generate OAuth URL
    const { url, codeVerifier } = generateAuthLink(state);
    
    // Store state and code verifier in memory
    oauthStore.set(state, {
      codeVerifier,
      createdAt: Date.now(),
    });
    
    logger.info('Initiating Twitter OAuth flow');
    
    res.json({
      success: true,
      authUrl: url,
    });
  } catch (error) {
    logger.error('Error initiating auth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authentication',
    });
  }
};

/**
 * Handle Twitter OAuth callback
 * GET /api/auth/twitter/callback
 */
const handleCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:3000';
  
  try {
    const { code, state } = req.query;
    
    // Verify state and get code verifier
    const oauthData = oauthStore.get(state);
    
    if (!oauthData) {
      logger.warn('OAuth state not found or expired');
      return res.redirect(`${clientUrl}/auth/error?message=Session expired. Please try again.`);
    }
    
    const { codeVerifier } = oauthData;
    
    // Remove used state immediately
    oauthStore.delete(state);
    
    // Exchange code for tokens
    const tokens = await getAccessToken(code, codeVerifier);
    
    // Get user info from Twitter
    const client = createUserClient(tokens.accessToken);
    const { data: twitterUser } = await client.v2.me({
      'user.fields': ['profile_image_url', 'description'],
    });
    
    // Check if user exists
    let user = await User.findByTwitterId(twitterUser.id);
    
    if (user) {
      // Update existing user's tokens
      user = await User.updateTokens(user.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      });
      logger.info(`User logged in: ${user.twitterUsername}`);
    } else {
      // Create new user
      user = await User.create({
        twitterUserId: twitterUser.id,
        twitterUsername: twitterUser.username,
        displayName: twitterUser.name,
        profileImageUrl: twitterUser.profile_image_url,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
      });
      logger.info(`New user created: ${user.twitterUsername}`);
    }
    
    // Generate JWT token
    const jwtToken = generateToken(user);
    
    // Set cookie for 30 days persistence
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    // Redirect to client with token in URL (for localStorage fallback)
    res.redirect(`${clientUrl}/auth/success?token=${jwtToken}`);
  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.redirect(`${clientUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Don't send sensitive data
    const safeUser = {
      id: user.id,
      twitterUserId: user.twitterUserId,
      twitterUsername: user.twitterUsername,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      settings: user.settings,
      stats: user.stats,
      createdAt: user.createdAt,
    };
    
    res.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    logger.error('Error getting current user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  // Clear the auth cookie
  res.clearCookie('token');
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Check authentication status
 * GET /api/auth/status
 */
const getStatus = (req, res) => {
  const token = extractToken(req);
  const decoded = token ? verifyToken(token) : null;
  
  res.json({
    success: true,
    authenticated: !!decoded,
  });
};

module.exports = {
  initiateAuth,
  handleCallback,
  getMe,
  logout,
  getStatus,
};
