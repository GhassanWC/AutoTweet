/**
 * Brand Voice Controller
 */

const BrandVoice = require('../models/BrandVoice');
const logger = require('../utils/logger');

const get = async (req, res) => {
  try {
    const voice = await BrandVoice.findByUserId(req.userId);
    res.json({ success: true, brandVoice: voice });
  } catch (error) {
    logger.error('Get brand voice error:', error);
    res.status(500).json({ success: false, error: 'Failed to load brand voice' });
  }
};

const save = async (req, res) => {
  try {
    const voice = await BrandVoice.upsert(req.userId, req.body);
    res.json({ success: true, brandVoice: voice });
  } catch (error) {
    logger.error('Save brand voice error:', error);
    res.status(500).json({ success: false, error: 'Failed to save brand voice' });
  }
};

module.exports = { get, save };
