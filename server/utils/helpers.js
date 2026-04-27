/**
 * Helper Utilities
 * Common utility functions used throughout the application
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique identifier
 * @returns {string} UUID v4
 */
const generateId = () => uuidv4();

/**
 * Generate a random state string for OAuth CSRF protection
 * @param {number} length - Length of the state string
 * @returns {string} Random state string
 */
const generateState = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

/**
 * Validate tweet content
 * @param {string} content - Tweet content to validate
 * @returns {Object} Validation result with isValid and error message
 */
const validateTweetContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Tweet content is required' };
  }
  
  const trimmedContent = content.trim();
  
  if (trimmedContent.length === 0) {
    return { isValid: false, error: 'Tweet content cannot be empty' };
  }
  
  if (trimmedContent.length > 280) {
    return { isValid: false, error: 'Tweet content exceeds 280 characters' };
  }
  
  return { isValid: true, content: trimmedContent };
};

/**
 * Format date for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString();
};

/**
 * Check if a date is in the past
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is in the past
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Rate limit tracker - tracks when each endpoint's rate limit resets
 * This prevents wasting API calls when we know we're rate limited
 */
const rateLimitTracker = {
  limits: new Map(),
  
  /**
   * Record a rate limit hit
   * @param {string} endpoint - API endpoint identifier (e.g., 'retweet', 'like', 'search')
   * @param {number} resetTimestamp - Unix timestamp when rate limit resets
   */
  recordLimit(endpoint, resetTimestamp) {
    this.limits.set(endpoint, {
      resetAt: resetTimestamp * 1000, // Convert to milliseconds
      recordedAt: Date.now(),
    });
  },
  
  /**
   * Check if an endpoint is currently rate limited
   * @param {string} endpoint - API endpoint identifier
   * @returns {Object} { isLimited: boolean, waitMs: number, resetAt: Date }
   */
  checkLimit(endpoint) {
    const limit = this.limits.get(endpoint);
    if (!limit) {
      return { isLimited: false, waitMs: 0, resetAt: null };
    }
    
    const now = Date.now();
    if (now >= limit.resetAt) {
      // Rate limit has expired
      this.limits.delete(endpoint);
      return { isLimited: false, waitMs: 0, resetAt: null };
    }
    
    return {
      isLimited: true,
      waitMs: limit.resetAt - now,
      resetAt: new Date(limit.resetAt),
    };
  },
  
  /**
   * Get time until rate limit resets (in minutes)
   * @param {string} endpoint - API endpoint identifier
   * @returns {number} Minutes until reset, or 0 if not limited
   */
  getWaitMinutes(endpoint) {
    const { waitMs } = this.checkLimit(endpoint);
    return Math.ceil(waitMs / 60000);
  },
  
  /**
   * Clear all rate limits (for testing)
   */
  clear() {
    this.limits.clear();
  },
};

/**
 * Rate limit handler with smart waiting
 * IMPROVED: Now respects X API rate limit reset times instead of just retrying
 * @param {Function} fn - Function to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {string} endpoint - Endpoint identifier for rate limit tracking
 * @returns {Promise} Result of the function
 */
