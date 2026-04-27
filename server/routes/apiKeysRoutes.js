const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getApiKeys, saveApiKeys, deleteApiKey, testTwitterKeys } = require('../controllers/apiKeysController');

router.use(authenticate);

router.get('/', getApiKeys);
router.post('/', saveApiKeys);
router.post('/test-twitter', testTwitterKeys);
router.delete('/:field', deleteApiKey);

module.exports = router;
