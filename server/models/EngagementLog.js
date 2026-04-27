/**
 * Engagement Log Model for Firebase Firestore
 * Tracks all automated engagement actions to prevent duplicates
 */

const { getDb, collections } = require('../config/firebase');
const logger = require('../utils/logger');
const { generateId } = require('../utils/helpers');

/**
 * Engagement Log Schema Definition:
 * {
 *   id: string,                    // Unique log ID
 *   userId: string,                // User who performed the action
 *   ruleId: string,                // Rule that triggered the action
 *   tweetId: string,               // Twitter tweet ID engaged with
 *   action: string,                // like, retweet, reply
 *   success: boolean,              // Whether action succeeded
 *   error: string,                 // Error message if failed
 *   replyContent: string,          // Reply content if applicable
 *   createdAt: timestamp
 * }
 */

const ENGAGEMENT_ACTION = {
  LIKE: 'like',
  RETWEET: 'retweet',
  REPLY: 'reply',
};

class EngagementLog {
  /**
   * Log an engagement action
   * @param {Object} logData - Log data
   * @returns {Object} Created log object
   */
  static async create(logData) {
    try {
      const db = getDb();
      const id = generateId();
      const now = new Date();

      const log = {
        id,
        userId: logData.userId,
        ruleId: logData.ruleId || null,
        tweetId: logData.tweetId,
        action: logData.action,
        success: logData.success !== false,
        error: logData.error || null,
        replyContent: logData.replyContent || null,
        createdAt: now,
      };

      await db.collection(collections.ENGAGEMENT_LOG).doc(id).set(log);
      
      return log;
    } catch (error) {
      logger.error('Error creating engagement log:', error);
      throw error;
    }
  }

  /**
   * Check if a tweet has already been engaged with
   * @param {string} userId - User ID
   * @param {string} tweetId - Tweet ID
   * @param {string} action - Action type
   * @returns {boolean} True if already engaged
   */
  static async hasEngaged(userId, tweetId, action) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.ENGAGEMENT_LOG)
        .where('userId', '==', userId)
        .where('tweetId', '==', tweetId)
        .where('action', '==', action)
        .where('success', '==', true)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      logger.error('Error checking engagement:', error);
      throw error;
    }
  }

  /**
   * Get engagement count for a user within a time period
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {Date} since - Start time
   * @returns {number} Count of engagements
   */
  static async getCount(userId, action, since) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.ENGAGEMENT_LOG)
        .where('userId', '==', userId)
        .where('action', '==', action)
        .where('success', '==', true)
        .where('createdAt', '>=', since)
        .get();

      return snapshot.size;
    } catch (error) {
      logger.error('Error getting engagement count:', error);
      throw error;
    }
  }

  /**
   * Get daily engagement count
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @returns {number} Today's engagement count
   */
  static async getDailyCount(userId, action) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.getCount(userId, action, startOfDay);
  }

  /**
   * Get hourly engagement count
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @returns {number} This hour's engagement count
   */
  static async getHourlyCount(userId, action) {
    const startOfHour = new Date();
    startOfHour.setMinutes(0, 0, 0);
    return this.getCount(userId, action, startOfHour);
  }

  /**
   * Get engagement logs for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Array of log objects
   */
  static async findByUserId(userId, options = {}) {
    try {
      const db = getDb();
      let query = db
        .collection(collections.ENGAGEMENT_LOG)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');

      if (options.action) {
        query = query.where('action', '==', options.action);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding engagement logs:', error);
      throw error;
    }
  }

  /**
   * Get engagement statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Statistics object
   */
  static async getStats(userId) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [todayLikes, todayRetweets, todayReplies, totalLikes, totalRetweets, totalReplies] = 
        await Promise.all([
          this.getDailyCount(userId, ENGAGEMENT_ACTION.LIKE),
          this.getDailyCount(userId, ENGAGEMENT_ACTION.RETWEET),
          this.getDailyCount(userId, ENGAGEMENT_ACTION.REPLY),
          this.getTotalCount(userId, ENGAGEMENT_ACTION.LIKE),
          this.getTotalCount(userId, ENGAGEMENT_ACTION.RETWEET),
          this.getTotalCount(userId, ENGAGEMENT_ACTION.REPLY),
        ]);

      return {
        today: {
          likes: todayLikes,
          retweets: todayRetweets,
          replies: todayReplies,
        },
        total: {
          likes: totalLikes,
          retweets: totalRetweets,
          replies: totalReplies,
        },
      };
    } catch (error) {
      logger.error('Error getting engagement stats:', error);
      throw error;
    }
  }

  /**
   * Get total engagement count for a user
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @returns {number} Total count
   */
  static async getTotalCount(userId, action) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.ENGAGEMENT_LOG)
        .where('userId', '==', userId)
        .where('action', '==', action)
        .where('success', '==', true)
        .get();

      return snapshot.size;
    } catch (error) {
      logger.error('Error getting total engagement count:', error);
      throw error;
    }
  }

  /**
   * Clean up old logs (retention: 30 days)
   */
  static async cleanup() {
    try {
      const db = getDb();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshot = await db
        .collection(collections.ENGAGEMENT_LOG)
        .where('createdAt', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Cleaned up ${snapshot.size} old engagement logs`);
      
      return snapshot.size;
    } catch (error) {
      logger.error('Error cleaning up engagement logs:', error);
      throw error;
    }
  }
}

// Export action constants
EngagementLog.ACTION = ENGAGEMENT_ACTION;

module.exports = EngagementLog;






