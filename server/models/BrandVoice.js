/**
 * BrandVoice Model for Firebase Firestore
 * Stores a user's brand voice configuration — one per user.
 */

const { getDb, collections } = require('../config/firebase');
const logger = require('../utils/logger');
const { sanitizeInput } = require('../utils/helpers');

class BrandVoice {
  static async findByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.BRAND_VOICE)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error('Error finding brand voice:', error);
      throw error;
    }
  }

  static async upsert(userId, data) {
    try {
      const db = getDb();
      const existing = await this.findByUserId(userId);
      const now = new Date();

      const voiceData = {
        userId,
        // Account identity fields
        accountRole: sanitizeInput(data.accountRole || ''),
        accountGoals: sanitizeInput(data.accountGoals || ''),
        growthStage: data.growthStage || 'early', // 'early', 'growing', 'established'
        postingStyle: sanitizeInput(data.postingStyle || ''),
        platformNotes: sanitizeInput(data.platformNotes || ''),
        // Original voice fields
        niche: sanitizeInput(data.niche || ''),
        audience: sanitizeInput(data.audience || ''),
        tone: sanitizeInput(data.tone || ''),
        personality: sanitizeInput(data.personality || ''),
        avoidTopics: sanitizeInput(data.avoidTopics || ''),
        aiRequirements: sanitizeInput(data.aiRequirements || ''),
        examplePosts: (data.examplePosts || [])
          .map(p => sanitizeInput(p))
          .filter(p => p.length > 0)
          .slice(0, 5),
        updatedAt: now,
      };

      if (existing) {
        await db.collection(collections.BRAND_VOICE).doc(existing.id).update(voiceData);
        logger.info(`Brand voice updated for user ${userId}`);
        return { id: existing.id, ...voiceData, createdAt: existing.createdAt };
      } else {
        voiceData.createdAt = now;
        const ref = await db.collection(collections.BRAND_VOICE).add(voiceData);
        logger.info(`Brand voice created for user ${userId}`);
        return { id: ref.id, ...voiceData };
      }
    } catch (error) {
      logger.error('Error upserting brand voice:', error);
      throw error;
    }
  }

  static async delete(userId) {
    try {
      const db = getDb();
      const existing = await this.findByUserId(userId);
      if (existing) {
        await db.collection(collections.BRAND_VOICE).doc(existing.id).delete();
        logger.info(`Brand voice deleted for user ${userId}`);
      }
    } catch (error) {
      logger.error('Error deleting brand voice:', error);
      throw error;
    }
  }
}

module.exports = BrandVoice;
