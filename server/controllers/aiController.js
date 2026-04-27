/**
 * AI Controller
 * Handles AI content generation endpoints.
 * Uses per-user API keys stored in Firestore (set up on /setup page),
 * falling back to server-level env vars.
 */

const openaiService = require('../services/openaiService');
const geminiService = require('../services/geminiService');
const BrandVoice = require('../models/BrandVoice');
const ContentPillar = require('../models/ContentPillar');
const logger = require('../utils/logger');

/** Resolve the OpenAI key to use: user key first, then env var */
const resolveOpenAIKey = (user) =>
  user?.apiKeys?.openaiApiKey || process.env.OPENAI_API_KEY || '';

/** Resolve the Gemini key to use: user key first, then env var */
const resolveGeminiKey = (user) =>
  user?.apiKeys?.geminiApiKey || process.env.GEMINI_API_KEY || '';

/**
 * GET /api/ai/status
 * Returns which AI providers are available for this user.
 */
const getStatus = async (req, res) => {
  const openaiKey = resolveOpenAIKey(req.user);
  const geminiKey = resolveGeminiKey(req.user);
  res.json({
    success: true,
    openaiConfigured: !!openaiKey,
    geminiConfigured: !!geminiKey,
    styles: openaiService.POST_STYLES,
  });
};

/**
 * POST /api/ai/generate
 * Generate a single post
 */
const generatePost = async (req, res) => {
  try {
    const openaiKey = resolveOpenAIKey(req.user);
    if (!openaiKey) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key is not configured. Add it in Settings → API Keys.',
      });
    }

    const { style, topic, additionalContext, trendContext, requirements } = req.body;

    const [brandVoice, pillars] = await Promise.all([
      BrandVoice.findByUserId(req.userId),
      ContentPillar.findByUserId(req.userId),
    ]);

    const activePillars = pillars.filter(p => p.isActive);

    const result = await openaiService.generatePost({
      apiKey: openaiKey,
      brandVoice,
      pillars: activePillars,
      style, topic, additionalContext, trendContext, requirements,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('AI generate post error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/ai/variations
 * Generate multiple post variations
 */
const generateVariations = async (req, res) => {
  try {
    const openaiKey = resolveOpenAIKey(req.user);
    if (!openaiKey) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key is not configured. Add it in Settings → API Keys.',
      });
    }

    const { style, topic, count, trendContext, requirements } = req.body;

    const [brandVoice, pillars] = await Promise.all([
      BrandVoice.findByUserId(req.userId),
      ContentPillar.findByUserId(req.userId),
    ]);

    const activePillars = pillars.filter(p => p.isActive);

    const result = await openaiService.generateVariations({
      apiKey: openaiKey,
      brandVoice,
      pillars: activePillars,
      style, topic,
      count: Math.min(count || 3, 5),
      trendContext, requirements,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('AI generate variations error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/ai/thread
 * Generate a thread
 */
const generateThread = async (req, res) => {
  try {
    const openaiKey = resolveOpenAIKey(req.user);
    if (!openaiKey) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key is not configured. Add it in Settings → API Keys.',
      });
    }

    const { topic, threadLength, additionalContext, trendContext, requirements } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required for thread generation' });
    }

    const [brandVoice, pillars] = await Promise.all([
      BrandVoice.findByUserId(req.userId),
      ContentPillar.findByUserId(req.userId),
    ]);

    const activePillars = pillars.filter(p => p.isActive);

    const result = await openaiService.generateThread({
      apiKey: openaiKey,
      brandVoice,
      pillars: activePillars,
      topic,
      threadLength: Math.min(threadLength || 5, 10),
      additionalContext, trendContext, requirements,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('AI generate thread error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/ai/ideas
 * Generate content ideas
 */
const generateIdeas = async (req, res) => {
  try {
    const openaiKey = resolveOpenAIKey(req.user);
    if (!openaiKey) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key is not configured. Add it in Settings → API Keys.',
      });
    }

    const { count, trendContext, requirements } = req.body;

    const [brandVoice, pillars] = await Promise.all([
      BrandVoice.findByUserId(req.userId),
      ContentPillar.findByUserId(req.userId),
    ]);

    const activePillars = pillars.filter(p => p.isActive);

    const result = await openaiService.generateIdeas({
      apiKey: openaiKey,
      brandVoice,
      pillars: activePillars,
      count: Math.min(count || 5, 10),
      trendContext, requirements,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('AI generate ideas error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/ai/generate-prompt
 * Generate an image prompt based on tweet content
 */
const generatePrompt = async (req, res) => {
  try {
    const { content, provider = 'openai' } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Tweet content is required' });
    }

    const [brandVoice, pillars] = await Promise.all([
      BrandVoice.findByUserId(req.userId),
      ContentPillar.findByUserId(req.userId),
    ]);

    const activePillars = pillars.filter(p => p.isActive);
    const niche = brandVoice?.niche || (activePillars.length > 0 ? activePillars[0].name : '');

    const geminiKey = resolveGeminiKey(req.user);
    const openaiKey = resolveOpenAIKey(req.user);

    let prompt = '';
    if (provider === 'gemini' && geminiKey) {
      prompt = await geminiService.generateImagePrompt({ apiKey: geminiKey, tweetContent: content, brandVoice, niche });
    } else if (openaiKey) {
      prompt = await openaiService.generateImagePrompt({ apiKey: openaiKey, tweetContent: content, brandVoice, niche });
    } else {
      return res.status(503).json({ success: false, error: 'No AI API key configured. Add one in Settings → API Keys.' });
    }

    res.json({ success: true, prompt });
  } catch (error) {
    logger.error('AI generate prompt error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/ai/generate-image
 * Generate an image using specified provider
 */
const generateImage = async (req, res) => {
  try {
    const { prompt, provider = 'openai' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    let result;
    if (provider === 'gemini') {
      const geminiKey = resolveGeminiKey(req.user);
      if (!geminiKey) {
        return res.status(503).json({ success: false, error: 'Gemini API key is not configured. Add it in Settings → API Keys.' });
      }
      result = await geminiService.generateImage(prompt, { apiKey: geminiKey });
    } else {
      const openaiKey = resolveOpenAIKey(req.user);
      if (!openaiKey) {
        return res.status(503).json({ success: false, error: 'OpenAI API key is not configured. Add it in Settings → API Keys.' });
      }
      result = await openaiService.generateImage(prompt, { apiKey: openaiKey });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('AI generate image error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getStatus,
  generatePost,
  generateVariations,
  generateThread,
  generateIdeas,
  generatePrompt,
  generateImage,
};
