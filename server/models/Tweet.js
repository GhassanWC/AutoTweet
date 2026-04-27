/**
 * Tweet Model for Firebase Firestore
 * Handles scheduled tweet data operations
 */

const { getDb, collections } = require('../config/firebase');
const logger = require('../utils/logger');
const { generateId, sanitizeInput, validateTweetContent } = require('../utils/helpers');

/**
 * Tweet Schema Definition:
 * {
 *   id: string,                    // Unique tweet ID
 *   userId: string,                // Owner user ID
 *   content: string,               // Tweet content (max 280 chars)
 *   scheduledTime: timestamp,      // When to post the tweet
 *   status: string,                // pending, sent, failed, cancelled
 *   tweetId: string,               // Twitter's tweet ID (after posting)
 *   error: string,                 // Error message if failed
 *   retryCount: number,            // Number of retry attempts
 *   media: {                       // Attached media resource
 *     url: string,                 // Image URL
 *     type: string,                // image, video
 *     provider: string,            // openai, gemini, upload, url
 *     prompt: string,              // AI generation prompt
 *     alt: string                  // Accessibility text
 *   },
 *   replyToTweetId: string,        // If replying to another tweet
 *   threadPreviousId: string,      // Previous tweet in thread
 *   metrics: {
 *     likes: number,
 *     retweets: number,
 *     replies: number,
 *     impressions: number
 *   },
 *   createdAt: timestamp,
 *   updatedAt: timestamp,
 *   sentAt: timestamp
 * }
 */

const TWEET_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  DRAFT: 'draft',
};

/**
 * Format helper to convert Firestore timestamps to ISO strings
 * @param {Object} data - Raw Firestore data
 * @returns {Object} Formatted data
 */
const formatDateFields = (data) => {
  if (!data) return data;
  
  const result = { ...data };
  const dateFields = ['scheduledTime', 'createdAt', 'updatedAt', 'sentAt'];
  
  dateFields.forEach(field => {
    if (result[field] && typeof result[field].toDate === 'function') {
      result[field] = result[field].toDate().toISOString();
    } else if (result[field] instanceof Date) {
      result[field] = result[field].toISOString();
    }
  });
  
  return result;
};

class Tweet {
  /**
   * Create a new scheduled tweet
   * @param {Object} tweetData - Tweet data
   * @returns {Object} Created tweet object
   */
  static async create(tweetData) {
    try {
      // Validate tweet content
      const validation = validateTweetContent(tweetData.content);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const db = getDb();
      const id = generateId();
      const now = new Date();

      const tweet = {
        id,
        userId: tweetData.userId,
        content: validation.content,
        scheduledTime: tweetData.scheduledTime ? new Date(tweetData.scheduledTime) : null,
        status: tweetData.status || TWEET_STATUS.PENDING,
        tweetId: null,
        error: null,
        retryCount: 0,
        media: tweetData.media || null,
        replyToTweetId: tweetData.replyToTweetId || null,
        threadPreviousId: tweetData.threadPreviousId || null,
        metrics: {
          likes: 0,
          retweets: 0,
          replies: 0,
          impressions: 0,
        },
        createdAt: now,
        updatedAt: now,
        sentAt: null,
      };

      await db.collection(collections.TWEETS).doc(id).set(tweet);
      logger.info(`Scheduled tweet created: ${id} for ${tweetData.scheduledTime}`);
      
      return formatDateFields(tweet);
    } catch (error) {
      logger.error('Error creating scheduled tweet:', error);
      throw error;
    }
  }

  /**
   * Create multiple tweets (thread)
   * @param {string} userId - User ID
   * @param {Array} tweets - Array of tweet content with scheduled times
   * @returns {Array} Created tweet objects
   */
  static async createThread(userId, tweets) {
    try {
      const db = getDb();
      const batch = db.batch();
      const createdTweets = [];
      let previousId = null;

      for (const tweetData of tweets) {
        const validation = validateTweetContent(tweetData.content);
        if (!validation.isValid) {
          throw new Error(`Tweet validation failed: ${validation.error}`);
        }

        const id = generateId();
        const now = new Date();

        const tweet = {
          id,
          userId,
          content: validation.content,
          scheduledTime: new Date(tweetData.scheduledTime),
          status: TWEET_STATUS.PENDING,
          tweetId: null,
          error: null,
          retryCount: 0,
          media: tweetData.media || null,
          replyToTweetId: null,
          threadPreviousId: previousId,
          metrics: { likes: 0, retweets: 0, replies: 0, impressions: 0 },
          createdAt: now,
          updatedAt: now,
          sentAt: null,
        };

        batch.set(db.collection(collections.TWEETS).doc(id), tweet);
        createdTweets.push(tweet);
        previousId = id;
      }

      await batch.commit();
      logger.info(`Thread created with ${createdTweets.length} tweets`);
      
      return createdTweets.map(t => formatDateFields(t));
    } catch (error) {
      logger.error('Error creating thread:', error);
      throw error;
    }
  }

