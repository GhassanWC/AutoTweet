/**
 * Scheduler Service
 * Handles background task scheduling using node-cron
 * 
 * OPTIMIZED FOR COST REDUCTION:
 * - Default intervals increased to reduce API calls
 * - Cache cleanup scheduled regularly
 * - Cost tracking integrated
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const TwitterService = require('./twitterService');
const EngagementService = require('./engagementService');
const searchCache = require('./searchCacheService');

class SchedulerService {
  constructor() {
    this.jobs = {};
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   * OPTIMIZED: Increased default intervals to reduce API costs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler service (COST-OPTIMIZED MODE)...');

    // Schedule tweet sending job (runs every 5 minutes - increased from 1)
    // Tweets are less time-sensitive than real-time needs
    const tweetInterval = process.env.TWEET_CHECK_INTERVAL || 5;
    this.jobs.tweets = cron.schedule(`*/${tweetInterval} * * * *`, async () => {
      await this.processPendingTweets();
    });

    // Schedule retweet automation job (runs every 60 minutes by default - increased from 15)
    // COST OPTIMIZATION: Less frequent checks = fewer search API calls
    const retweetInterval = process.env.RETWEET_CHECK_INTERVAL || 60;
    this.jobs.retweets = cron.schedule(`*/${retweetInterval} * * * *`, async () => {
      await this.processRetweetAutomation();
    });

    // Schedule engagement automation job (runs every 60 minutes by default - increased from 30)
    // COST OPTIMIZATION: Less frequent checks = fewer search API calls
    const engagementInterval = process.env.ENGAGEMENT_CHECK_INTERVAL || 60;
    this.jobs.engagement = cron.schedule(`*/${engagementInterval} * * * *`, async () => {
      await this.processEngagementAutomation();
    });

    // Schedule cache cleanup (runs every 30 minutes to free memory)
    this.jobs.cacheCleanup = cron.schedule('*/30 * * * *', () => {
      searchCache.cleanup();
      logger.debug('Search cache cleanup completed');
    });

    // Schedule daily cleanup (runs at midnight)
    this.jobs.cleanup = cron.schedule('0 0 * * *', async () => {
      await this.runCleanup();
    });

    // Log cost stats every hour
    this.jobs.costStats = cron.schedule('0 * * * *', () => {
      const stats = searchCache.getStats();
      const cost = searchCache.getEstimatedCost();
      logger.info(`API Cost Stats - Searches: ${stats.searches}, Engagements: ${stats.engagements}, Est. Cost: $${cost.totalEstimated.toFixed(4)}`);
    });

    this.isRunning = true;
    logger.info('Scheduler service started successfully (COST-OPTIMIZED)');
    logger.info(`Tweet check interval: ${tweetInterval} minute(s)`);
    logger.info(`Retweet check interval: ${retweetInterval} minute(s) (recommended: 60+)`);
    logger.info(`Engagement check interval: ${engagementInterval} minute(s) (recommended: 60+)`);
    logger.info('Using search cache with cooldown for empty results');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping scheduler service...');

    Object.values(this.jobs).forEach(job => {
      if (job) job.stop();
    });

    this.jobs = {};
    this.isRunning = false;
    logger.info('Scheduler service stopped');
  }

  /**
   * Process pending tweets due to be sent
   */
  async processPendingTweets() {
    try {
      logger.debug('Checking for pending tweets...');
      
      const pendingTweets = await Tweet.findPendingDue();
      
      if (pendingTweets.length === 0) {
        logger.debug('No pending tweets to process');
        return;
      }

      logger.info(`Processing ${pendingTweets.length} pending tweet(s)`);

      for (const tweet of pendingTweets) {
        await this.sendTweet(tweet);
      }
    } catch (error) {
      logger.error('Error processing pending tweets:', error);
    }
  }

  /**
   * Send a single scheduled tweet
   * @param {Object} tweet - Tweet object to send
   */
  async sendTweet(tweet) {
    try {
      // Get user
      const user = await User.findById(tweet.userId);
      if (!user) {
        logger.error(`User not found for tweet: ${tweet.id}`);
        await Tweet.markFailed(tweet.id, 'User not found');
        return;
      }

      // Initialize Twitter service
      const twitterService = await TwitterService.forUser(user);

      // Handle media if present
      const mediaIds = [];
      if (tweet.media && tweet.media.url) {
        try {
          const mediaId = await twitterService.uploadMedia(tweet.media.url);
          mediaIds.push(mediaId);
        } catch (mediaError) {
          logger.error(`Failed to upload media for tweet ${tweet.id}:`, mediaError);
          // Continue posting without media if it fails, or we could mark as failed
          // The request says: "If image generation fails, keep the tweet text and show a retry option."
          // For scheduling, if upload fails, we might want to retry later or post text-only.
          // I'll log it and proceed without media for now, but we could also throw to trigger a retry.
        }
      }

      // Check if this is part of a thread
      let replyToTweetId = tweet.replyToTweetId;
      if (tweet.threadPreviousId) {
        const previousTweet = await Tweet.findById(tweet.threadPreviousId);
        if (previousTweet?.tweetId) {
          replyToTweetId = previousTweet.tweetId;
        }
      }

      // Post the tweet
      const result = await twitterService.postTweet(tweet.content, {
        replyToTweetId,
        mediaIds,
      });

      // Mark as sent
      await Tweet.markSent(tweet.id, result.id);
      await User.incrementStat(user.id, 'totalTweets');

      logger.info(`Tweet sent successfully: ${tweet.id} -> ${result.id}`);
    } catch (error) {
      logger.error(`Error sending tweet ${tweet.id}:`, error);
      await Tweet.markFailed(tweet.id, error.message);
    }
  }

  /**
   * Process retweet automation for all users
   */
  async processRetweetAutomation() {
    try {
      logger.debug('Running retweet automation...');
      
      const users = await User.findAll();
      
      for (const user of users) {
        if (!user.settings?.retweet) continue;
        
        try {
          const engagementService = await EngagementService.forUser(user);
          await engagementService.processRetweets();
        } catch (error) {
          logger.error(`Error processing retweets for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in retweet automation:', error);
    }
  }

  /**
   * Process engagement automation for all users
   */
  async processEngagementAutomation() {
    try {
      logger.debug('Running engagement automation...');
      
      const users = await User.findAll();
      
      for (const user of users) {
        if (!user.settings?.like && !user.settings?.reply) continue;
        
        try {
          const engagementService = await EngagementService.forUser(user);
          await engagementService.processEngagement();
        } catch (error) {
          logger.error(`Error processing engagement for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in engagement automation:', error);
    }
  }

  /**
   * Run daily cleanup tasks
   */
  async runCleanup() {
    try {
      logger.info('Running daily cleanup...');
      
      const EngagementLog = require('../models/EngagementLog');
      const deletedCount = await EngagementLog.cleanup();
      
      logger.info(`Cleanup completed. Deleted ${deletedCount} old records.`);
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Manually trigger a specific job
   * @param {string} jobName - Name of the job to run
   */
  async runJob(jobName) {
    switch (jobName) {
      case 'tweets':
        await this.processPendingTweets();
        break;
      case 'retweets':
        await this.processRetweetAutomation();
        break;
      case 'engagement':
        await this.processEngagementAutomation();
        break;
      case 'cleanup':
        await this.runCleanup();
        break;
      default:
        logger.warn(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Status object
   */
  getStatus() {
    const cacheStats = searchCache.getStats();
    const costEstimate = searchCache.getEstimatedCost();
    
    return {
      isRunning: this.isRunning,
      jobs: Object.keys(this.jobs),
      intervals: {
        tweets: `${process.env.TWEET_CHECK_INTERVAL || 5} minute(s)`,
        retweets: `${process.env.RETWEET_CHECK_INTERVAL || 60} minute(s)`,
        engagement: `${process.env.ENGAGEMENT_CHECK_INTERVAL || 60} minute(s)`,
      },
      optimization: {
        cacheEnabled: true,
        cacheTTLMinutes: parseInt(process.env.SEARCH_CACHE_TTL_MINUTES || '30'),
        cooldownMinutes: parseInt(process.env.EMPTY_RESULT_COOLDOWN_MINUTES || '60'),
      },
      apiStats: {
        todaySearchCalls: cacheStats.searches,
        todayEngagementCalls: cacheStats.engagements,
        cacheSize: cacheStats.cacheSize,
        queriesInCooldown: cacheStats.cooldownCount,
        estimatedCostToday: `$${costEstimate.totalEstimated.toFixed(4)}`,
      },
    };
  }

  /**
   * Get detailed API cost statistics
   * @returns {Object} Cost statistics
   */
  getCostStats() {
    return {
      cache: searchCache.getStats(),
      cost: searchCache.getEstimatedCost(),
    };
  }
}

// Singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;






