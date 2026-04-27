/**
 * Twitter Service
 * Handles all Twitter API v2 interactions
 * 
 * OPTIMIZED FOR COST REDUCTION:
 * - Uses search cache to avoid redundant API calls
 * - Implements since_id for incremental fetching
 * - Provides cost tracking
 */

const { createUserClient, createAppOAuth1Client, refreshAccessToken } = require('../config/twitter');
const User = require('../models/User');
const logger = require('../utils/logger');
const { withRetry, rateLimitTracker, buildSearchQuery } = require('../utils/helpers');
const searchCache = require('./searchCacheService');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

class TwitterService {
  constructor(user) {
    this.user = user;
    this.client = null;
  }

  /**
   * Initialize the Twitter client with valid access token
   */
  async init() {
    // Check if token needs refresh
    if (User.isTokenExpired(this.user)) {
      logger.info(`Refreshing token for user: ${this.user.twitterUsername}`);
      try {
        const newTokens = await refreshAccessToken(this.user.refreshToken);
        await User.updateTokens(this.user.id, newTokens);
        this.user.accessToken = newTokens.accessToken;
      } catch (refreshErr) {
        logger.error('Token refresh failed:', refreshErr.data || refreshErr.message);
        const error = new Error('Twitter authentication expired. Please log out and log in again to reconnect your account.');
        error.code = 401;
        error.data = refreshErr.data;
        throw error;
      }
    }
    
    // Log masked token for debugging
    const maskedToken = this.user.accessToken 
      ? `${this.user.accessToken.substring(0, 5)}...${this.user.accessToken.substring(this.user.accessToken.length - 5)}`
      : 'MISSING';
    logger.debug(`Initializing Twitter client with token: ${maskedToken} (length: ${this.user.accessToken?.length || 0})`);

    this.client = createUserClient(this.user.accessToken);
    return this;
  }

  /**
   * Get authenticated user info
   * @returns {Object} User info from Twitter
   */
  async getMe() {
    try {
      const { data } = await withRetry(() =>
        this.client.v2.me({
          'user.fields': ['profile_image_url', 'description', 'public_metrics'],
        })
      );
      return data;
    } catch (error) {
      logger.error('Error getting user info:', error);
      throw error;
    }
  }

  /**
   * Post a tweet
   * @param {string} content - Tweet content
   * @param {Object} options - Additional options (reply_to, media)
   * @returns {Object} Posted tweet data
   */
  async postTweet(content, options = {}) {
    try {
      const tweetOptions = { text: content };

      // Handle reply
      if (options.replyToTweetId) {
        tweetOptions.reply = { in_reply_to_tweet_id: options.replyToTweetId };
      }

      // Handle media
      if (options.mediaIds && options.mediaIds.length > 0) {
        tweetOptions.media = { media_ids: options.mediaIds };
      }

      const { data } = await withRetry(() => this.client.v2.tweet(tweetOptions));
      
      logger.info(`Tweet posted: ${data.id}`);
      return data;
    } catch (error) {
      if (error.data) {
        logger.error('Twitter API error data:', error.data);
      }
      logger.error('Error posting tweet:', error);
      throw error;
    }
  }

  /**
   * Upload media to X using OAuth 1.0a (required by the v1.1 media upload endpoint)
   * @param {string} mediaUrl - URL or base64 data URI of the media to upload
   * @returns {string} Media ID string
   */
  async uploadMedia(mediaUrl) {
    try {
      logger.info(`Uploading media to X: ${mediaUrl.substring(0, 60)}...`);

      let mediaBuffer;
      let mimeType = 'image/png';

      if (mediaUrl.startsWith('data:')) {
        // Handle base64 data URI
        const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid base64 media data');
        }
        mimeType = matches[1];
        mediaBuffer = Buffer.from(matches[2], 'base64');
      } else {
        // Handle remote URL — download it first
        const response = await axios.get(mediaUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });
        mediaBuffer = Buffer.from(response.data);
        const ct = response.headers['content-type'] || '';
        mimeType = ct.split(';')[0].trim() || 'image/png';
      }

      // X media upload (v1.1) requires OAuth 1.0a.
      // IMPORTANT: always re-fetch the user from Firestore here to guarantee
      // the apiKeys field is present. The in-memory this.user may be the
      // JWT-decoded payload which does NOT contain apiKeys.
      const freshUser = await User.findById(this.user.id);
      const apiKeys   = freshUser?.apiKeys || {};

