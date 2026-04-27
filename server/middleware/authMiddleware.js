/**
 * Authentication Middleware
 * JWT-based authentication for protected routes
 */

const User = require('../models/User');
const logger = require('../utils/logger');
const { verifyToken, extractToken } = require('../utils/jwt');

/**
 * Require authentication middleware
 * Verifies JWT token and loads user
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.warn(`Unauthenticated access attempt to: ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    // Load user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Set user on request object
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Optional authentication middleware
 * Sets user info if available but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
    next();
  } catch (error) {
    // Just continue without user
    next();
  }
};

module.exports = {
  requireAuth,
  authenticate: requireAuth, // alias
  optionalAuth,
};
