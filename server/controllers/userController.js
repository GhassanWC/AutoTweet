/**
 * User Controller
 * Handles user profile and settings management
 */

const User = require('../models/User');
const Rule = require('../models/Rule');
const Tweet = require('../models/Tweet');
const EngagementLog = require('../models/EngagementLog');
const logger = require('../utils/logger');
const schedulerService = require('../services/schedulerService');
const { rateLimitTracker } = require('../utils/helpers');

/**
 * Get user profile
 * GET /api/user/profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Don't send sensitive data
    const profile = {
      id: user.id,
      twitterUserId: user.twitterUserId,
      twitterUsername: user.twitterUsername,
      displayName: user.displayName,
      profileImageUrl: user.profileImageUrl,
      settings: user.settings,
      stats: user.stats,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    
    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

/**
 * Update user settings
 * PUT /api/user/settings
 */
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    // Validate settings
    const validSettings = {};
    const allowedSettings = [
      'retweet',
      'like',
      'reply',
      'maxDailyTweets',
      'maxDailyRetweets',
      'maxDailyLikes',
      'timezone',
    ];
    
    for (const key of allowedSettings) {
      if (settings[key] !== undefined) {
        validSettings[key] = settings[key];
      }
    }
    
    // Validate numeric limits
    if (validSettings.maxDailyTweets !== undefined) {
      const val = parseInt(validSettings.maxDailyTweets);
      if (isNaN(val) || val < 1 || val > 1000) {
        return res.status(400).json({
          success: false,
          error: 'maxDailyTweets must be between 1 and 1000',
        });
      }
      validSettings.maxDailyTweets = val;
    }
    
    if (validSettings.maxDailyRetweets !== undefined) {
      const val = parseInt(validSettings.maxDailyRetweets);
      if (isNaN(val) || val < 1 || val > 1000) {
        return res.status(400).json({
          success: false,
          error: 'maxDailyRetweets must be between 1 and 1000',
        });
      }
      validSettings.maxDailyRetweets = val;
    }
    
    if (validSettings.maxDailyLikes !== undefined) {
      const val = parseInt(validSettings.maxDailyLikes);
      if (isNaN(val) || val < 1 || val > 2000) {
        return res.status(400).json({
          success: false,
          error: 'maxDailyLikes must be between 1 and 2000',
        });
      }
      validSettings.maxDailyLikes = val;
    }
    
    const user = await User.updateSettings(userId, validSettings);
    
    logger.info(`Settings updated for user: ${userId}`);
    
    res.json({
      success: true,
      settings: user.settings,
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
};

/**
 * Get user dashboard data
 * GET /api/user/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all data in parallel
    const [
      user,
      rules,
      pendingTweets,
      tweetStats,
      engagementStats,
    ] = await Promise.all([
      User.findById(userId),
      Rule.findByUserId(userId),
      Tweet.findPendingByUserId(userId),
      Tweet.getStats(userId),
      EngagementLog.getStats(userId),
    ]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    const dashboard = {
      user: {
        displayName: user.displayName,
        twitterUsername: user.twitterUsername,
        profileImageUrl: user.profileImageUrl,
        stats: user.stats,
      },
      rules: {
        total: rules.length,
        active: rules.filter(r => r.isActive).length,
        recent: rules.slice(0, 5),
      },
      tweets: {
        ...tweetStats,
        upcoming: pendingTweets.slice(0, 5),
      },
      engagement: engagementStats,
    };
    
    res.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
};

/**
 * Get engagement history
 * GET /api/user/engagement
 */
const getEngagementHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { action, limit } = req.query;
    
    const options = {};
    if (action) options.action = action;
    if (limit) options.limit = parseInt(limit);
    
    const logs = await EngagementLog.findByUserId(userId, options);
    
    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error('Error fetching engagement history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement history',
    });
  }
};

/**
 * Delete user account
 * DELETE /api/user
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete all user data
    await Promise.all([
      Rule.deleteByUserId(userId),
      Tweet.deleteByUserId(userId),
      User.delete(userId),
    ]);
    
    logger.info(`User account deleted: ${userId}`);
    
    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
};

/**
 * Get API usage and cost statistics
 * GET /api/user/api-stats
 * 
 * Returns information about:
 * - Today's API calls (searches and engagements)
 * - Estimated costs
 * - Cache efficiency
 * - Scheduler status
 * - Current rate limit status
 */
const getApiStats = async (req, res) => {
  try {
    const schedulerStatus = schedulerService.getStatus();
    const costStats = schedulerService.getCostStats();
    
    // Get current rate limit status for each endpoint
    const retweetLimit = rateLimitTracker.checkLimit('retweet');
    const likeLimit = rateLimitTracker.checkLimit('like');
    const searchLimit = rateLimitTracker.checkLimit('search');
    
    res.json({
      success: true,
      stats: {
        scheduler: {
          isRunning: schedulerStatus.isRunning,
          intervals: schedulerStatus.intervals,
          optimization: schedulerStatus.optimization,
        },
        rateLimits: {
          retweet: {
            isLimited: retweetLimit.isLimited,
            resetsAt: retweetLimit.resetAt ? retweetLimit.resetAt.toISOString() : null,
            waitMinutes: retweetLimit.isLimited ? Math.ceil(retweetLimit.waitMs / 60000) : 0,
          },
          like: {
            isLimited: likeLimit.isLimited,
            resetsAt: likeLimit.resetAt ? likeLimit.resetAt.toISOString() : null,
            waitMinutes: likeLimit.isLimited ? Math.ceil(likeLimit.waitMs / 60000) : 0,
          },
          search: {
            isLimited: searchLimit.isLimited,
            resetsAt: searchLimit.resetAt ? searchLimit.resetAt.toISOString() : null,
            waitMinutes: searchLimit.isLimited ? Math.ceil(searchLimit.waitMs / 60000) : 0,
          },
        },
        apiUsage: {
          today: {
            searchCalls: costStats.cache.searches,
            engagementCalls: costStats.cache.engagements,
            totalCalls: costStats.cache.searches + costStats.cache.engagements,
          },
          cache: {
            size: costStats.cache.cacheSize,
            sinceIdTracked: costStats.cache.sinceIdCount,
            queriesInCooldown: costStats.cache.cooldownCount,
          },
        },
        estimatedCost: {
          searchCost: `$${costStats.cost.estimatedSearchCost.toFixed(4)}`,
          engagementCost: `$${costStats.cost.estimatedEngagementCost.toFixed(4)}`,
          totalToday: `$${costStats.cost.totalEstimated.toFixed(4)}`,
          note: 'Estimates based on approximate X API pricing. Actual costs may vary.',
        },
        tips: [
          'Higher check intervals = fewer API calls = lower costs',
          'Search cache prevents redundant API calls for 30 minutes',
          'Empty result cooldown skips queries that find nothing for 60 minutes',
          'Using since_id fetches only new tweets, reducing data transfer',
          'Rate limits are tracked per endpoint to avoid wasting API calls',
        ],
      },
    });
  } catch (error) {
    logger.error('Error fetching API stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API statistics',
    });
  }
};

module.exports = {
  getProfile,
  updateSettings,
  getDashboard,
  getEngagementHistory,
  getApiStats,
  deleteAccount,
};



