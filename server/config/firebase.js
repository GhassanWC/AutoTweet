/**
 * Firebase Firestore Configuration
 * Initializes and exports the Firestore database connection
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
let db;

const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      db = admin.firestore();
      return db;
    }

    // Initialize with service account credentials from environment variables
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();

    // Configure Firestore settings
    db.settings({
      ignoreUndefinedProperties: true,
    });

    logger.info('Firebase Firestore connected successfully');
    return db;
  } catch (error) {
    logger.error('Firebase connection error:', error);
    throw error;
  }
};

const getDb = () => {
  if (!db) {
    return initializeFirebase();
  }
  return db;
};

// Collection references
const collections = {
  USERS: 'users',
  RULES: 'rules',
  TWEETS: 'scheduled_tweets',
  ENGAGEMENT_LOG: 'engagement_log',
  ERROR_LOG: 'error_log',
  BRAND_VOICE: 'brand_voice',
  CONTENT_PILLARS: 'content_pillars',
};

module.exports = {
  initializeFirebase,
  getDb,
  collections,
  admin,
};






