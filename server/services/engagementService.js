/**
 * Engagement Service
 * Handles automated engagement (likes, retweets, replies) based on rules
 * 
 * OPTIMIZED FOR COST REDUCTION:
 * - Uses search cache to avoid redundant API calls
 * - Batches searches across similar rules
 * - Uses since_id for incremental fetching
 * - Implements smart cooldown for empty results
 * - Maximizes results per API call
 */

const logger = require('../utils/logger');
const User = require('../models/User');
const Rule = require('../models/Rule');
const EngagementLog = require('../models/EngagementLog');
const TwitterService = require('./twitterService');
const searchCache = require('./searchCacheService');
const { sleep, rateLimitTracker } = require('../utils/helpers');

class EngagementService {
  constructor(user, twitterService) {
    this.user = user;
    this.twitter = twitterService;
  }

  /**
   * Process retweets based on user's rules
   * OPTIMIZED: Checks rate limits before processing and stops if limited
   */
  async processRetweets() {
    try {
      // Check if we're already rate limited for retweets
      const retweetLimit = rateLimitTracker.checkLimit('retweet');
      if (retweetLimit.isLimited) {
        const waitMinutes = Math.ceil(retweetLimit.waitMs / 60000);
        logger.info(`Retweet rate limited. Skipping processing. Resets in ${waitMinutes} minutes.`);
        return;
      }
      
      const rules = await Rule.findActiveByUserId(this.user.id);
      
      for (const rule of rules) {
        if (!rule.engagement?.retweet) continue;
        
        // Re-check rate limit between rules
        const currentLimit = rateLimitTracker.checkLimit('retweet');
        if (currentLimit.isLimited) {
          logger.info('Retweet rate limit hit during processing. Stopping.');
          break;
        }
        
        await this.processRuleRetweets(rule);
        
        // Rate limiting: wait between rule processing
        await sleep(2000);
      }
    } catch (error) {
      logger.error('Error processing retweets:', error);
      throw error;
    }
  }

  /**
   * Process retweets for a specific rule
   * OPTIMIZED: Uses cache, since_id, cooldown, and larger batch sizes
   * @param {Object} rule - Rule object
   */
  async processRuleRetweets(rule) {
    try {
      // Check daily/hourly limits FIRST to avoid unnecessary API calls
      const dailyCount = await EngagementLog.getDailyCount(this.user.id, EngagementLog.ACTION.RETWEET);
      const hourlyCount = await EngagementLog.getHourlyCount(this.user.id, EngagementLog.ACTION.RETWEET);

      if (dailyCount >= (rule.limits?.maxPerDay || 50)) {
        logger.debug(`Daily retweet limit reached for rule ${rule.id}`);
        return;
      }

      if (hourlyCount >= (rule.limits?.maxPerHour || 10)) {
        logger.debug(`Hourly retweet limit reached for rule ${rule.id}`);
        return;
      }

      // OPTIMIZATION: Search with cache, since_id, and larger max_results
      // max_results: 100 (maximum allowed) to get more value per API call
      const tweets = await this.twitter.searchByRuleOptimized(rule, { 
        maxResults: 100,  // Increased from 10 to maximize value per API call
        useCache: true,
        useSinceId: true,
      });
      
      if (tweets.length === 0) {
        logger.debug(`No matching tweets found for rule ${rule.id}`);
        return;
      }

      let retweeted = 0;
      const maxRetweets = Math.min(
        rule.limits?.maxPerHour || 10 - hourlyCount,
        rule.limits?.maxPerDay || 50 - dailyCount,
        5 // Max 5 retweets per execution to spread engagement over time
      );

      for (const tweet of tweets) {
        if (retweeted >= maxRetweets) break;

        // Check if rate limited before each retweet
        const limitCheck = rateLimitTracker.checkLimit('retweet');
        if (limitCheck.isLimited) {
          logger.info(`Rate limit hit. Stopping retweets. Resets in ${Math.ceil(limitCheck.waitMs / 60000)} min.`);
          break;
        }

        // Check if already engaged
        const hasEngaged = await EngagementLog.hasEngaged(
          this.user.id,
          tweet.id,
          EngagementLog.ACTION.RETWEET
        );

        if (hasEngaged) continue;

        // Apply filters
        if (!this.passesFilters(tweet, rule.filters)) continue;

        try {
          await this.twitter.retweet(tweet.id);
          searchCache.recordApiCall('retweet');
          
          await EngagementLog.create({
            userId: this.user.id,
            ruleId: rule.id,
            tweetId: tweet.id,
            action: EngagementLog.ACTION.RETWEET,
            success: true,
          });

          await User.incrementStat(this.user.id, 'totalRetweets');
          retweeted++;

          // Rate limiting between retweets - increased to 5s to be safer
          await sleep(5000);
        } catch (error) {
          // If rate limited, stop processing
          if (error.code === 429 || error.rateLimited) {
            logger.warn(`Rate limit hit on retweet. Stopping for this rule.`);
            break;
          }
          
          logger.error(`Error retweeting ${tweet.id}:`, error);
          
          await EngagementLog.create({
            userId: this.user.id,
            ruleId: rule.id,
            tweetId: tweet.id,
            action: EngagementLog.ACTION.RETWEET,
            success: false,
            error: error.message,
          });
        }
      }

      if (retweeted > 0) {
        await Rule.markExecuted(rule.id);
        logger.info(`Retweeted ${retweeted} tweets for rule ${rule.id}`);
      }
    } catch (error) {
      logger.error(`Error processing rule retweets for ${rule.id}:`, error);
    }
  }

