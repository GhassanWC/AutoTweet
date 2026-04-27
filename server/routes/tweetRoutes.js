/**
 * Tweet Routes
 * Handles scheduled tweet management endpoints
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const tweetController = require('../controllers/tweetController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Validation middleware
const tweetValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Tweet content is required')
    .isLength({ max: 280 })
    .withMessage('Tweet content must be 280 characters or less'),
  body('scheduledTime')
    .notEmpty()
    .withMessage('Scheduled time is required')
    .isISO8601()
    .withMessage('Scheduled time must be a valid date'),
  body('mediaUrls')
    .optional()
    .isArray()
    .withMessage('Media URLs must be an array'),
  body('replyToTweetId')
    .optional()
    .isString()
    .withMessage('Reply to tweet ID must be a string'),
];

const threadValidation = [
  body('tweets')
    .isArray({ min: 2 })
    .withMessage('At least 2 tweets are required for a thread'),
  body('tweets.*.content')
    .trim()
    .notEmpty()
    .withMessage('Tweet content is required')
    .isLength({ max: 280 })
    .withMessage('Tweet content must be 280 characters or less'),
  body('tweets.*.scheduledTime')
    .notEmpty()
    .withMessage('Scheduled time is required')
    .isISO8601()
    .withMessage('Scheduled time must be a valid date'),
];

const idValidation = [
  param('id')
    .notEmpty()
    .withMessage('Tweet ID is required'),
];

// Get tweet statistics
router.get('/stats', tweetController.getStats);

// Get pending tweets
router.get('/pending', tweetController.getPendingTweets);

// Schedule a new tweet
router.post('/', tweetValidation, tweetController.scheduleTweet);

// Schedule a thread
router.post('/thread', threadValidation, tweetController.scheduleThread);

// Get all tweets
router.get('/', tweetController.getTweets);

// Get a single tweet
router.get('/:id', idValidation, tweetController.getTweet);

// Update a tweet
router.put('/:id', idValidation, tweetController.updateTweet);

// Cancel a tweet
router.patch('/:id/cancel', idValidation, tweetController.cancelTweet);

// Send a tweet immediately
router.post('/:id/send', idValidation, tweetController.sendTweetNow);

// Delete a tweet
router.delete('/:id', idValidation, tweetController.deleteTweet);

module.exports = router;






