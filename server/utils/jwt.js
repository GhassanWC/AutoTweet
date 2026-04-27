/**
 * JWT Utility
 * Handles token generation and verification
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'autotweet-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '30d'; // 30 days

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    twitterUserId: user.twitterUserId,
    twitterUsername: user.twitterUsername,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn('JWT verification failed:', error.message);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookie (fallback)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};




