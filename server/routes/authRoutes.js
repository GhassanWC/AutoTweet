/**
 * Authentication Routes
 * Handles Twitter OAuth 2.0 authentication endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Initiate Twitter OAuth flow
router.get('/twitter', authController.initiateAuth);

// Handle Twitter OAuth callback
router.get('/twitter/callback', authController.handleCallback);

// Get current authenticated user
router.get('/me', requireAuth, authController.getMe);

// Logout
router.post('/logout', authController.logout);

// Check authentication status
router.get('/status', authController.getStatus);

module.exports = router;






