/**
 * User Model for Firebase Firestore
 * Handles user profile data operations
 */

const { getDb, collections } = require('../config/firebase');
const logger = require('../utils/logger');
const { generateId } = require('../utils/helpers');

/**
 * User Schema Definition:
 * {
 *   id: string,                    // Unique user ID
 *   twitterUserId: string,         // Twitter user ID
 *   twitterUsername: string,       // Twitter username/handle
 *   displayName: string,           // Twitter display name
 *   profileImageUrl: string,       // Profile picture URL
 *   accessToken: string,           // OAuth 2.0 access token
 *   refreshToken: string,          // OAuth 2.0 refresh token
 *   tokenExpiresAt: number,        // Token expiration timestamp
 *   settings: {
 *     retweet: boolean,            // Enable auto-retweet
 *     like: boolean,               // Enable auto-like
 *     reply: boolean,              // Enable auto-reply
 *     maxDailyTweets: number,      // Daily tweet limit
 *     maxDailyRetweets: number,    // Daily retweet limit
 *     maxDailyLikes: number,       // Daily like limit
 *     timezone: string             // User's timezone
 *   },
 *   stats: {
 *     totalTweets: number,
 *     totalRetweets: number,
 *     totalLikes: number,
 *     totalReplies: number
 *   },
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

const defaultSettings = {
  retweet: true,
  like: true,
  reply: false,
  maxDailyTweets: 50,
  maxDailyRetweets: 100,
  maxDailyLikes: 200,
  timezone: 'UTC',
};

const defaultStats = {
  totalTweets: 0,
  totalRetweets: 0,
  totalLikes: 0,
  totalReplies: 0,
};

/**
 * Format helper to convert Firestore timestamps to ISO strings
 * @param {Object} data - Raw Firestore data
 * @returns {Object} Formatted data
 */
const formatDateFields = (data) => {
  if (!data) return data;
  
  const result = { ...data };
  const dateFields = ['createdAt', 'updatedAt'];
  
  dateFields.forEach(field => {
    if (result[field] && typeof result[field].toDate === 'function') {
      result[field] = result[field].toDate().toISOString();
    } else if (result[field] instanceof Date) {
      result[field] = result[field].toISOString();
    }
  });
  
  return result;
};

class User {
  /**
   * Create a new user profile
   * @param {Object} userData - User data from Twitter auth
   * @returns {Object} Created user object
   */
  static async create(userData) {
    try {
      const db = getDb();
      const id = generateId();
      const now = new Date();

      const user = {
        id,
        twitterUserId: userData.twitterUserId,
        twitterUsername: userData.twitterUsername,
        displayName: userData.displayName || userData.twitterUsername,
        profileImageUrl: userData.profileImageUrl || '',
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        tokenExpiresAt: userData.tokenExpiresAt,
        settings: { ...defaultSettings, ...userData.settings },
        stats: { ...defaultStats },
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(collections.USERS).doc(id).set(user);
      logger.info(`User created: ${user.twitterUsername} (${id})`);
      
      return formatDateFields(user);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User object or null
   */
  static async findById(id) {
    try {
      const db = getDb();
      const doc = await db.collection(collections.USERS).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return formatDateFields({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by Twitter user ID
   * @param {string} twitterUserId - Twitter user ID
   * @returns {Object|null} User object or null
   */
  static async findByTwitterId(twitterUserId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.USERS)
        .where('twitterUserId', '==', twitterUserId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return formatDateFields({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding user by Twitter ID:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user object
   */
  static async update(id, updateData) {
    try {
      const db = getDb();
      const userRef = db.collection(collections.USERS).doc(id);
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date(),
      };

      await userRef.update(updatePayload);
      
      const updatedDoc = await userRef.get();
      logger.info(`User updated: ${id}`);
      
      return formatDateFields({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update user tokens
   * @param {string} id - User ID
   * @param {Object} tokens - New token data
   * @returns {Object} Updated user object
   */
  static async updateTokens(id, tokens) {
    return this.update(id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt || tokens.expiresAt,
    });
  }

  /**
   * Update user settings
   * @param {string} id - User ID
   * @param {Object} settings - New settings
   * @returns {Object} Updated user object
   */
  static async updateSettings(id, settings) {
    try {
      const db = getDb();
      const userRef = db.collection(collections.USERS).doc(id);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        throw new Error('User not found');
      }

      const currentSettings = doc.data().settings || {};
      const newSettings = { ...currentSettings, ...settings };

      return this.update(id, { settings: newSettings });
    } catch (error) {
      logger.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Increment user stats
   * @param {string} id - User ID
   * @param {string} statField - Stat field to increment
   * @param {number} amount - Amount to increment
   */
  static async incrementStat(id, statField, amount = 1) {
    try {
      const db = getDb();
      const { admin } = require('../config/firebase');
      
      await db.collection(collections.USERS).doc(id).update({
        [`stats.${statField}`]: admin.firestore.FieldValue.increment(amount),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error incrementing user stat:', error);
      throw error;
    }
  }

  /**
   * Get all users (for scheduler)
   * @returns {Array} Array of user objects
   */
  static async findAll() {
    try {
      const db = getDb();
      const snapshot = await db.collection(collections.USERS).get();
      
      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Delete user profile
   * @param {string} id - User ID
   */
  static async delete(id) {
    try {
      const db = getDb();
      await db.collection(collections.USERS).doc(id).delete();
      logger.info(`User deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Check if user's token is expired
   * @param {Object} user - User object
   * @returns {boolean} True if token is expired or about to expire
   */
  static isTokenExpired(user) {
    if (!user.tokenExpiresAt) return true;
    // Consider token expired 5 minutes before actual expiration
    const bufferTime = 5 * 60 * 1000;
    return Date.now() >= (user.tokenExpiresAt - bufferTime);
  }
}

module.exports = User;






