/**
 * Rule Model for Firebase Firestore
 * Handles automation rule data operations
 */

const { getDb, collections } = require('../config/firebase');
const logger = require('../utils/logger');
const { generateId, sanitizeInput } = require('../utils/helpers');

/**
 * Rule Schema Definition:
 * {
 *   id: string,                    // Unique rule ID
 *   userId: string,                // Owner user ID
 *   name: string,                  // Rule name for display
 *   description: string,           // Rule description
 *   keywords: string[],            // Keywords to match
 *   hashtags: string[],            // Hashtags to match
 *   users: string[],               // Users to follow/monitor
 *   engagement: {
 *     like: boolean,               // Auto-like matching tweets
 *     retweet: boolean,            // Auto-retweet matching tweets
 *     reply: boolean,              // Auto-reply to matching tweets
 *     replyTemplates: string[]     // Templates for auto-replies
 *   },
 *   filters: {
 *     minFollowers: number,        // Minimum follower count
 *     minLikes: number,            // Minimum likes on tweet
 *     excludeReplies: boolean,     // Exclude reply tweets
 *     language: string             // Filter by language
 *   },
 *   limits: {
 *     maxPerDay: number,           // Max actions per day
 *     maxPerHour: number           // Max actions per hour
 *   },
 *   isActive: boolean,             // Rule enabled/disabled
 *   lastExecutedAt: timestamp,     // Last execution time
 *   executionCount: number,        // Total execution count
 *   createdAt: timestamp,
 *   updatedAt: timestamp
 * }
 */

const defaultEngagement = {
  like: true,
  retweet: false,
  reply: false,
  replyTemplates: [],
};

const defaultFilters = {
  minFollowers: 0,
  minLikes: 0,
  excludeReplies: true,
  language: null,
};

const defaultLimits = {
  maxPerDay: 50,
  maxPerHour: 10,
};

/**
 * Format helper to convert Firestore timestamps to ISO strings
 * @param {Object} data - Raw Firestore data
 * @returns {Object} Formatted data
 */
const formatDateFields = (data) => {
  if (!data) return data;
  
  const result = { ...data };
  const dateFields = ['createdAt', 'updatedAt', 'lastExecutedAt'];
  
  dateFields.forEach(field => {
    if (result[field] && typeof result[field].toDate === 'function') {
      result[field] = result[field].toDate().toISOString();
    } else if (result[field] instanceof Date) {
      result[field] = result[field].toISOString();
    }
  });
  
  return result;
};

class Rule {
  /**
   * Create a new rule
   * @param {Object} ruleData - Rule data
   * @returns {Object} Created rule object
   */
  static async create(ruleData) {
    try {
      const db = getDb();
      const id = generateId();
      const now = new Date();

      // Sanitize arrays
      const keywords = (ruleData.keywords || []).map(k => sanitizeInput(k).toLowerCase());
      const hashtags = (ruleData.hashtags || []).map(h => {
        const tag = sanitizeInput(h).toLowerCase();
        return tag.startsWith('#') ? tag : `#${tag}`;
      });
      const users = (ruleData.users || []).map(u => {
        const user = sanitizeInput(u).toLowerCase();
        return user.startsWith('@') ? user.slice(1) : user;
      });

      const rule = {
        id,
        userId: ruleData.userId,
        name: sanitizeInput(ruleData.name) || 'Unnamed Rule',
        description: sanitizeInput(ruleData.description) || '',
        keywords,
        hashtags,
        users,
        engagement: { ...defaultEngagement, ...ruleData.engagement },
        filters: { ...defaultFilters, ...ruleData.filters },
        limits: { ...defaultLimits, ...ruleData.limits },
        isActive: ruleData.isActive !== false,
        lastExecutedAt: null,
        executionCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(collections.RULES).doc(id).set(rule);
      logger.info(`Rule created: ${rule.name} (${id}) for user ${ruleData.userId}`);
      
      return formatDateFields(rule);
    } catch (error) {
      logger.error('Error creating rule:', error);
      throw error;
    }
  }

  /**
   * Find rule by ID
   * @param {string} id - Rule ID
   * @returns {Object|null} Rule object or null
   */
  static async findById(id) {
    try {
      const db = getDb();
      const doc = await db.collection(collections.RULES).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return formatDateFields({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding rule by ID:', error);
      throw error;
    }
  }

  /**
   * Find all rules for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of rule objects
   */
  static async findByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.RULES)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding rules by user ID:', error);
      throw error;
    }
  }