const withRetry = async (fn, maxRetries = 3, baseDelay = 1000, endpoint = 'default') => {
  let lastError;
  
  // Check if we're already rate limited for this endpoint
  const existingLimit = rateLimitTracker.checkLimit(endpoint);
  if (existingLimit.isLimited) {
    const waitMinutes = Math.ceil(existingLimit.waitMs / 60000);
    const error = new Error(`Rate limited for ${endpoint}. Resets in ${waitMinutes} minutes.`);
    error.code = 429;
    error.rateLimited = true;
    error.resetAt = existingLimit.resetAt;
    error.waitMs = existingLimit.waitMs;
    throw error;
  }
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check for rate limit error (Twitter API returns 429)
      if (error.code === 429 || error.rateLimitError) {
        // Extract reset time from error if available
        let resetTimestamp = null;
        
        if (error.rateLimit?.reset) {
          resetTimestamp = error.rateLimit.reset;
        } else if (error.headers?.['x-rate-limit-reset']) {
          resetTimestamp = parseInt(error.headers['x-rate-limit-reset']);
        }
        
        if (resetTimestamp) {
          // Record the rate limit for future calls
          rateLimitTracker.recordLimit(endpoint, resetTimestamp);
          
          const waitMs = (resetTimestamp * 1000) - Date.now();
          const waitMinutes = Math.ceil(waitMs / 60000);
          
          // Don't wait more than 15 minutes in a single call
          // Just throw and let the scheduler retry later
          if (waitMs > 15 * 60 * 1000) {
            error.message = `Rate limit exceeded for ${endpoint}. Resets in ${waitMinutes} minutes. Will retry later.`;
            error.rateLimited = true;
            error.resetAt = new Date(resetTimestamp * 1000);
            throw error;
          }
          
          // Wait until reset if it's reasonable
          console.log(`Rate limited. Waiting ${waitMinutes} minutes until reset...`);
          await sleep(waitMs + 1000); // Add 1 second buffer
          continue;
        }
        
        // Fallback to exponential backoff if no reset time
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

/**
 * Extract hashtags from text
 * @param {string} text - Text to extract hashtags from
 * @returns {string[]} Array of hashtags
 */
const extractHashtags = (text) => {
  const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
};

/**
 * Extract mentions from text
 * @param {string} text - Text to extract mentions from
 * @returns {string[]} Array of mentions (without @)
 */
const extractMentions = (text) => {
  const mentionRegex = /@([\w]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  return matches.map(match => match[1].toLowerCase());
};

/**
 * Twitter API has a 512 character limit for search queries.
 * This function builds queries that respect this limit.
 */
const MAX_QUERY_LENGTH = 480; // Leave some buffer

/**
 * Build Twitter search queries from rules, splitting into multiple queries if needed
 * @param {Object} rule - Rule object with keywords, hashtags, users
 * @returns {string[]} Array of Twitter search queries (each under 512 chars)
 */
const buildSearchQuery = (rule) => {
  // Collect all terms
  const keywords = (rule.keywords || []).filter(k => k && k.trim());
  const hashtags = (rule.hashtags || []).map(tag => tag.startsWith('#') ? tag : `#${tag}`).filter(h => h && h.trim());
  const users = (rule.users || []).map(user => `from:${user.replace('@', '')}`).filter(u => u && u.trim());
  
  // If no terms, return empty array
  if (keywords.length === 0 && hashtags.length === 0 && users.length === 0) {
    return [];
  }

  // Suffix to add to all queries
  const suffix = ' -is:retweet';
  
  // For simpler rules, try single query first
  const allTerms = [...keywords, ...hashtags, ...users];
  const simpleQuery = `(${allTerms.join(' OR ')})${suffix}`;
  
  if (simpleQuery.length <= MAX_QUERY_LENGTH) {
    return [simpleQuery];
  }
  
  // Need to split - create multiple smaller queries
  const queries = [];
  
  // Helper to create batched queries from terms
  const createBatchedQueries = (terms, prefix = '') => {
    if (terms.length === 0) return;
    
    let currentTerms = [];
    let currentLength = 0;
    
    for (const term of terms) {
      const termWithOr = currentTerms.length > 0 ? ` OR ${term}` : term;
      const projectedLength = prefix.length + currentLength + termWithOr.length + 2 + suffix.length; // 2 for parens
      
      if (projectedLength > MAX_QUERY_LENGTH && currentTerms.length > 0) {
        // Flush current batch
        queries.push(`${prefix}(${currentTerms.join(' OR ')})${suffix}`);
        currentTerms = [term];
        currentLength = term.length;
      } else {
        currentTerms.push(term);
        currentLength += termWithOr.length;
      }
    }
    
    // Flush remaining
    if (currentTerms.length > 0) {
      queries.push(`${prefix}(${currentTerms.join(' OR ')})${suffix}`);
    }
  };
  
  // Process each type separately if we have too many terms
  if (keywords.length > 0) {
    createBatchedQueries(keywords);
  }
  if (hashtags.length > 0) {
    createBatchedQueries(hashtags);
  }
  if (users.length > 0) {
    createBatchedQueries(users);
  }
  
  return queries;
};

/**
 * Legacy single query builder (returns first query or empty string)
 * @param {Object} rule - Rule object
 * @returns {string} Single search query
 */
const buildSingleSearchQuery = (rule) => {
  const queries = buildSearchQuery(rule);
  return queries.length > 0 ? queries[0] : '';
};

module.exports = {
  generateId,
  generateState,
  sanitizeInput,
  validateTweetContent,
  formatDate,
  isPastDate,
  sleep,
  withRetry,
  rateLimitTracker,
  extractHashtags,
  extractMentions,
  buildSearchQuery,
  buildSingleSearchQuery,
  MAX_QUERY_LENGTH,
};



