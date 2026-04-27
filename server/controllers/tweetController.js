/**
 * Tweet Controller
 * Handles scheduled tweet management operations
 */

const Tweet = require('../models/Tweet');
const User = require('../models/User');
const TwitterService = require('../services/twitterService');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Get tweet statistics for the current user
 * GET /api/tweets/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await Tweet.getStats(req.user.id);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting tweet stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tweet statistics',
    });
  }
};

/**
 * Get pending tweets for the current user
 * GET /api/tweets/pending
 */
const getPendingTweets = async (req, res) => {
  try {
    const tweets = await Tweet.findPendingByUserId(req.user.id);
    
    res.json({
      success: true,
      tweets,
    });
  } catch (error) {
    logger.error('Error getting pending tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending tweets',
    });
  }
};

/**
 * Schedule a new tweet
 * POST /api/tweets
 */
const scheduleTweet = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { content, scheduledTime, media, replyToTweetId } = req.body;

    // Validate scheduled time is in the future (with 2-minute leeway for clock skew)
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    if (scheduled < new Date(now.getTime() - 120000)) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future',
      });
    }

    const tweet = await Tweet.create({
      userId: req.user.id,
      content,
      scheduledTime,
      media: media || null,
      replyToTweetId,
    });

    logger.info(`Tweet scheduled: ${tweet.id} for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      tweet,
    });
  } catch (error) {
    logger.error('Error scheduling tweet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to schedule tweet',
    });
  }
};

/**
 * Schedule a thread
 * POST /api/tweets/thread
 */
const scheduleThread = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { tweets } = req.body;

    // Validate all scheduled times are in the future (with 2-minute leeway for clock skew)
    const threadNow = new Date();
    for (const tweet of tweets) {
      if (new Date(tweet.scheduledTime) < new Date(threadNow.getTime() - 120000)) {
        return res.status(400).json({
          success: false,
          error: 'All scheduled times must be in the future',
        });
      }
    }

    const createdTweets = await Tweet.createThread(req.user.id, tweets);

    logger.info(`Thread scheduled: ${createdTweets.length} tweets for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      tweets: createdTweets,
    });
  } catch (error) {
    logger.error('Error scheduling thread:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to schedule thread',
    });
  }
};

/**
 * Get all tweets for the current user
 * GET /api/tweets
 */
const getTweets = async (req, res) => {
  try {
    const { status, limit } = req.query;
    const options = {};

    if (status) {
      options.status = status;
    }
    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    const tweets = await Tweet.findByUserId(req.user.id, options);

    res.json({
      success: true,
      tweets,
    });
  } catch (error) {
    logger.error('Error getting tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tweets',
    });
  }
};

/**
 * Get a single tweet
 * GET /api/tweets/:id
 */
const getTweet = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({
        success: false,
        error: 'Tweet not found',
      });
    }

    // Verify ownership
    if (tweet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this tweet',
      });
    }

    res.json({
      success: true,
      tweet,
    });
  } catch (error) {
    logger.error('Error getting tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tweet',
    });
  }
};

/**
 * Update a tweet
 * PUT /api/tweets/:id
 */
const updateTweet = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({
        success: false,
        error: 'Tweet not found',
      });
    }

    // Verify ownership
    if (tweet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this tweet',
      });
    }

    // Can only update pending tweets
    if (tweet.status !== Tweet.STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        error: 'Can only update pending tweets',
      });
    }

    const { content, scheduledTime, media } = req.body;
    const updateData = {};

    if (content) updateData.content = content;
    if (scheduledTime) {
      if (new Date(scheduledTime) <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future',
        });
      }
      updateData.scheduledTime = new Date(scheduledTime);
    }
    // Allow explicit null to remove media, or a new media object
    if (media !== undefined) updateData.media = media;

    const updatedTweet = await Tweet.update(req.params.id, updateData);

    logger.info(`Tweet updated: ${req.params.id}`);

    res.json({
      success: true,
      tweet: updatedTweet,
    });
  } catch (error) {
    logger.error('Error updating tweet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update tweet',
    });
  }
};

/**
 * Cancel a scheduled tweet
 * PATCH /api/tweets/:id/cancel
 */
