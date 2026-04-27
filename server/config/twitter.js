/**
 * Twitter API v2 Configuration
 * Handles Twitter client initialization and OAuth settings
 */

const { TwitterApi } = require('twitter-api-v2');
const logger = require('../utils/logger');

// OAuth 2.0 scopes required for the application
const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'follows.read',
  'follows.write',
  'like.read',
  'like.write',
  'offline.access',
];

/**
 * Create a Twitter client for OAuth 2.0 authorization flow
 * @returns {TwitterApi} Twitter API client for auth
 */
const createAuthClient = () => {
  return new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });
};

/**
 * Create a Twitter client with user access token
 * @param {string} accessToken - User's OAuth 2.0 access token
 * @returns {TwitterApi} Authenticated Twitter API client
 */
const createUserClient = (accessToken) => {
  return new TwitterApi(accessToken);
};

/**
 * Create an OAuth 1.0a client using app-level consumer credentials.
 * This is required for v1.1 endpoints such as media/upload.
 *
 * Requires in .env:
 *   TWITTER_API_KEY          (Consumer key / API key)
 *   TWITTER_API_SECRET       (Consumer secret / API key secret)
 *   TWITTER_ACCESS_TOKEN     (Access token for the app owner's account — only needed
 *                             as a fallback; per-user tokens are preferred)
 *   TWITTER_ACCESS_TOKEN_SECRET
 *
 * If the user object has oauth1AccessToken + oauth1AccessTokenSecret stored
 * (populated during the OAuth 1.0a upgrade flow), those are used instead so
 * media is uploaded on behalf of that specific user.
 *
 * @param {Object} user - AutoTweet user object (optional, for user-context uploads)
 * @returns {TwitterApi} OAuth 1.0a authenticated client
 */
const createAppOAuth1Client = (user = null) => {
  // Prefer user's own keys stored in Firestore; fall back to server env vars
  const appKey    = user?.apiKeys?.twitterApiKey    || process.env.TWITTER_API_KEY;
  const appSecret = user?.apiKeys?.twitterApiSecret || process.env.TWITTER_API_SECRET;
  const accessToken  = user?.apiKeys?.twitterAccessToken        || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = user?.apiKeys?.twitterAccessTokenSecret  || process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret) {
    throw new Error(
      'Twitter API Key and Secret are required for media upload. ' +
      'Please configure them in Settings → API Keys Setup.'
    );
  }

  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
};

/**
 * Generate OAuth 2.0 authorization URL
 * @param {string} state - CSRF protection state parameter
 * @returns {Object} Authorization URL and code verifier
 */
const generateAuthLink = (state) => {
  const client = createAuthClient();
  
  const { url, codeVerifier } = client.generateOAuth2AuthLink(
    process.env.TWITTER_CALLBACK_URL,
    {
      scope: SCOPES,
      state,
    }
  );

  return { url, codeVerifier };
};

/**
 * Exchange authorization code for access tokens
 * @param {string} code - Authorization code from callback
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Object} Access token, refresh token, and expiration
 */
const getAccessToken = async (code, codeVerifier) => {
  try {
    const client = createAuthClient();
    
    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.TWITTER_CALLBACK_URL,
    });

    logger.info('Successfully obtained Twitter access token');
    
    return {
      accessToken,
      refreshToken,
      expiresIn,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  } catch (error) {
    logger.error('Error obtaining Twitter access token:', error);
    throw error;
  }
};

/**
 * Refresh an expired access token
 * @param {string} refreshToken - OAuth 2.0 refresh token
 * @returns {Object} New access token and refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const client = createAuthClient();
    
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } = 
      await client.refreshOAuth2Token(refreshToken);

    logger.info('Successfully refreshed Twitter access token');
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  } catch (error) {
    logger.error('Error refreshing Twitter access token:', error);
    throw error;
  }
};

module.exports = {
  createAuthClient,
  createUserClient,
  createAppOAuth1Client,
  generateAuthLink,
  getAccessToken,
  refreshAccessToken,
  SCOPES,
};