      const apiKey       = apiKeys.twitterApiKey            || process.env.TWITTER_API_KEY;
      const apiSecret    = apiKeys.twitterApiSecret         || process.env.TWITTER_API_SECRET;
      const accessToken  = apiKeys.twitterAccessToken       || process.env.TWITTER_ACCESS_TOKEN;
      const accessSecret = apiKeys.twitterAccessTokenSecret || process.env.TWITTER_ACCESS_TOKEN_SECRET;

      // Log which source is being used (masked, for debugging)
      const src = apiKeys.twitterApiKey ? 'user Firestore keys' : 'server env vars';
      logger.info(`Media upload: using ${src}. apiKey=${apiKey ? apiKey.slice(0,6)+'...' : 'MISSING'}, accessToken=${accessToken ? accessToken.slice(0,6)+'...' : 'MISSING'}`);

      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        const missing = [
          !apiKey       && 'API Key',
          !apiSecret    && 'API Key Secret',
          !accessToken  && 'Access Token',
          !accessSecret && 'Access Token Secret',
        ].filter(Boolean).join(', ');
        throw new Error(
          `Twitter OAuth 1.0a credentials missing (${missing}). ` +
          'Please add all four Twitter keys in Settings → API Keys.'
        );
      }

      // Build an OAuth 1.0a client directly from resolved credentials
      const { TwitterApi: TWApi } = require('twitter-api-v2');
      const mediaClient = new TWApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });
      const mediaId = await mediaClient.v1.uploadMedia(mediaBuffer, { mimeType });

      logger.info(`Media uploaded successfully. ID: ${mediaId}`);
      return mediaId;
    } catch (error) {
      logger.error('Error uploading media to X:', error?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a tweet
   * @param {string} tweetId - Tweet ID to delete
   */
  async deleteTweet(tweetId) {
    try {
      await withRetry(() => this.client.v2.deleteTweet(tweetId));
      logger.info(`Tweet deleted: ${tweetId}`);
    } catch (error) {
      logger.error('Error deleting tweet:', error);
      throw error;
    }
  }

  /**
   * Retweet a tweet
   * @param {string} tweetId - Tweet ID to retweet
   * @returns {Object} Retweet data
   */
  async retweet(tweetId) {
    try {
      // Check if we're rate limited before making the call
      const limitCheck = rateLimitTracker.checkLimit('retweet');
      if (limitCheck.isLimited) {
        const error = new Error(`Retweet rate limited. Resets at ${limitCheck.resetAt.toISOString()}`);
        error.code = 429;
        error.rateLimited = true;
        error.waitMinutes = Math.ceil(limitCheck.waitMs / 60000);
        throw error;
      }
      
      const { data } = await withRetry(
        () => this.client.v2.retweet(this.user.twitterUserId, tweetId),
        3,  // maxRetries
        1000,  // baseDelay
        'retweet'  // endpoint identifier for rate limit tracking
      );
      
      logger.info(`Retweeted: ${tweetId}`);
      return data;
    } catch (error) {
      logger.error('Error retweeting:', error);
      throw error;
    }
  }

  /**
   * Undo a retweet
   * @param {string} tweetId - Tweet ID to unretweet
   */
  async unretweet(tweetId) {
    try {
      await withRetry(() =>
        this.client.v2.unretweet(this.user.twitterUserId, tweetId)
      );
      logger.info(`Unretweeted: ${tweetId}`);
    } catch (error) {
      logger.error('Error unretweeting:', error);
      throw error;
    }
  }

  /**
   * Like a tweet
   * @param {string} tweetId - Tweet ID to like
   * @returns {Object} Like data
   */
  async like(tweetId) {
    try {
      // Check if we're rate limited before making the call
      const limitCheck = rateLimitTracker.checkLimit('like');
      if (limitCheck.isLimited) {
        const error = new Error(`Like rate limited. Resets at ${limitCheck.resetAt.toISOString()}`);
        error.code = 429;
        error.rateLimited = true;
        error.waitMinutes = Math.ceil(limitCheck.waitMs / 60000);
        throw error;
      }
      
      const { data } = await withRetry(
        () => this.client.v2.like(this.user.twitterUserId, tweetId),
        3,
        1000,
        'like'
      );
      
      logger.info(`Liked tweet: ${tweetId}`);
      return data;
    } catch (error) {
      logger.error('Error liking tweet:', error);
      throw error;
    }
  }

  /**
   * Unlike a tweet
   * @param {string} tweetId - Tweet ID to unlike
   */
  async unlike(tweetId) {
    try {
      await withRetry(() =>
        this.client.v2.unlike(this.user.twitterUserId, tweetId)
      );
      logger.info(`Unliked tweet: ${tweetId}`);
    } catch (error) {
      logger.error('Error unliking tweet:', error);
      throw error;
    }
  }

  /**
   * Reply to a tweet
   * @param {string} tweetId - Tweet ID to reply to
   * @param {string} content - Reply content
   * @returns {Object} Reply tweet data
   */
  async reply(tweetId, content) {
    return this.postTweet(content, { replyToTweetId: tweetId });
  }

  /**
   * Search for tweets
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Array of tweets
   */
  async searchTweets(query, options = {}) {
    try {
      // Check if we're rate limited before making the call
      const limitCheck = rateLimitTracker.checkLimit('search');
      if (limitCheck.isLimited) {
        logger.warn(`Search rate limited. Resets in ${Math.ceil(limitCheck.waitMs / 60000)} minutes`);
        return []; // Return empty instead of throwing to allow graceful degradation
      }
      
      const searchOptions = {
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id'],
        'user.fields': ['username', 'public_metrics', 'profile_image_url'],
        expansions: ['author_id'],
        max_results: options.maxResults || 100,  // Increased default from 10 to 100
      };

      if (options.sinceId) {
        searchOptions.since_id = options.sinceId;
      }

      const result = await withRetry(
        () => this.client.v2.search(query, searchOptions),
        3,
        1000,
        'search'
      );

      // Handle different response formats from twitter-api-v2
      // The library might return a paginator or direct response
      let tweets = [];
      let includes = null;

      if (result) {
        // Debug logging to understand the response structure
        logger.debug(`Search result type: ${typeof result}, keys: ${Object.keys(result || {}).join(', ')}`);
        
        // If result has _realData, it's a paginator - get the data from it
        if (result._realData) {
          tweets = result._realData.data || [];
          includes = result._realData.includes;
        } else if (result.tweets && Array.isArray(result.tweets)) {
          // Some versions return tweets directly
          tweets = result.tweets;
          includes = result.includes;
        } else if (result.data) {
          // Direct response with data property
          tweets = Array.isArray(result.data) ? result.data : [];
          includes = result.includes;
        } else if (Array.isArray(result)) {
          // Result is already an array
          tweets = result;
        }
        
        // Log the result for debugging
        logger.debug(`Found ${tweets.length} tweets from search`);
      }

      if (!tweets || tweets.length === 0) {
        return [];
      }

      // Merge user data into tweets
      const usersMap = {};
      if (includes?.users) {
        includes.users.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      return tweets.map(tweet => ({
        ...tweet,
        author: usersMap[tweet.author_id] || null,
      }));
    } catch (error) {
      logger.error('Error searching tweets:', error);
      throw error;
    }
  }

  /**
   * Search tweets based on a rule (handles large rules by splitting queries)
   * @param {Object} rule - Rule object
   * @param {Object} options - Search options
   * @returns {Array} Array of matching tweets
   */
  async searchByRule(rule, options = {}) {
    const queries = buildSearchQuery(rule);
    
    if (!queries || queries.length === 0) {
      logger.warn('Empty search query for rule:', rule.id);
      return [];
    }

    // Execute all queries and merge results
    const allTweets = [];
    const seenIds = new Set();
    
    for (const query of queries) {
      try {
        const tweets = await this.searchTweets(query, options);
        for (const tweet of tweets) {
          if (!seenIds.has(tweet.id)) {
            seenIds.add(tweet.id);
            allTweets.push(tweet);
          }
        }
      } catch (error) {
        logger.error(`Error executing query: ${query.substring(0, 100)}...`, error);
        // Continue with other queries
      }
    }

    return allTweets;
  }

  /**
   * OPTIMIZED: Search tweets based on a rule with caching and since_id
   * This significantly reduces API costs by:
   * 1. Caching results to avoid redundant searches
   * 2. Using since_id to only fetch new tweets
   * 3. Implementing cooldown for empty results
   * 4. Batching queries efficiently
   * 
   * @param {Object} rule - Rule object
   * @param {Object} options - Search options
   * @returns {Array} Array of matching tweets
   */
  async searchByRuleOptimized(rule, options = {}) {
    const queries = buildSearchQuery(rule);
    
    if (!queries || queries.length === 0) {
      logger.warn('Empty search query for rule:', rule.id);
      return [];
    }

    const allTweets = [];
    const seenIds = new Set();
    const useCache = options.useCache !== false;
    const useSinceId = options.useSinceId !== false;
    
    for (const query of queries) {
      try {
        // OPTIMIZATION 1: Check cooldown (skip if we found nothing recently)
        if (useCache && searchCache.isInCooldown(query)) {
          logger.debug(`Skipping query in cooldown: ${query.substring(0, 50)}...`);
          continue;
        }

        // OPTIMIZATION 2: Check cache first
        if (useCache) {
          const cachedTweets = searchCache.getCachedTweets(query);
          if (cachedTweets !== null) {
            // Use cached results
            for (const tweet of cachedTweets) {
              if (!seenIds.has(tweet.id)) {
                seenIds.add(tweet.id);
                allTweets.push(tweet);
              }
            }
            continue; // Skip API call
          }
        }

        // OPTIMIZATION 3: Use since_id to only get new tweets
        const searchOptions = { ...options };
        if (useSinceId) {
          const sinceId = searchCache.getSinceId(query);
          if (sinceId) {
            searchOptions.sinceId = sinceId;
            logger.debug(`Using since_id ${sinceId} for incremental search`);
          }
        }

        // Make the actual API call
        const tweets = await this.searchTweets(query, searchOptions);
        searchCache.recordApiCall('search');
        
        // Cache the results
        if (useCache) {
          searchCache.cacheTweets(query, tweets);
        }
        
        for (const tweet of tweets) {
          if (!seenIds.has(tweet.id)) {
            seenIds.add(tweet.id);
            allTweets.push(tweet);
          }
        }
      } catch (error) {
        logger.error(`Error executing query: ${query.substring(0, 100)}...`, error);
        // Continue with other queries
      }
    }

    logger.debug(`Optimized search found ${allTweets.length} tweets for rule ${rule.id}`);
    return allTweets;
  }

  /**
   * Get a single tweet by ID
   * @param {string} tweetId - Tweet ID
   * @returns {Object} Tweet data
   */
  async getTweet(tweetId) {
    try {
      const { data } = await withRetry(() =>
        this.client.v2.singleTweet(tweetId, {
          'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
          'user.fields': ['username', 'public_metrics'],
          expansions: ['author_id'],
        })
      );
      return data;
    } catch (error) {
      logger.error('Error getting tweet:', error);
      throw error;
    }
  }

  /**
   * Get user's timeline
   * @param {Object} options - Timeline options
   * @returns {Array} Array of tweets
   */
  async getTimeline(options = {}) {
    try {
      const timelineOptions = {
        'tweet.fields': ['created_at', 'public_metrics'],
        max_results: options.maxResults || 10,
      };

      if (options.sinceId) {
        timelineOptions.since_id = options.sinceId;
      }

      const { data } = await withRetry(() =>
        this.client.v2.userTimeline(this.user.twitterUserId, timelineOptions)
      );

      return data || [];
    } catch (error) {
      logger.error('Error getting timeline:', error);
      throw error;
    }
  }

  /**
   * Get user's mentions
   * @param {Object} options - Mentions options
   * @returns {Array} Array of mention tweets
   */
  async getMentions(options = {}) {
    try {
      const mentionOptions = {
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['username'],
        expansions: ['author_id'],
        max_results: options.maxResults || 10,
      };

      if (options.sinceId) {
        mentionOptions.since_id = options.sinceId;
      }

      const { data, includes } = await withRetry(() =>
        this.client.v2.userMentionTimeline(this.user.twitterUserId, mentionOptions)
      );

      if (!data) return [];

      // Merge user data
      const usersMap = {};
      if (includes?.users) {
        includes.users.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      return data.map(tweet => ({
        ...tweet,
        author: usersMap[tweet.author_id] || null,
      }));
    } catch (error) {
      logger.error('Error getting mentions:', error);
      throw error;
    }
  }

  /**
   * Follow a user
   * @param {string} targetUserId - User ID to follow
   */
  async follow(targetUserId) {
    try {
      await withRetry(() =>
        this.client.v2.follow(this.user.twitterUserId, targetUserId)
      );
      logger.info(`Followed user: ${targetUserId}`);
    } catch (error) {
      logger.error('Error following user:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   * @param {string} targetUserId - User ID to unfollow
   */
  async unfollow(targetUserId) {
    try {
      await withRetry(() =>
        this.client.v2.unfollow(this.user.twitterUserId, targetUserId)
      );
      logger.info(`Unfollowed user: ${targetUserId}`);
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   * @param {string} username - Twitter username
   * @returns {Object} User data
   */
  async getUserByUsername(username) {
    try {
      const { data } = await withRetry(() =>
        this.client.v2.userByUsername(username, {
          'user.fields': ['public_metrics', 'profile_image_url', 'description'],
        })
      );
      return data;
    } catch (error) {
      logger.error('Error getting user by username:', error);
      throw error;
    }
  }

  /**
   * Create a TwitterService instance for a user
   * @param {Object} user - User object
   * @returns {TwitterService} Initialized service
   */
  static async forUser(user) {
    const service = new TwitterService(user);
    await service.init();
    return service;
  }
}

module.exports = TwitterService;



