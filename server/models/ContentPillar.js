/**
 * ContentPillar Model for Firebase Firestore
 * Stores a user's content pillars (themes their content revolves around).
 */

const { getDb, collections } = require('../config/firebase');
const logger = require('../utils/logger');
const { generateId, sanitizeInput } = require('../utils/helpers');

class ContentPillar {
  static async create(data) {
    try {
      const db = getDb();
      const id = generateId();
      const now = new Date();

      const pillar = {
        id,
        userId: data.userId,
        name: sanitizeInput(data.name || ''),
        description: sanitizeInput(data.description || ''),
        color: data.color || '#818cf8',
        isActive: true,
        postCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(collections.CONTENT_PILLARS).doc(id).set(pillar);
      logger.info(`Content pillar created: ${pillar.name} for user ${data.userId}`);
      return pillar;
    } catch (error) {
      logger.error('Error creating content pillar:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.CONTENT_PILLARS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding content pillars:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const db = getDb();
      const doc = await db.collection(collections.CONTENT_PILLARS).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error('Error finding content pillar:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const db = getDb();
      const updateData = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = sanitizeInput(data.name);
      if (data.description !== undefined) updateData.description = sanitizeInput(data.description);
      if (data.color !== undefined) updateData.color = data.color;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await db.collection(collections.CONTENT_PILLARS).doc(id).update(updateData);
      const updated = await db.collection(collections.CONTENT_PILLARS).doc(id).get();
      logger.info(`Content pillar updated: ${id}`);
      return { id: updated.id, ...updated.data() };
    } catch (error) {
      logger.error('Error updating content pillar:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const db = getDb();
      await db.collection(collections.CONTENT_PILLARS).doc(id).delete();
      logger.info(`Content pillar deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting content pillar:', error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(collections.CONTENT_PILLARS)
        .where('userId', '==', userId)
        .get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      logger.info(`All content pillars deleted for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting content pillars:', error);
      throw error;
    }
  }
}

module.exports = ContentPillar;
