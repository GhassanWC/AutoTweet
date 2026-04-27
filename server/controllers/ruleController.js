/**
 * Rule Controller
 * Handles CRUD operations for automation rules
 */

const Rule = require('../models/Rule');
const logger = require('../utils/logger');

/**
 * Create a new rule
 * POST /api/rules
 */
const createRule = async (req, res) => {
  try {
    const userId = req.user.id;
    const ruleData = { ...req.body, userId };
    
    // Validate rule data
    const validation = Rule.validate(ruleData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }
    
    const rule = await Rule.create(ruleData);
    
    logger.info(`Rule created: ${rule.id} by user ${userId}`);
    
    res.status(201).json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error('Error creating rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create rule',
    });
  }
};

/**
 * Get all rules for the authenticated user
 * GET /api/rules
 */
const getRules = async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await Rule.findByUserId(userId);
    
    res.json({
      success: true,
      rules,
      count: rules.length,
    });
  } catch (error) {
    logger.error('Error fetching rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rules',
    });
  }
};

/**
 * Get a single rule by ID
 * GET /api/rules/:id
 */
const getRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const rule = await Rule.findById(id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }
    
    // Check ownership
    if (rule.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    res.json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error('Error fetching rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rule',
    });
  }
};

/**
 * Update a rule
 * PUT /api/rules/:id
 */
const updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;
    
    const rule = await Rule.findById(id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }
    
    // Check ownership
    if (rule.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    // Don't allow changing userId
    delete updateData.userId;
    
    const updatedRule = await Rule.update(id, updateData);
    
    logger.info(`Rule updated: ${id}`);
    
    res.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    logger.error('Error updating rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rule',
    });
  }
};

/**
 * Toggle rule active status
 * PATCH /api/rules/:id/toggle
 */
const toggleRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const rule = await Rule.findById(id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }
    
    // Check ownership
    if (rule.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    const updatedRule = await Rule.toggleActive(id);
    
    logger.info(`Rule toggled: ${id} -> ${updatedRule.isActive ? 'active' : 'inactive'}`);
    
    res.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    logger.error('Error toggling rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle rule',
    });
  }
};

/**
 * Delete a rule
 * DELETE /api/rules/:id
 */
const deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const rule = await Rule.findById(id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }
    
    // Check ownership
    if (rule.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    await Rule.delete(id);
    
    logger.info(`Rule deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete rule',
    });
  }
};

module.exports = {
  createRule,
  getRules,
  getRule,
  updateRule,
  toggleRule,
  deleteRule,
};