  /**
   * Find all active rules
   * @returns {Array} Array of active rule objects
   */
  static async findActive() {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.RULES)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding active rules:', error);
      throw error;
    }
  }

  /**
   * Find active rules for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of active rule objects
   */
  static async findActiveByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.RULES)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => formatDateFields({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding active rules by user ID:', error);
      throw error;
    }
  }

  /**
   * Update a rule
   * @param {string} id - Rule ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated rule object
   */
  static async update(id, updateData) {
    try {
      const db = getDb();
      const ruleRef = db.collection(collections.RULES).doc(id);
      
      // Sanitize arrays if provided
      const sanitizedUpdate = { ...updateData };
      
      if (updateData.keywords) {
        sanitizedUpdate.keywords = updateData.keywords.map(k => sanitizeInput(k).toLowerCase());
      }
      if (updateData.hashtags) {
        sanitizedUpdate.hashtags = updateData.hashtags.map(h => {
          const tag = sanitizeInput(h).toLowerCase();
          return tag.startsWith('#') ? tag : `#${tag}`;
        });
      }
      if (updateData.users) {
        sanitizedUpdate.users = updateData.users.map(u => {
          const user = sanitizeInput(u).toLowerCase();
          return user.startsWith('@') ? user.slice(1) : user;
        });
      }
      if (updateData.name) {
        sanitizedUpdate.name = sanitizeInput(updateData.name);
      }
      if (updateData.description) {
        sanitizedUpdate.description = sanitizeInput(updateData.description);
      }

      sanitizedUpdate.updatedAt = new Date();

      await ruleRef.update(sanitizedUpdate);
      
      const updatedDoc = await ruleRef.get();
      logger.info(`Rule updated: ${id}`);
      
      return formatDateFields({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error('Error updating rule:', error);
      throw error;
    }
  }

  /**
   * Toggle rule active status
   * @param {string} id - Rule ID
   * @returns {Object} Updated rule object
   */
  static async toggleActive(id) {
    try {
      const rule = await this.findById(id);
      if (!rule) {
        throw new Error('Rule not found');
      }

      return this.update(id, { isActive: !rule.isActive });
    } catch (error) {
      logger.error('Error toggling rule active status:', error);
      throw error;
    }
  }

  /**
   * Update rule execution timestamp
   * @param {string} id - Rule ID
   */
  static async markExecuted(id) {
    try {
      const db = getDb();
      const { admin } = require('../config/firebase');
      
      await db.collection(collections.RULES).doc(id).update({
        lastExecutedAt: new Date(),
        executionCount: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error marking rule as executed:', error);
      throw error;
    }
  }

  /**
   * Delete a rule
   * @param {string} id - Rule ID
   */
  static async delete(id) {
    try {
      const db = getDb();
      await db.collection(collections.RULES).doc(id).delete();
      logger.info(`Rule deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting rule:', error);
      throw error;
    }
  }

  /**
   * Delete all rules for a user
   * @param {string} userId - User ID
   */
  static async deleteByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.RULES)
        .where('userId', '==', userId)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`All rules deleted for user: ${userId}`);
    } catch (error) {
      logger.error('Error deleting rules by user ID:', error);
      throw error;
    }
  }

  /**
   * Validate rule data
   * @param {Object} ruleData - Rule data to validate
   * @returns {Object} Validation result
   */
  static validate(ruleData) {
    const errors = [];

    if (!ruleData.userId) {
      errors.push('User ID is required');
    }

    if (!ruleData.name || ruleData.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    const hasTargets = 
      (ruleData.keywords && ruleData.keywords.length > 0) ||
      (ruleData.hashtags && ruleData.hashtags.length > 0) ||
      (ruleData.users && ruleData.users.length > 0);

    if (!hasTargets) {
      errors.push('At least one keyword, hashtag, or user is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Rule;