const cancelTweet = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({
        success: false,
        error: 'Tweet not found',
      });
    }

    // Verify ownership
    if (tweet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this tweet',
      });
    }

    // Can only cancel pending tweets
    if (tweet.status !== Tweet.STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        error: 'Can only cancel pending tweets',
      });
    }

    const cancelledTweet = await Tweet.cancel(req.params.id);

    logger.info(`Tweet cancelled: ${req.params.id}`);

    res.json({
      success: true,
      tweet: cancelledTweet,
    });
  } catch (error) {
    logger.error('Error cancelling tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel tweet',
    });
  }
};

/**
 * Send a tweet immediately
 * POST /api/tweets/:id/send
 */
const sendTweetNow = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({
        success: false,
        error: 'Tweet not found',
      });
    }

    // Verify ownership
    if (tweet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to send this tweet',
      });
    }

    // Can only send pending tweets
    if (tweet.status !== Tweet.STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        error: 'Can only send pending tweets',
      });
    }

    // Get user and create Twitter service
    const user = await User.findById(req.user.id);
    const twitterService = await TwitterService.forUser(user);

    // Check if this is part of a thread
    let replyToTweetId = tweet.replyToTweetId;
    if (!replyToTweetId && tweet.threadPreviousId) {
      const previousTweet = await Tweet.findById(tweet.threadPreviousId);
      if (previousTweet?.tweetId) {
        replyToTweetId = previousTweet.tweetId;
      }
    }

    // Upload media to X if present, then post the tweet
    const mediaIds = [];
    if (tweet.media && tweet.media.url) {
      try {
        logger.info(`Uploading media for tweet ${req.params.id}...`);
        const mediaId = await twitterService.uploadMedia(tweet.media.url);
        mediaIds.push(mediaId);
        logger.info(`Media uploaded, ID: ${mediaId}`);
      } catch (mediaErr) {
        logger.error(`Media upload failed for tweet ${req.params.id}:`, mediaErr.message);
        // Fail hard — don't post without the image the user explicitly attached
        return res.status(500).json({
          success: false,
          error: `Media upload to X failed: ${mediaErr.message}. The tweet was NOT posted.`,
        });
      }
    }

    // Post the tweet (with or without media)
    const result = await twitterService.postTweet(tweet.content, {
      replyToTweetId,
      mediaIds,
    });

    // Mark as sent
    const sentTweet = await Tweet.markSent(req.params.id, result.id);

    logger.info(`Tweet sent immediately: ${req.params.id} -> ${result.id}`);

    res.json({
      success: true,
      tweet: sentTweet,
      twitterTweetId: result.id,
    });
  } catch (error) {
    logger.error('Error sending tweet:', error);
    
    // Extract the most useful error message
    const errorDetail = error.data?.error_description
      || error.data?.detail
      || error.message
      || 'Failed to send tweet';
    
    // Detect token/auth issues and provide actionable message
    const isAuthError = errorDetail.includes('token was invalid')
      || errorDetail.includes('invalid_request')
      || error.code === 401;
    const userMessage = isAuthError
      ? 'Twitter authentication expired. Please log out and log in again to reconnect your account.'
      : errorDetail;
    
    // Mark as failed if it was a Twitter API error
    if (req.params.id) {
      try {
        await Tweet.markFailed(req.params.id, userMessage);
      } catch (markErr) {
        logger.error('Error marking tweet as failed:', markErr);
      }
    }

    const statusCode = isAuthError ? 401 : (error.code || 500);
    res.status(statusCode).json({
      success: false,
      error: userMessage,
    });
  }
};

/**
 * Delete a tweet
 * DELETE /api/tweets/:id
 */
const deleteTweet = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.status(404).json({
        success: false,
        error: 'Tweet not found',
      });
    }

    // Verify ownership
    if (tweet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this tweet',
      });
    }

    await Tweet.delete(req.params.id);

    logger.info(`Tweet deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Tweet deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting tweet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tweet',
    });
  }
};

module.exports = {
  getStats,
  getPendingTweets,
  scheduleTweet,
  scheduleThread,
  getTweets,
  getTweet,
  updateTweet,
  cancelTweet,
  sendTweetNow,
  deleteTweet,
};
