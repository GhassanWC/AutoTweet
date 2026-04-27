/**
 * User Routes
 * Handles user profile and settings endpoints
 */

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Settings validation
const settingsValidation = [
  body('retweet')
    .optional()
    .isBoolean()
    .withMessage('Retweet must be a boolean'),
  body('like')
    .optional()
    .isBoolean()
    .withMessage('Like must be a boolean'),
  body('reply')
    .optional()
    .isBoolean()
    .withMessage('Reply must be a boolean'),
  body('maxDailyTweets')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max daily tweets must be between 1 and 1000'),
  body('maxDailyRetweets')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max daily retweets must be between 1 and 1000'),
  body('maxDailyLikes')
    .optional()
    .isInt({ min: 1, max: 2000 })
    .withMessage('Max daily likes must be between 1 and 2000'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
];

// Engagement query validation
const engagementQueryValidation = [
  query('action')
    .optional()
    .isIn(['like', 'retweet', 'reply'])
    .withMessage('Action must be like, retweet, or reply'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Get user profile
router.get('/profile', userController.getProfile);

// Update user settings
router.put('/settings', settingsValidation, userController.updateSettings);

// Get dashboard data
router.get('/dashboard', userController.getDashboard);

// Get engagement history
router.get('/engagement', engagementQueryValidation, userController.getEngagementHistory);

// Get API cost statistics (for monitoring)
router.get('/api-stats', userController.getApiStats);

// Delete user account
router.delete('/', userController.deleteAccount);

module.exports = router;