  /**
   * Process engagement (likes and replies) based on user's rules
   * OPTIMIZED: Checks rate limits before processing and stops if limited
   */
  async processEngagement() {
    try {
      // Check if we're already rate limited for likes
      const likeLimit = rateLimitTracker.checkLimit('like');
      if (likeLimit.isLimited) {
        const waitMinutes = Math.ceil(likeLimit.waitMs / 60000);
        logger.info(`Like rate limited. Skipping processing. Resets in ${waitMinutes} minutes.`);
        return;
      }
      
      const rules = await Rule.findActiveByUserId(this.user.id);
      
      for (const rule of rules) {
        const hasEngagement = rule.engagement?.like || rule.engagement?.reply;
        if (!hasEngagement) continue;
        
        // Re-check rate limit between rules
        const currentLimit = rateLimitTracker.checkLimit('like');
        if (currentLimit.isLimited) {
          logger.info('Like rate limit hit during processing. Stopping.');
          break;
        }
        
        await this.processRuleEngagement(rule);
        
        // Rate limiting: wait between rule processing
        await sleep(2000);
      }
    } catch (error) {
      logger.error('Error processing engagement:', error);
      throw error;
    }
  }

  /**
   * Process engagement for a specific rule
   * OPTIMIZED: Uses cache, since_id, and larger batch sizes
   * @param {Object} rule - Rule object
   */
  async processRuleEngagement(rule) {
    try {
      // OPTIMIZATION: Check limits before making any API calls
      const dailyLikes = await EngagementLog.getDailyCount(this.user.id, EngagementLog.ACTION.LIKE);
      const dailyReplies = await EngagementLog.getDailyCount(this.user.id, EngagementLog.ACTION.REPLY);
      
      const maxDailyLikes = this.user.settings?.maxDailyLikes || 200;
      const maxDailyReplies = 50;
      
      // Skip if we've hit all limits
      if (dailyLikes >= maxDailyLikes && dailyReplies >= maxDailyReplies) {
        logger.debug(`Daily engagement limits reached, skipping rule ${rule.id}`);
        return;
      }

      // OPTIMIZATION: Search with cache and larger results
      const tweets = await this.twitter.searchByRuleOptimized(rule, { 
        maxResults: 100,  // Increased from 10
        useCache: true,
        useSinceId: true,
      });
      
      if (tweets.length === 0) {
        logger.debug(`No matching tweets found for rule ${rule.id}`);
        return;
      }

      let engaged = 0;
      const maxEngagements = 5; // Max 5 engagements per execution to spread over time

      for (const tweet of tweets) {
        if (engaged >= maxEngagements) break;

        // Apply filters
        if (!this.passesFilters(tweet, rule.filters)) continue;

        // Process likes
        if (rule.engagement?.like && this.user.settings?.like) {
          await this.processLike(tweet, rule);
        }

        // Process replies
        if (rule.engagement?.reply && this.user.settings?.reply) {
          await this.processReply(tweet, rule);
        }

        engaged++;

        // Rate limiting between engagements - increased to 4s
        await sleep(4000);
      }

      if (engaged > 0) {
        await Rule.markExecuted(rule.id);
      }
    } catch (error) {
      logger.error(`Error processing rule engagement for ${rule.id}:`, error);
    }
  }

