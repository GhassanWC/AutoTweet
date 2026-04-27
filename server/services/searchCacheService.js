/**
 * Search Cache Service
 * Caches Twitter search results to reduce API calls and costs
 * 
 * Key optimizations:
 * - Caches search results with TTL to avoid redundant API calls
 * - Tracks since_id per query to fetch only new tweets
 * - Combines similar queries to reduce total API calls
 * - Provides cost tracking for monitoring
 */

const logger = require('../utils/logger');

class SearchCacheService {
  constructor() {
    // Cache structure: { queryHash: { tweets: [], timestamp: Date, sinceId: string } }
    this.cache = new Map();
    
    // Track API calls for cost monitoring
    this.apiCallStats = {
      searches: 0,
      engagements: 0,
      lastResetDate: new Date().toDateString(),
    };
    
    // Default cache TTL: 30 minutes (in milliseconds)
    // This prevents repeated searches for the same query within 30 min
    this.cacheTTL = parseInt(process.env.SEARCH_CACHE_TTL_MINUTES || '30') * 60 * 1000;
    
    // Track since_id per normalized query to fetch only new tweets
    this.sinceIdMap = new Map();
    
    // Cooldown tracking - skip rules that found nothing recently
    this.cooldownMap = new Map();
    this.cooldownDuration = parseInt(process.env.EMPTY_RESULT_COOLDOWN_MINUTES || '60') * 60 * 1000;
  }

  /**
   * Generate a hash key for a search query
   * @param {string} query - Search query
   * @returns {string} Hash key
   */
  getQueryHash(query) {
    // Normalize query for caching (lowercase, trimmed, sorted terms)
    const normalized = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .sort()
      .join(' ');
    return normalized;
  }

  /**
   * Check if cached results are still valid
   * @param {string} queryHash - Query hash
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(queryHash) {
    const cached = this.cache.get(queryHash);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.cacheTTL;
  }

  /**
   * Get cached tweets for a query
   * @param {string} query - Search query
   * @returns {Array|null} Cached tweets or null if not cached/expired
   */
  getCachedTweets(query) {
    const queryHash = this.getQueryHash(query);
    
    if (!this.isCacheValid(queryHash)) {
      return null;
    }
    
    const cached = this.cache.get(queryHash);
    logger.debug(`Cache hit for query: ${query.substring(0, 50)}...`);
    return cached.tweets;
  }

  /**
   * Cache tweets for a query
   * @param {string} query - Search query
   * @param {Array} tweets - Tweets to cache
   */
  cacheTweets(query, tweets) {
    const queryHash = this.getQueryHash(query);
    
    // Update since_id if we have tweets
    if (tweets.length > 0) {
      // Store the highest tweet ID for next search
      const highestId = tweets.reduce((max, tweet) => {
        return tweet.id > max ? tweet.id : max;
      }, '0');
      this.sinceIdMap.set(queryHash, highestId);
      
      // Clear cooldown since we found tweets
      this.cooldownMap.delete(queryHash);
    } else {
      // No tweets found - set cooldown
      this.cooldownMap.set(queryHash, Date.now());
    }
    
    this.cache.set(queryHash, {
      tweets,
      timestamp: Date.now(),
    });
    
    logger.debug(`Cached ${tweets.length} tweets for query: ${query.substring(0, 50)}...`);
  }

  /**
   * Get since_id for incremental search
   * @param {string} query - Search query
   * @returns {string|null} Since ID or null
   */
  getSinceId(query) {
    const queryHash = this.getQueryHash(query);
    return this.sinceIdMap.get(queryHash) || null;
  }

  /**
   * Check if a query is in cooldown (found no results recently)
   * @param {string} query - Search query
   * @returns {boolean} True if in cooldown
   */
  isInCooldown(query) {
    const queryHash = this.getQueryHash(query);
    const cooldownStart = this.cooldownMap.get(queryHash);
    
    if (!cooldownStart) return false;
    
    const elapsed = Date.now() - cooldownStart;
    if (elapsed >= this.cooldownDuration) {
      // Cooldown expired
      this.cooldownMap.delete(queryHash);
      return false;
    }
    
    logger.debug(`Query in cooldown (${Math.round((this.cooldownDuration - elapsed) / 60000)} min remaining): ${query.substring(0, 50)}...`);
    return true;
  }

  /**
   * Record an API call for cost tracking
   * @param {string} type - Type of API call ('search', 'like', 'retweet', 'reply', 'tweet')
   */
  recordApiCall(type) {
    // Reset stats daily
    const today = new Date().toDateString();
    if (this.apiCallStats.lastResetDate !== today) {
      this.apiCallStats = {
        searches: 0,
        engagements: 0,
        lastResetDate: today,
      };
    }
    
    if (type === 'search') {
      this.apiCallStats.searches++;
    } else {
      this.apiCallStats.engagements++;
    }
  }

  /**
   * Get API call statistics
   * @returns {Object} API call stats
   */
  getStats() {
    return {
      ...this.apiCallStats,
      cacheSize: this.cache.size,
      sinceIdCount: this.sinceIdMap.size,
      cooldownCount: this.cooldownMap.size,
    };
  }

  /**
   * Clear expired cache entries
   */
  cleanup() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheTTL) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    // Clear expired cooldowns
    for (const [key, timestamp] of this.cooldownMap.entries()) {
      if (now - timestamp >= this.cooldownDuration) {
        this.cooldownMap.delete(key);
      }
    }
    
    if (cleared > 0) {
      logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get estimated daily cost based on API calls
   * Note: These are rough estimates based on X API pricing
   * @returns {Object} Cost estimate
   */
  getEstimatedCost() {
    // Rough cost estimates (these vary by tier)
    // Basic tier includes some calls, pay-per-use charges extra
    const searchCostPer1000 = 0.50;  // Rough estimate
    const engagementCostPer1000 = 0.25;  // Rough estimate
    
    return {
      searchCalls: this.apiCallStats.searches,
      engagementCalls: this.apiCallStats.engagements,
      estimatedSearchCost: (this.apiCallStats.searches / 1000) * searchCostPer1000,
      estimatedEngagementCost: (this.apiCallStats.engagements / 1000) * engagementCostPer1000,
      totalEstimated: 
        (this.apiCallStats.searches / 1000) * searchCostPer1000 +
        (this.apiCallStats.engagements / 1000) * engagementCostPer1000,
    };
  }
}

// Singleton instance
const searchCacheService = new SearchCacheService();

module.exports = searchCacheService;
