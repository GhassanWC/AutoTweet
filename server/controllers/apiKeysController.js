/**
 * API Keys Controller
 * Allows users to store and manage their own third-party API keys.
 * Keys are stored in Firestore on the user document (apiKeys field).
 * Sensitive values are NEVER returned in full — only masked previews.
 */

const User = require('../models/User');
const logger = require('../utils/logger');

/** Fields that are sensitive and must be masked when returned to the client */
const SENSITIVE_FIELDS = [
  'twitterApiKey',
  'twitterApiSecret',
  'twitterAccessToken',
  'twitterAccessTokenSecret',
  'openaiApiKey',
  'geminiApiKey',
];

/**
 * Mask a secret string, showing only first 4 and last 4 chars.
 * @param {string} value
 * @returns {string}
 */
const mask = (value) => {
  if (!value || value.length < 9) return value ? '••••••••' : '';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
};

/**
 * Build a masked copy of the apiKeys object safe to send to the client.
 */
const maskKeys = (apiKeys = {}) => {
  const masked = {};
  for (const [k, v] of Object.entries(apiKeys)) {
    masked[k] = SENSITIVE_FIELDS.includes(k) ? mask(v) : v;
  }
  return masked;
};

/**
 * GET /api/api-keys
 * Return the current user's API key setup status (masked values).
 */
const getApiKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const apiKeys = user?.apiKeys || {};

    // Determine which services are fully configured
    const twitterConfigured = !!(
      apiKeys.twitterApiKey &&
      apiKeys.twitterApiSecret &&
      apiKeys.twitterAccessToken &&
      apiKeys.twitterAccessTokenSecret
    );
    const openaiConfigured = !!apiKeys.openaiApiKey;
    const geminiConfigured = !!apiKeys.geminiApiKey;
    const setupComplete = twitterConfigured; // Twitter is required

    res.json({
      success: true,
      apiKeys: maskKeys(apiKeys),
      status: {
        twitterConfigured,
        openaiConfigured,
        geminiConfigured,
        setupComplete,
      },
    });
  } catch (error) {
    logger.error('Error getting API keys:', error);
    res.status(500).json({ success: false, error: 'Failed to get API keys' });
  }
};

/**
 * POST /api/api-keys
 * Save (or update) the user's API keys. Only provided keys are updated —
 * existing keys are preserved unless explicitly overwritten.
 * Accepts: twitterApiKey, twitterApiSecret, twitterAccessToken,
 *           twitterAccessTokenSecret, openaiApiKey, geminiApiKey
 */
const saveApiKeys = async (req, res) => {
  try {
    const allowedFields = [
      'twitterApiKey',
      'twitterApiSecret',
      'twitterAccessToken',
      'twitterAccessTokenSecret',
      'openaiApiKey',
      'geminiApiKey',
    ];

    const user = await User.findById(req.user.id);
    const currentKeys = user?.apiKeys || {};

    // Merge — only overwrite keys that were sent in the body
    const updatedKeys = { ...currentKeys };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        updatedKeys[field] = req.body[field].trim();
      }
    }

    await User.update(req.user.id, { apiKeys: updatedKeys });

    const twitterConfigured = !!(
      updatedKeys.twitterApiKey &&
      updatedKeys.twitterApiSecret &&
      updatedKeys.twitterAccessToken &&
      updatedKeys.twitterAccessTokenSecret
    );

    logger.info(`API keys updated for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'API keys saved successfully',
      status: {
        twitterConfigured,
        openaiConfigured: !!updatedKeys.openaiApiKey,
        geminiConfigured: !!updatedKeys.geminiApiKey,
        setupComplete: twitterConfigured,
      },
    });
  } catch (error) {
    logger.error('Error saving API keys:', error);
    res.status(500).json({ success: false, error: 'Failed to save API keys' });
  }
};

/**
 * DELETE /api/api-keys/:field
 * Remove a single API key field.
 */
const deleteApiKey = async (req, res) => {
  try {
    const { field } = req.params;
    const allowed = [
      'twitterApiKey', 'twitterApiSecret', 'twitterAccessToken',
      'twitterAccessTokenSecret', 'openaiApiKey', 'geminiApiKey',
    ];

    if (!allowed.includes(field)) {
      return res.status(400).json({ success: false, error: 'Invalid field' });
    }

    const user = await User.findById(req.user.id);
    const updatedKeys = { ...(user?.apiKeys || {}) };
    delete updatedKeys[field];

    await User.update(req.user.id, { apiKeys: updatedKeys });

    res.json({ success: true, message: `${field} removed` });
  } catch (error) {
    logger.error('Error deleting API key:', error);
    res.status(500).json({ success: false, error: 'Failed to delete key' });
  }
};

/**
 * POST /api/api-keys/test-twitter
 * Verify the stored Twitter OAuth 1.0a credentials by making a real API call.
 * Returns {success, valid, username, error} so the client can show a clear result.
 */
const testTwitterKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const keys = user?.apiKeys || {};

    const appKey       = keys.twitterApiKey            || process.env.TWITTER_API_KEY;
    const appSecret    = keys.twitterApiSecret         || process.env.TWITTER_API_SECRET;
    const accessToken  = keys.twitterAccessToken       || process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = keys.twitterAccessTokenSecret || process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      return res.json({
        success: true,
        valid: false,
        error: 'One or more Twitter OAuth 1.0a credentials are missing. Please fill in all four fields.',
      });
    }

    // Make a real Twitter API call using OAuth 1.0a + v2 endpoint.
    // NOTE: We intentionally use v2.me() instead of v1.verifyCredentials().
    // The v1.1 verify_credentials endpoint is NOT available on the Twitter free tier
    // and always returns error 215 even with valid keys.
    // v2 GET /users/me works with OAuth 1.0a user context on all tiers.
    const { TwitterApi } = require('twitter-api-v2');
    const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });

    try {
      const { data: me } = await client.v2.me({ 'user.fields': ['username'] });
      return res.json({
        success: true,
        valid: true,
        username: me.username,
        message: `✓ Connected as @${me.username}`,
      });
    } catch (twitterErr) {
      const status = twitterErr?.code || twitterErr?.status || '?';
      const apiErrors = twitterErr?.data?.errors || twitterErr?.data?.detail;
      const msg = (Array.isArray(apiErrors) ? apiErrors[0]?.message : apiErrors)
        || twitterErr.message
        || 'Unknown Twitter error';
      logger.warn(`Twitter key test failed for user ${req.user.id}: [${status}] ${msg}`);
      return res.json({
        success: true,
        valid: false,
        code: status,
        error: `Twitter error ${status}: ${msg}`,
        hint: status === 401 || status === 403
          ? 'Your Access Token or Consumer Keys are incorrect, or the app permissions are set to Read-only. Change to Read+Write in the Developer Portal and regenerate your Access Token.'
          : status === 453
          ? 'Your Twitter app does not have at least a Basic plan. Upgrade at developer.twitter.com.'
          : 'Double-check all four keys in the Twitter Developer Portal → Your App → Keys and Tokens.',
      });
    }
  } catch (err) {
    logger.error('Test Twitter keys error:', err);
    res.status(500).json({ success: false, error: 'Server error while testing credentials' });
  }
};

module.exports = { getApiKeys, saveApiKeys, deleteApiKey, testTwitterKeys };