  /**
   * Process like for a tweet
   * OPTIMIZED: Added API call tracking
   * @param {Object} tweet - Tweet object
   * @param {Object} rule - Rule object
   */
  async processLike(tweet, rule) {
    try {
      // Check daily limits
      const dailyCount = await EngagementLog.getDailyCount(this.user.id, EngagementLog.ACTION.LIKE);
      if (dailyCount >= (this.user.settings?.maxDailyLikes || 200)) {
        logger.debug('Daily like limit reached');
        return;
      }

      // Check if already liked
      const hasEngaged = await EngagementLog.hasEngaged(
        this.user.id,
        tweet.id,
        EngagementLog.ACTION.LIKE
      );

      if (hasEngaged) return;

      await this.twitter.like(tweet.id);
      searchCache.recordApiCall('like');  // Track API call
      
      await EngagementLog.create({
        userId: this.user.id,
        ruleId: rule.id,
        tweetId: tweet.id,
        action: EngagementLog.ACTION.LIKE,
        success: true,
      });

      await User.incrementStat(this.user.id, 'totalLikes');
      logger.info(`Liked tweet ${tweet.id} for rule ${rule.id}`);
    } catch (error) {
      logger.error(`Error liking tweet ${tweet.id}:`, error);
      
      await EngagementLog.create({
        userId: this.user.id,
        ruleId: rule.id,
        tweetId: tweet.id,
        action: EngagementLog.ACTION.LIKE,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Process reply for a tweet
   * OPTIMIZED: Added API call tracking
   * @param {Object} tweet - Tweet object
   * @param {Object} rule - Rule object
   */
  async processReply(tweet, rule) {
    try {
      // Check daily limits
      const dailyCount = await EngagementLog.getDailyCount(this.user.id, EngagementLog.ACTION.REPLY);
      if (dailyCount >= 50) { // Max 50 replies per day
        logger.debug('Daily reply limit reached');
        return;
      }

      // Check if already replied
      const hasEngaged = await EngagementLog.hasEngaged(
        this.user.id,
        tweet.id,
        EngagementLog.ACTION.REPLY
      );

      if (hasEngaged) return;

      // Get reply template
      const replyContent = this.getReplyContent(tweet, rule);
      if (!replyContent) {
        logger.debug('No reply template available');
        return;
      }

      await this.twitter.reply(tweet.id, replyContent);
      searchCache.recordApiCall('reply');  // Track API call
      
      await EngagementLog.create({
        userId: this.user.id,
        ruleId: rule.id,
        tweetId: tweet.id,
        action: EngagementLog.ACTION.REPLY,
        success: true,
        replyContent,
      });

      await User.incrementStat(this.user.id, 'totalReplies');
      logger.info(`Replied to tweet ${tweet.id} for rule ${rule.id}`);
    } catch (error) {
      logger.error(`Error replying to tweet ${tweet.id}:`, error);
      
      await EngagementLog.create({
        userId: this.user.id,
        ruleId: rule.id,
        tweetId: tweet.id,
        action: EngagementLog.ACTION.REPLY,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get reply content from templates
   * @param {Object} tweet - Tweet object
   * @param {Object} rule - Rule object
   * @returns {string|null} Reply content or null
   */
  getReplyContent(tweet, rule) {
    const templates = rule.engagement?.replyTemplates || [];
    
    if (templates.length === 0) {
      return null;
    }

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace placeholders
    let content = template;
    
    if (tweet.author?.username) {
      content = content.replace('{username}', `@${tweet.author.username}`);
    }
    
    return content;
  }

  /**
   * Check if a tweet passes the rule filters
   * @param {Object} tweet - Tweet object
   * @param {Object} filters - Filter settings
   * @returns {boolean} True if tweet passes filters
   */
  passesFilters(tweet, filters = {}) {
    // Check minimum followers
    if (filters.minFollowers > 0 && tweet.author?.public_metrics) {
      if (tweet.author.public_metrics.followers_count < filters.minFollowers) {
        return false;
      }
    }

    // Check minimum likes
    if (filters.minLikes > 0 && tweet.public_metrics) {
      if (tweet.public_metrics.like_count < filters.minLikes) {
        return false;
      }
    }

    // Exclude replies if configured
    if (filters.excludeReplies && tweet.conversation_id !== tweet.id) {
      return false;
    }

    return true;
  }

  /**
   * Create an EngagementService instance for a user
   * @param {Object} user - User object
   * @returns {EngagementService} Initialized service
   */
  static async forUser(user) {
    const twitterService = await TwitterService.forUser(user);
    return new EngagementService(user, twitterService);
  }
}

module.exports = EngagementService;