  /**
   * Find tweet by ID
   * @param {string} id - Tweet ID
   * @returns {Object|null} Tweet object or null
   */
  static async findById(id) {
    try {
      const db = getDb();
      const doc = await db.collection(collections.TWEETS).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return formatDateFields({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding tweet by ID:', error);
      throw error;
    }
  }

  /**
   * Find all tweets for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options (limit, status)
   * @returns {Array} Array of tweet objects
   */
  static async findByUserId(userId, options = {}) {
    try {
      const db = getDb();
      let query = db.collection(collections.TWEETS).where('userId', '==', userId);

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      query = query.orderBy('scheduledTime', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding tweets by user ID:', error);
      throw error;
    }
  }

  /**
   * Find pending tweets due to be sent
   * @returns {Array} Array of pending tweet objects
   */
  static async findPendingDue() {
    try {
      const db = getDb();
      const now = new Date();
      
      const snapshot = await db
        .collection(collections.TWEETS)
        .where('status', '==', TWEET_STATUS.PENDING)
        .where('scheduledTime', '<=', now)
        .orderBy('scheduledTime', 'asc')
        .get();

      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding pending due tweets:', error);
      throw error;
    }
  }

  /**
   * Find pending tweets for a user (upcoming)
   * @param {string} userId - User ID
   * @returns {Array} Array of pending tweet objects
   */
  static async findPendingByUserId(userId) {
    try {
      const db = getDb();
      
      const snapshot = await db
        .collection(collections.TWEETS)
        .where('userId', '==', userId)
        .where('status', '==', TWEET_STATUS.PENDING)
        .orderBy('scheduledTime', 'asc')
        .get();

      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding pending tweets by user ID:', error);
      throw error;
    }
  }

  /**
   * Update a tweet
   * @param {string} id - Tweet ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated tweet object
   */
  static async update(id, updateData) {
    try {
      const db = getDb();
      const tweetRef = db.collection(collections.TWEETS).doc(id);
      
      // Validate content if being updated
      if (updateData.content) {
        const validation = validateTweetContent(updateData.content);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
        updateData.content = validation.content;
      }

      updateData.updatedAt = new Date();

      await tweetRef.update(updateData);
      
      const updatedDoc = await tweetRef.get();
      logger.info(`Tweet updated: ${id}`);
      
      return formatDateFields({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error('Error updating tweet:', error);
      throw error;
    }
  }

  /**
   * Mark tweet as sent
   * @param {string} id - Tweet ID
   * @param {string} twitterTweetId - Twitter's tweet ID
   * @returns {Object} Updated tweet object
   */
  static async markSent(id, twitterTweetId) {
    return this.update(id, {
      status: TWEET_STATUS.SENT,
      tweetId: twitterTweetId,
      sentAt: new Date(),
      error: null,
    });
  }

  /**
   * Mark tweet as failed
   * @param {string} id - Tweet ID
   * @param {string} errorMessage - Error message
   * @returns {Object} Updated tweet object
   */
  static async markFailed(id, errorMessage) {
    try {
      const tweet = await this.findById(id);
      const retryCount = (tweet?.retryCount || 0) + 1;
      
      return this.update(id, {
        status: retryCount >= 3 ? TWEET_STATUS.FAILED : TWEET_STATUS.PENDING,
        error: errorMessage,
        retryCount,
      });
    } catch (error) {
      logger.error('Error marking tweet as failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled tweet
   * @param {string} id - Tweet ID
   * @returns {Object} Updated tweet object
   */
  static async cancel(id) {
    return this.update(id, {
      status: TWEET_STATUS.CANCELLED,
    });
  }

  /**
   * Update tweet metrics
   * @param {string} id - Tweet ID
   * @param {Object} metrics - New metrics
   * @returns {Object} Updated tweet object
   */
  static async updateMetrics(id, metrics) {
    return this.update(id, { metrics });
  }

  /**
   * Delete a tweet
   * @param {string} id - Tweet ID
   */
  static async delete(id) {
    try {
      const db = getDb();
      await db.collection(collections.TWEETS).doc(id).delete();
      logger.info(`Tweet deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting tweet:', error);
      throw error;
    }
  }

  /**
   * Delete all tweets for a user
   * @param {string} userId - User ID
   */
  static async deleteByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.TWEETS)
        .where('userId', '==', userId)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`All tweets deleted for user: ${userId}`);
    } catch (error) {
      logger.error('Error deleting tweets by user ID:', error);
      throw error;
    }
  }

  /**
   * Get tweet statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Statistics object
   */
  static async getStats(userId) {
    try {
      const db = getDb();
      
      const [pending, sent, failed] = await Promise.all([
        db.collection(collections.TWEETS)
          .where('userId', '==', userId)
          .where('status', '==', TWEET_STATUS.PENDING)
          .get(),
        db.collection(collections.TWEETS)
          .where('userId', '==', userId)
          .where('status', '==', TWEET_STATUS.SENT)
          .get(),
        db.collection(collections.TWEETS)
          .where('userId', '==', userId)
          .where('status', '==', TWEET_STATUS.FAILED)
          .get(),
      ]);

      return {
        pending: pending.size,
        sent: sent.size,
        failed: failed.size,
        total: pending.size + sent.size + failed.size,
      };
    } catch (error) {
      logger.error('Error getting tweet stats:', error);
      throw error;
    }
  }
}

// Export status constants
Tweet.STATUS = TWEET_STATUS;

module.exports = Tweet;






