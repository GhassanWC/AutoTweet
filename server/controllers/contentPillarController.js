/**
 * Content Pillar Controller
 */

const ContentPillar = require('../models/ContentPillar');
const logger = require('../utils/logger');

const getAll = async (req, res) => {
  try {
    const pillars = await ContentPillar.findByUserId(req.userId);
    res.json({ success: true, pillars });
  } catch (error) {
    logger.error('Get pillars error:', error);
    res.status(500).json({ success: false, error: 'Failed to load content pillars' });
  }
};

const create = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Pillar name is required' });
    }
    const pillar = await ContentPillar.create({
      userId: req.userId, name, description, color,
    });
    res.json({ success: true, pillar });
  } catch (error) {
    logger.error('Create pillar error:', error);
    res.status(500).json({ success: false, error: 'Failed to create content pillar' });
  }
};

const update = async (req, res) => {
  try {
    const pillar = await ContentPillar.findById(req.params.id);
    if (!pillar || pillar.userId !== req.userId) {
      return res.status(404).json({ success: false, error: 'Pillar not found' });
    }
    const updated = await ContentPillar.update(req.params.id, req.body);
    res.json({ success: true, pillar: updated });
  } catch (error) {
    logger.error('Update pillar error:', error);
    res.status(500).json({ success: false, error: 'Failed to update content pillar' });
  }
};

const remove = async (req, res) => {
  try {
    const pillar = await ContentPillar.findById(req.params.id);
    if (!pillar || pillar.userId !== req.userId) {
      return res.status(404).json({ success: false, error: 'Pillar not found' });
    }
    await ContentPillar.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete pillar error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete content pillar' });
  }
};

module.exports = { getAll, create, update, remove };
