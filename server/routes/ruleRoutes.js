/**
 * Rule Routes
 * Handles automation rule management endpoints
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ruleController = require('../controllers/ruleController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Validation middleware
const ruleValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Rule name is required')
    .isLength({ max: 100 })
    .withMessage('Rule name must be less than 100 characters'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array'),
  body('users')
    .optional()
    .isArray()
    .withMessage('Users must be an array'),
  body('engagement')
    .optional()
    .isObject()
    .withMessage('Engagement must be an object'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('limits')
    .optional()
    .isObject()
    .withMessage('Limits must be an object'),
];

const idValidation = [
  param('id')
    .notEmpty()
    .withMessage('Rule ID is required'),
];

// Create a new rule
router.post('/', ruleValidation, ruleController.createRule);

// Get all rules for the authenticated user
router.get('/', ruleController.getRules);

// Get a single rule
router.get('/:id', idValidation, ruleController.getRule);

// Update a rule
router.put('/:id', idValidation, ruleController.updateRule);

// Toggle rule active status
router.patch('/:id/toggle', idValidation, ruleController.toggleRule);

// Delete a rule
router.delete('/:id', idValidation, ruleController.deleteRule);

module.exports = router;






